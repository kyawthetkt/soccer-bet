//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SoccerERC20 is ERC20 {

    // uint8 public _decimals = 18;
    uint initialSupply =  2000000 * uint256(10 ** decimals());

    constructor(string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
    {
        // _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount * uint256(10 ** decimals()) );
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}