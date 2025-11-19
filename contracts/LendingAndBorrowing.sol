// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PoolShareToken.sol";
import "./InterestRateModel.sol";
import "./LiquidationEngine.sol";

contract LendingAndBorrowing is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    struct AssetPool {
        IERC20 asset;
        PoolShareToken poolToken;
        uint256 totalSupplied;
        uint256 totalBorrowed;
        uint256 liquidityIndex;
        uint256 borrowIndex;
        uint256 lastUpdateTimestamp;
        bool isActive;
        uint256 ltv; // Loan-to-value ratio (basis points)
        uint256 liquidationThreshold;
        uint256 reserveFactor;
    }

    struct UserBorrow {
        uint256 principal;
        uint256 borrowIndex;
        uint256 lastUpdateTimestamp;
    }

    mapping(address => AssetPool) public pools;
    mapping(address => mapping(address => UserBorrow)) public userBorrows;
    mapping(address => address) public tokenToPriceFeed;

    InterestRateModel public interestRateModel;
    LiquidationEngine public liquidationEngine;
    address public treasury;

    uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;
    uint256 public constant MAX_STABLE_RATE_BORROW_SIZE_PERCENT = 25;
    uint256 public constant REBALANCE_UP_USAGE_RATIO_THRESHOLD = 95 * 1e25;

    event Supply(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 poolTokensMinted
    );

    event Withdraw(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 poolTokensBurned
    );

    event Borrow(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 borrowRate
    );

    event Repay(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 totalRepaid
    );

    event Liquidation(
        address indexed user,
        address indexed liquidator,
        address indexed collateralAsset,
        address debtAsset,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount
    );

    event AssetPoolCreated(
        address indexed asset,
        address indexed poolToken,
        uint256 ltv,
        uint256 liquidationThreshold
    );

    constructor(
        address _interestRateModel,
        address _treasury
    ) {
        interestRateModel = InterestRateModel(_interestRateModel);
        treasury = _treasury;
    }

    function createAssetPool(
        address asset,
        string memory poolTokenName,
        string memory poolTokenSymbol,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 reserveFactor,
        address priceFeed
    ) external onlyOwner {
        require(address(pools[asset].asset) == address(0), "Pool already exists");
        require(ltv <= liquidationThreshold, "LTV must be <= liquidation threshold");
        require(liquidationThreshold <= 10000, "Invalid liquidation threshold");

        PoolShareToken poolToken = new PoolShareToken(
            poolTokenName,
            poolTokenSymbol,
            asset,
            address(this)
        );

        pools[asset] = AssetPool({
            asset: IERC20(asset),
            poolToken: poolToken,
            totalSupplied: 0,
            totalBorrowed: 0,
            liquidityIndex: 1e27,
            borrowIndex: 1e27,
            lastUpdateTimestamp: block.timestamp,
            isActive: true,
            ltv: ltv,
            liquidationThreshold: liquidationThreshold,
            reserveFactor: reserveFactor
        });

        tokenToPriceFeed[asset] = priceFeed;

        emit AssetPoolCreated(asset, address(poolToken), ltv, liquidationThreshold);
    }

    function updateAssetPriceFeed(address asset, address priceFeed) external onlyOwner {
        require(address(pools[asset].asset) != address(0), "Pool does not exist");
        tokenToPriceFeed[asset] = priceFeed;
    }

    function updateAssetLTV(address asset, uint256 newLTV) external onlyOwner {
        require(address(pools[asset].asset) != address(0), "Pool does not exist");
        require(newLTV <= pools[asset].liquidationThreshold, "LTV must be <= liquidation threshold");
        pools[asset].ltv = newLTV;
    }

    function pausePool(address asset) external onlyOwner {
        require(address(pools[asset].asset) != address(0), "Pool does not exist");
        pools[asset].isActive = false;
    }

    function unpausePool(address asset) external onlyOwner {
        require(address(pools[asset].asset) != address(0), "Pool does not exist");
        pools[asset].isActive = true;
    }

    function getPoolData(address asset) external view returns (
        uint256 totalSupplied,
        uint256 totalBorrowed,
        uint256 utilizationRate,
        uint256 supplyAPY,
        uint256 borrowAPY,
        bool isActive
    ) {
        AssetPool memory pool = pools[asset];
        totalSupplied = pool.totalSupplied;
        totalBorrowed = pool.totalBorrowed;
        utilizationRate = totalSupplied > 0 ? (totalBorrowed * 1e18) / totalSupplied : 0;

        (supplyAPY, borrowAPY) = interestRateModel.calculateInterestRates(totalBorrowed, totalSupplied);
        isActive = pool.isActive;
    }

    function supply(address asset, uint256 amount) external nonReentrant whenNotPaused {
        AssetPool storage pool = pools[asset];
        require(pool.isActive, "Pool not active");
        require(amount > 0, "Amount must be > 0");

        updatePoolIndexes(asset);

        // Transfer tokens from user to pool
        pool.asset.safeTransferFrom(msg.sender, address(this), amount);

        // Calculate pool tokens to mint (1:1 ratio for simplicity)
        uint256 poolTokensToMint = amount;
        pool.poolToken.mint(msg.sender, poolTokensToMint);
        pool.totalSupplied += amount;

        emit Supply(msg.sender, asset, amount, poolTokensToMint);
    }

    function borrow(address asset, uint256 amount) external nonReentrant whenNotPaused {
        AssetPool storage pool = pools[asset];
        require(pool.isActive, "Pool not active");
        require(amount > 0, "Amount must be > 0");
        require(pool.totalSupplied >= pool.totalBorrowed + amount, "Insufficient liquidity");

        updatePoolIndexes(asset);

        // Check if user has sufficient collateral
        require(isValidBorrow(msg.sender, asset, amount), "Insufficient collateral");

        // Get current borrow rate
        (, uint256 borrowRate) = interestRateModel.calculateInterestRates(
            pool.totalBorrowed + amount,
            pool.totalSupplied
        );

        // Update user borrow data
        UserBorrow storage userBorrow = userBorrows[msg.sender][asset];
        if (userBorrow.principal > 0) {
            // Add accrued interest to principal
            uint256 accruedInterest = calculateAccruedInterest(msg.sender, asset);
            userBorrow.principal += accruedInterest;
        }
        userBorrow.principal += amount;
        userBorrow.borrowIndex = pool.borrowIndex;
        userBorrow.lastUpdateTimestamp = block.timestamp;

        pool.totalBorrowed += amount;

        // Transfer tokens to user
        pool.asset.safeTransfer(msg.sender, amount);

        emit Borrow(msg.sender, asset, amount, borrowRate);
    }

    function repay(address asset, uint256 amount) external nonReentrant whenNotPaused {
        AssetPool storage pool = pools[asset];
        require(amount > 0, "Amount must be > 0");

        UserBorrow storage userBorrow = userBorrows[msg.sender][asset];
        require(userBorrow.principal > 0, "No debt to repay");

        updatePoolIndexes(asset);

        // Calculate total debt including accrued interest
        uint256 accruedInterest = calculateAccruedInterest(msg.sender, asset);
        uint256 totalDebt = userBorrow.principal + accruedInterest;
        uint256 repayAmount = amount > totalDebt ? totalDebt : amount;

        // Calculate protocol fee (10% of interest)
        uint256 protocolFee = (accruedInterest * 10) / 100;

        // Transfer repayment from user
        pool.asset.safeTransferFrom(msg.sender, address(this), repayAmount);

        // Send protocol fee to treasury
        if (protocolFee > 0) {
            pool.asset.safeTransfer(treasury, protocolFee);
        }

        // Update user borrow data
        if (repayAmount >= totalDebt) {
            delete userBorrows[msg.sender][asset];
            pool.totalBorrowed -= userBorrow.principal;
        } else {
            userBorrow.principal = totalDebt - repayAmount;
            userBorrow.borrowIndex = pool.borrowIndex;
            userBorrow.lastUpdateTimestamp = block.timestamp;
            pool.totalBorrowed -= (repayAmount > accruedInterest ? repayAmount - accruedInterest : 0);
        }

        emit Repay(msg.sender, asset, repayAmount, totalDebt);
    }

    function withdraw(address asset, uint256 poolTokenAmount) external nonReentrant whenNotPaused {
        AssetPool storage pool = pools[asset];
        require(poolTokenAmount > 0, "Amount must be > 0");
        require(pool.poolToken.balanceOf(msg.sender) >= poolTokenAmount, "Insufficient pool tokens");

        updatePoolIndexes(asset);

        // Calculate asset amount to withdraw (1:1 ratio for simplicity)
        uint256 assetAmount = poolTokenAmount;
        require(pool.totalSupplied >= pool.totalBorrowed + assetAmount, "Insufficient liquidity");

        // Check if withdrawal would breach user's health factor
        require(isValidWithdrawal(msg.sender, asset, assetAmount), "Would breach health factor");

        // Burn pool tokens
        pool.poolToken.burnFrom(msg.sender, poolTokenAmount);
        pool.totalSupplied -= assetAmount;

        // Transfer assets to user
        pool.asset.safeTransfer(msg.sender, assetAmount);

        emit Withdraw(msg.sender, asset, assetAmount, poolTokenAmount);
    }

    function updatePoolIndexes(address asset) internal {
        AssetPool storage pool = pools[asset];
        uint256 timeDelta = block.timestamp - pool.lastUpdateTimestamp;

        if (timeDelta > 0) {
            (, uint256 borrowRate) = interestRateModel.calculateInterestRates(
                pool.totalBorrowed,
                pool.totalSupplied
            );

            // Update borrow index
            uint256 borrowIndexDelta = (pool.borrowIndex * borrowRate * timeDelta) / (365 days * 1e18);
            pool.borrowIndex += borrowIndexDelta;
            pool.lastUpdateTimestamp = block.timestamp;
        }
    }

    function calculateAccruedInterest(address user, address asset) public view returns (uint256) {
        UserBorrow memory userBorrow = userBorrows[user][asset];
        if (userBorrow.principal == 0) return 0;

        AssetPool memory pool = pools[asset];
        uint256 timeDelta = block.timestamp - userBorrow.lastUpdateTimestamp;

        if (timeDelta > 0) {
            (, uint256 borrowRate) = interestRateModel.calculateInterestRates(
                pool.totalBorrowed,
                pool.totalSupplied
            );

            return (userBorrow.principal * borrowRate * timeDelta) / (365 days * 1e18);
        }

        return 0;
    }

    function getUserHealthFactor(address user) public pure returns (uint256) {
        uint256 totalCollateralETH = getUserCollateralValue(user);
        uint256 totalBorrowETH = getUserBorrowValue(user);

        if (totalBorrowETH == 0) {
            return type(uint256).max; // No debt = infinite health factor
        }

        return (totalCollateralETH * 1e18) / totalBorrowETH;
    }

    function getUserCollateralValue(address /* user */) public pure returns (uint256) {
        // This would iterate through all assets to calculate total collateral value
        // Simplified implementation - in production this would be more comprehensive
        return 0;
    }

    function getUserBorrowValue(address /* user */) public pure returns (uint256) {
        // This would iterate through all assets to calculate total borrow value
        // Simplified implementation - in production this would be more comprehensive
        return 0;
    }

    function isValidBorrow(address user, address asset, uint256 amount) internal pure returns (bool) {
        uint256 healthFactorAfter = calculateHealthFactorAfterBorrow(user, asset, amount);
        return healthFactorAfter >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD;
    }

    function isValidWithdrawal(address user, address asset, uint256 amount) internal pure returns (bool) {
        uint256 healthFactorAfter = calculateHealthFactorAfterWithdraw(user, asset, amount);
        return healthFactorAfter >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD;
    }

    function calculateHealthFactorAfterBorrow(
        address user,
        address /* asset */,
        uint256 /* amount */
    ) internal pure returns (uint256) {
        // Simplified calculation - in production this would be more complex
        return getUserHealthFactor(user);
    }

    function calculateHealthFactorAfterWithdraw(
        address user,
        address /* asset */,
        uint256 /* amount */
    ) internal pure returns (uint256) {
        // Simplified calculation - in production this would be more complex
        return getUserHealthFactor(user);
    }

    function getAssetPrice(address asset) public view returns (uint256) {
        address priceFeed = tokenToPriceFeed[asset];
        require(priceFeed != address(0), "Price feed not found");

        AggregatorV3Interface aggregator = AggregatorV3Interface(priceFeed);
        (, int256 price, , , ) = aggregator.latestRoundData();

        require(price > 0, "Invalid price");
        return uint256(price);
    }

    function liquidateUser(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external nonReentrant whenNotPaused {
        require(liquidationEngine != LiquidationEngine(address(0)), "Liquidation engine not set");
        require(msg.sender == address(liquidationEngine), "Only liquidation engine");
        require(getUserHealthFactor(user) < HEALTH_FACTOR_LIQUIDATION_THRESHOLD, "User position is healthy");

        // Liquidation logic would be implemented here
        // This is a simplified version
        emit Liquidation(user, msg.sender, collateralAsset, debtAsset, debtToCover, 0);
    }

    function setLiquidationEngine(address _liquidationEngine) external onlyOwner {
        liquidationEngine = LiquidationEngine(_liquidationEngine);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

}
