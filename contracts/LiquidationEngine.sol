// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

interface ILendingAndBorrowing {
    function getUserCollateralValue(address user) external view returns (uint256);
    function getUserBorrowValue(address user) external view returns (uint256);
    function getUserHealthFactor(address user) external view returns (uint256);
    function liquidateUser(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external;
}

contract LiquidationEngine is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ILendingAndBorrowing public lendingPool;
    mapping(address => address) public tokenToPriceFeed;

    uint256 public constant LIQUIDATION_THRESHOLD = 125e16; // 1.25 health factor threshold
    uint256 public constant LIQUIDATION_BONUS = 5e16; // 5% liquidation bonus
    uint256 public constant MAX_LIQUIDATION_CLOSE_FACTOR = 50e16; // 50% max liquidation

    event LiquidationCall(
        address indexed user,
        address indexed liquidator,
        address indexed collateralAsset,
        address debtAsset,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount,
        bool receivePoolToken
    );

    event LiquidationThresholdUpdated(uint256 newThreshold);

    modifier onlyValidLiquidation(address user) {
        require(
            lendingPool.getUserHealthFactor(user) < LIQUIDATION_THRESHOLD,
            "User position is healthy"
        );
        _;
    }

    constructor(address _lendingPool) {
        lendingPool = ILendingAndBorrowing(_lendingPool);
    }

    function liquidationCall(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover,
        bool receivePoolToken
    ) external nonReentrant onlyValidLiquidation(user) {
        require(debtToCover > 0, "Debt to cover must be > 0");
        require(user != msg.sender, "Cannot liquidate yourself");

        uint256 userDebtBalance = lendingPool.getUserBorrowValue(user);
        uint256 maxDebtToCover = (userDebtBalance * MAX_LIQUIDATION_CLOSE_FACTOR) / 1e18;

        require(debtToCover <= maxDebtToCover, "Liquidation amount exceeds max");

        // Calculate liquidation amount with bonus
        uint256 collateralPrice = getAssetPrice(collateralAsset);
        uint256 debtPrice = getAssetPrice(debtAsset);

        uint256 baseCollateralAmount = (debtToCover * debtPrice) / collateralPrice;
        uint256 bonusCollateralAmount = (baseCollateralAmount * LIQUIDATION_BONUS) / 1e18;
        uint256 liquidatedCollateralAmount = baseCollateralAmount + bonusCollateralAmount;

        // Transfer debt token from liquidator
        IERC20(debtAsset).safeTransferFrom(msg.sender, address(this), debtToCover);

        // Approve and call liquidation on lending pool
        IERC20(debtAsset).safeApprove(address(lendingPool), debtToCover);
        lendingPool.liquidateUser(user, collateralAsset, debtAsset, debtToCover);

        // Transfer liquidated collateral to liquidator
        IERC20(collateralAsset).safeTransfer(msg.sender, liquidatedCollateralAmount);

        emit LiquidationCall(
            user,
            msg.sender,
            collateralAsset,
            debtAsset,
            debtToCover,
            liquidatedCollateralAmount,
            receivePoolToken
        );
    }

    function getAssetPrice(address asset) public view returns (uint256) {
        address priceFeed = tokenToPriceFeed[asset];
        require(priceFeed != address(0), "Price feed not found");

        AggregatorV3Interface aggregator = AggregatorV3Interface(priceFeed);
        (, int256 price, , , ) = aggregator.latestRoundData();

        require(price > 0, "Invalid price");
        return uint256(price);
    }

    function setPriceFeed(address asset, address priceFeed) external onlyOwner {
        tokenToPriceFeed[asset] = priceFeed;
    }

    function updateLiquidationThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 1e18, "Threshold must be > 100%");
        require(newThreshold < 2e18, "Threshold must be < 200%");

        emit LiquidationThresholdUpdated(newThreshold);
    }

    function setLendingPool(address _lendingPool) external onlyOwner {
        lendingPool = ILendingAndBorrowing(_lendingPool);
    }
}