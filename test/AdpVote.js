const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers, upgrades } = require('hardhat');
const chai = require('chai');
const BN = require('bn.js');

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN));

const amountInWei = (_amount) => {
  const _val = ethers.utils.parseUnits(_amount, 6);
  return parseInt(_val);
};

const votingFee = amountInWei("1");
const prizePool = amountInWei("100");
const endDate = 2221;
const shareCount = 5;
const toggleVote = true;
const _userTokenBalance = 1000; // for minting, no need to convert to WEI
const _platformPercent = 150; // 1.5%

describe("Soccer Betting", function () {

    let SoccerContract;
    let deployedUser;

    let Erc20Contract;
    let erc20;

    let user1;
    let user2;
    let user3;
    let user4;
    let user5;
    let user6;
    let user7;
    let user8;
    let user9;
    let user10;

    beforeEach(async function () {

        // Contracts are deployed using the first signer/account by default
        [
          deployedUser, 
          user1, user2, user3, user4, user5, 
          user6 ,user7, user8, user9, user10 
        ] = await ethers.getSigners();

        const SoccerDeployment = await ethers.getContractFactory('Soccer');
        const _soccerContract = await upgrades.deployProxy(SoccerDeployment, [], { initializer: 'initialize' });
        await _soccerContract.deployed();
        SoccerContract = _soccerContract;

        // Deploy ERC20 Contract
        Erc20Contract = await ethers.getContractFactory("SoccerERC20");
        erc20 = await Erc20Contract.deploy("Soccer ERC20", "SER"); // Good Sale Token
        await erc20.deployed();
        await erc20.mint(deployedUser.address, _userTokenBalance);
        await erc20.mint(user1.address, _userTokenBalance);
        await erc20.mint(user2.address, _userTokenBalance);
        await erc20.mint(user3.address, _userTokenBalance);
        await erc20.mint(user4.address, _userTokenBalance);
        await erc20.mint(user5.address, _userTokenBalance);
        await erc20.mint(user6.address, _userTokenBalance);
        await erc20.mint(user7.address, _userTokenBalance);
        await erc20.mint(user8.address, _userTokenBalance);
        await erc20.mint(user9.address, _userTokenBalance);
        await erc20.mint(user10.address, _userTokenBalance);
        erc20Address = erc20.address;
    });

    describe("Deployment", function () {

      it("Should accept if name is Soccer Vote", async function () {
        expect(await SoccerContract.name()).to.equal("Soccer Vote");
      });

      it("Should accept if it is deployer", async function () {
        expect(await SoccerContract.owner()).to.equal(deployedUser.address);
      });
  
    });

    describe("Setting ERC20, Platform Percent and Commission Recipient", function () {

      it("Should accept if deployer can call setCommission()", async function () {

          await SoccerContract.connect(deployedUser).setCommission(
            erc20.address, 
            _platformPercent, 
            deployedUser.address
          );         
          const ERC20_CONTRACT_ADDRESS = await SoccerContract.ERC20_CONTRACT_ADDRESS();
          expect(ERC20_CONTRACT_ADDRESS).to.equal(erc20.address);

      });

      it("Should reject if non depolyer cannot call setCommission()", async function () {

        // const _roles = await SoccerContract.connect(deployedUser).getRoles();
        // console.log("_roles: ", _roles);

        await expect(
          SoccerContract.connect(user1).setCommission(
            erc20.address, 
            _platformPercent, 
            deployedUser.address
          )
        ).to.be.revertedWith("Ownable: caller is not the owner");

      });
  
    });
 
});
