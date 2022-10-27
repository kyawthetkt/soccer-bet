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

const amountInWei = (_amount) => parseInt( ethers.utils.parseUnits(_amount, 6) );

const _fee = amountInWei("1");
const _start = 1000;
const _end = 3000;
const _home = "MANU";
const _away = "CHELSEA";
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

    describe("Create Game", function () {

      it("Should reject if a user has no creator permission", async function () {

        await expect(
          SoccerContract.connect(user1).createGame(_home, _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: You have no permission.");

      });

      it("Should reject if a game is alraedy added.", async function () {

        await  SoccerContract.connect(deployedUser).createGame(_home, _away, _fee, _start, _end);

        await expect(
          SoccerContract.connect(deployedUser).createGame(_home, _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: This game has already existed.");

      });

      it("Should accept if game is successfully created.", async function () {        
         await SoccerContract.connect(deployedUser).createGame(_home, _away, _fee, _start, _end);
      });
  
    });

    describe("Edit Game", function () {

      it("Should reject if a user has no editor permission", async function () {

        await expect(
          SoccerContract.connect(user1).editGame(_home, _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: You have no permission.");

      });

      it("Should reject if a game does not exist and has started.", async function () {

        await SoccerContract.connect(deployedUser).createGame(_home, _away, _fee, _start, _end);
        
        await network.provider.send("evm_increaseTime", [_start + 0]);

        await expect(
          SoccerContract.connect(deployedUser).editGame(_home, "NONEXISTED"+ _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: The game has not existed.");

        await expect(
          SoccerContract.connect(deployedUser).editGame(_home, _away, 0, _start, _end)
        ).to.be.revertedWith("ERROR: The game fee must be greater than 0.");

        await expect(
          SoccerContract.connect(deployedUser).editGame(_home, _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: The game has already started.");

      });
    /*
      it("Should reject if a game is alraedy added.", async function () {

        await  SoccerContract.connect(deployedUser).createGame(_home, _away, _fee, _start, _end);

        await expect(
          SoccerContract.connect(deployedUser).createGame(_home, _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: This game has already existed.");

      });

      it("Should accept if game is successfully created.", async function () {        
         await SoccerContract.connect(deployedUser).createGame(_home, _away, _fee, _start, _end);
      });
      */
  
    });
 
});
