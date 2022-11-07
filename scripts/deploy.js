const { ethers, upgrades } = require("hardhat");

async function main() {
 
    const gas = await ethers.provider.getGasPrice()
    const SoccerDeployment = await ethers.getContractFactory('Soccer');
    // const ERC20Contract = await ethers.getContractFactory("SoccerERC20");
    // const erc20Contract = await ERC20Contract.deploy("SoccerToken", "Soccer");

    console.log('Deploying Soccer Contract...');
    // console.log('Deploying ERC20...');

    const soccerV = await upgrades.deployProxy(
        SoccerDeployment, 
        [], 
        {  gasPrice: gas, initializer: 'initialize' }
    );

    await soccerV.deployed();
    console.log("Soccer Contract address deployed to:", soccerV.address);
    // console.log("ERC20-DEPLOYED TO: ", erc20Contract.address);

}

main().catch((error) => {
   console.error(error);
   process.exitCode = 1;
 });