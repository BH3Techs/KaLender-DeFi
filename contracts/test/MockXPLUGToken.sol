// SPDX-License-Identifier: MIT

pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockXPLUGToken is ERC20 {
    constructor() ERC20("XPLUG Token", "XPLUG") {
        // Mint initial supply to deployer (1 million tokens)
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    // Allow anyone to mint tokens for testing purposes
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    // Faucet function - gives 1000 XPLUG to anyone who calls it
    function faucet() public {
        _mint(msg.sender, 1000 * 10**decimals());
    }
}