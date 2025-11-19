// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PoolShareToken is ERC20, Ownable {
    address public underlyingAsset;
    address public lendingPool;

    modifier onlyLendingPool() {
        require(msg.sender == lendingPool, "Only lending pool can call");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address _underlyingAsset,
        address _lendingPool
    ) ERC20(name, symbol) {
        underlyingAsset = _underlyingAsset;
        lendingPool = _lendingPool;
    }

    function mint(address user, uint256 amount) external onlyLendingPool {
        _mint(user, amount);
    }

    function burnFrom(address user, uint256 amount) external onlyLendingPool {
        _burn(user, amount);
    }

    function setLendingPool(address _lendingPool) external onlyOwner {
        lendingPool = _lendingPool;
    }
}