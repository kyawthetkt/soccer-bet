const { ethers, upgrades } = require("hardhat");

async function main() {
 
    const gas = await ethers.provider.getGasPrice()
    const AdpVoteDeployment = await ethers.getContractFactory('AdpVote');
    // const ERC20Contract = await ethers.getContractFactory("AdpERC20Contract");
    // const erc20Contract = await ERC20Contract.deploy("VToken", "VToken");

    console.log('Deploying AdpVote...');
    // console.log('Deploying ERC20...');

    const adpVote = await upgrades.deployProxy(
        AdpVoteDeployment, 
        ["ADPVoting" ], 
        {  gasPrice: gas, initializer: 'initialize' }
    );

    await adpVote.deployed();
    console.log("Adpost Voting Contract deployed to:", adpVote.address);
    // console.log("ERC20-DEPLOYED TO: ", erc20Contract.address);

}

main().catch((error) => {
   console.error(error);
   process.exitCode = 1;
 });