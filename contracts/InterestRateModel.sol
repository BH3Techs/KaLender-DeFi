// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract InterestRateModel is Ownable {
    uint256 public constant OPTIMAL_UTILIZATION_RATE = 80e16; // 80%
    uint256 public constant MAX_UTILIZATION_RATE = 100e16; // 100%

    uint256 public baseVariableBorrowRate = 2e16; // 2%
    uint256 public variableRateSlope1 = 4e16; // 4%
    uint256 public variableRateSlope2 = 60e16; // 60%
    uint256 public stableRateSlope1 = 5e17; // 0.5%
    uint256 public stableRateSlope2 = 60e16; // 60%

    event RatesUpdated(
        uint256 baseVariableBorrowRate,
        uint256 variableRateSlope1,
        uint256 variableRateSlope2
    );

    function calculateInterestRates(
        uint256 totalBorrows,
        uint256 totalLiquidity
    ) external view returns (uint256 liquidityRate, uint256 variableBorrowRate) {
        uint256 utilizationRate = totalLiquidity == 0 ? 0 : (totalBorrows * 1e18) / totalLiquidity;

        variableBorrowRate = _calculateBorrowRate(utilizationRate);
        liquidityRate = _calculateSupplyRate(variableBorrowRate, utilizationRate);
    }

    function _calculateBorrowRate(uint256 utilizationRate) internal view returns (uint256) {
        if (utilizationRate <= OPTIMAL_UTILIZATION_RATE) {
            return baseVariableBorrowRate +
                   (utilizationRate * variableRateSlope1) / OPTIMAL_UTILIZATION_RATE;
        } else {
            uint256 excessUtilizationRate = utilizationRate - OPTIMAL_UTILIZATION_RATE;
            return baseVariableBorrowRate +
                   variableRateSlope1 +
                   (excessUtilizationRate * variableRateSlope2) /
                   (MAX_UTILIZATION_RATE - OPTIMAL_UTILIZATION_RATE);
        }
    }

    function _calculateSupplyRate(
        uint256 borrowRate,
        uint256 utilizationRate
    ) internal pure returns (uint256) {
        uint256 reserveFactor = 10e16; // 10% reserve factor
        return (borrowRate * utilizationRate * (1e18 - reserveFactor)) / 1e36;
    }

    function updateRates(
        uint256 _baseVariableBorrowRate,
        uint256 _variableRateSlope1,
        uint256 _variableRateSlope2
    ) external onlyOwner {
        baseVariableBorrowRate = _baseVariableBorrowRate;
        variableRateSlope1 = _variableRateSlope1;
        variableRateSlope2 = _variableRateSlope2;

        emit RatesUpdated(_baseVariableBorrowRate, _variableRateSlope1, _variableRateSlope2);
    }
}