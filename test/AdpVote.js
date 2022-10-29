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

const date = new Date();
date.setDate(date.getDate() + 1); 
const _start = date.getTime();

const date2 = new Date();
date2.setDate(date2.getDate() + 2);
const _end = date2.getTime();

const _gameId = 23222;
const _home = "MANU";
const _away = "CHELSEA";
const _userTokenBalance = 1000; // for minting, no need to convert to WEI
const _platformPercent = 200; // 1.5%

describe("Soccer Betting", function () {

    let SoccerContract, deployedUser;
    let Erc20Contract, erc20;
    let user1, user2, user3, user4, user5, user6, user7, user8, user9, user10, user11;

    beforeEach(async function () {

        // Contracts are deployed using the first signer/account by default
        [
          deployedUser, 
          user1, user2, user3, user4, user5, 
          user6 ,user7, user8, user9, user10, user11 
        ] = await ethers.getSigners();

        const SoccerDeployment = await ethers.getContractFactory('Soccer');
        const _soccerContract = await upgrades.deployProxy(SoccerDeployment, [], { initializer: 'initialize' });
        await _soccerContract.deployed();
        SoccerContract = _soccerContract;

        // Deploy ERC20 Contract
        Erc20Contract = await ethers.getContractFactory("SoccerERC20");
        erc20 = await Erc20Contract.deploy("Soccer ERC20", "SER"); // Good Sale Token
        await erc20.deployed();
        // await erc20.mint(deployedUser.address, _userTokenBalance);
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
          SoccerContract.connect(user1).createGame(_gameId, _home, _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: You have no permission.");

      });

      it("Should reject if a game is alraedy added.", async function () {

        await  SoccerContract.connect(deployedUser).createGame(_gameId, _home, _away, _fee, _start, _end);

        await expect(
          SoccerContract.connect(deployedUser).createGame(_gameId, _home, _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: This game has already existed.");

      });

      it("Should accept if game is successfully created.", async function () {        
         await SoccerContract.connect(deployedUser).createGame(_gameId, _home, _away, _fee, _start, _end);
      });
  
    });
  
    describe("Edit Game", function () {

      it("Should reject if a user has no editor permission", async function () {

        await expect(
          SoccerContract.connect(user1).editGame(_gameId, _home, _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: You have no permission.");

      });

      it("Should reject if a game does not exist and has started.", async function () {

        await SoccerContract.connect(deployedUser).createGame(_gameId, _home, _away, _fee, _start, _end);
        const _fakeStart = _start + 0;
        await network.provider.send("evm_increaseTime", [_fakeStart]);

        await expect(
          SoccerContract.connect(deployedUser).editGame(35432523532, _home, _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: The game has not existed.");

        await expect(
          SoccerContract.connect(deployedUser).editGame(_gameId, _home, _away, 0, _start, _end)
        ).to.be.revertedWith("ERROR: The game fee must be greater than 0.");

        await expect(
          SoccerContract.connect(deployedUser).editGame(_gameId, _home, _away, _fee, _start, _end)
        ).to.be.revertedWith("ERROR: The game has already started.");

      });
     
      it("Should accept if game is successfully updated.", async function () {
        
        await SoccerContract.connect(deployedUser).createGame(_gameId, _home, _away, _fee, _start, _end);
        
        await network.provider.send("evm_increaseTime", [ - _start ]);

        await SoccerContract.connect(deployedUser).editGame(_gameId, _home, "LIVERPOOL", _fee, _start, _end);
        
        const newGame = await SoccerContract.connect(deployedUser).games(_gameId);
        
        expect(newGame.awayTeam).to.equal("LIVERPOOL");

      });

    });

    describe("Cancel Game", function () {

      beforeEach(async function () {
        await SoccerContract.connect(deployedUser).createGame(_gameId, _home, _away, _fee, _start, _end);
      });
      

      it("Should accept if a user successfully cancel the game", async function () {

        await SoccerContract.connect(deployedUser).cancelGame(_gameId);     
        const cancelledGame = await SoccerContract.connect(deployedUser).games(_gameId);
        expect(cancelledGame.isEnded).to.be.true;

      });

      it("Should reject if a user has no cancellation permission", async function () {

        await expect(
          SoccerContract.connect(user1).cancelGame(_gameId)
        ).to.be.revertedWith("ERROR: You have no permission.");

      });

      it("Should reject if a game does not exist.", async function () {
        
        await expect(
          SoccerContract.connect(deployedUser).cancelGame(35432523532)
        ).to.be.revertedWith("ERROR: The game has not existed.");

      });

      it("Should reject if a game has already started.", async function () {
        
        await network.provider.send("evm_increaseTime", [_start]);        
        await expect(
          SoccerContract.connect(deployedUser).cancelGame(_gameId)
        ).to.be.revertedWith("ERROR: The game has already started.");

      });

    });

    describe("Play Game", function () {

      beforeEach(async function () {
        await SoccerContract.connect(deployedUser).createGame(_gameId, _home, _away, _fee, _start, _end);

        await SoccerContract.connect(deployedUser).setCommission(
          erc20.address, _platformPercent, deployedUser.address
        );

        await erc20.connect(user1).approve(SoccerContract.address, _fee);

      });

      it("Should reject if user11 has insufficient balance.", async function () {
        
        await expect(
          SoccerContract.connect(user11).play(_gameId, _home)
        ).to.be.revertedWith("ERROR: Insufficient balance.");

      });

      it("Should reject if the game has not started yet.", async function () {

        await expect(
          SoccerContract.connect(user1).play(_gameId, _home)
        ).to.be.revertedWith("ERROR: The game has not started yet.");

      });

      it("Should reject if the game end time is over.", async function () {

        await network.provider.send("evm_increaseTime", [_end + 1]);
        await expect(
          SoccerContract.connect(user1).play(_gameId, _home)
        ).to.be.revertedWith("ERROR: The game has been ended.");

      });

      it("Should reject if the user plays more than one time.", async function () {

        await network.provider.send("evm_increaseTime", [_start]);
        await SoccerContract.connect(user1).play(_gameId, _home);
        await expect(
          SoccerContract.connect(user1).play(_gameId, _home)
        ).to.be.revertedWith("ERROR: You have already played.");

      });

      it("Should accept if the user plays successfully.", async function () {

        await network.provider.send("evm_increaseTime", [_start]);
        await SoccerContract.connect(user1).play(_gameId, _home);

        const isUserPlayed = await SoccerContract.connect(user1).isPlayed(_gameId, user1.address);
        const gameBalance = await SoccerContract.connect(user1).balances(_gameId);
        const remainingUser1Balance = parseInt( await erc20.connect(user1).balanceOf(user1.address));

        expect(isUserPlayed).to.be.true;
        expect(parseInt(gameBalance)).to.be.equal(_fee);
        expect(parseInt(remainingUser1Balance)).to.be.equal(amountInWei(_userTokenBalance.toString()) - _fee);

      });

    });

    describe("Game Played by Mutli Users", function () {

      beforeEach(async function () {

        await SoccerContract.connect(deployedUser).createGame(_gameId, _home, _away, _fee, _start, _end);

        await SoccerContract.connect(deployedUser).setCommission(
          erc20.address, _platformPercent, deployedUser.address
        );
        
        // user1, user2, user3, user4, user5, user6, user7 stand on MANU's side
        await erc20.connect(user1).approve(SoccerContract.address, _fee);        
        await erc20.connect(user2).approve(SoccerContract.address, _fee);        
        await erc20.connect(user3).approve(SoccerContract.address, _fee);        
        await erc20.connect(user4).approve(SoccerContract.address, _fee);      
        await erc20.connect(user5).approve(SoccerContract.address, _fee);      
        await erc20.connect(user6).approve(SoccerContract.address, _fee);
        await erc20.connect(user7).approve(SoccerContract.address, _fee);
        // user8, user9, user10 stand on CHELSEA's side
        await erc20.connect(user8).approve(SoccerContract.address, _fee);
        await erc20.connect(user9).approve(SoccerContract.address, _fee);
        await erc20.connect(user10).approve(SoccerContract.address, _fee);
        
        // start the game
        await network.provider.send("evm_increaseTime", [_start]);

        await SoccerContract.connect(user1).play(_gameId, _home);
        await SoccerContract.connect(user2).play(_gameId, _home);
        await SoccerContract.connect(user3).play(_gameId, _home);
        await SoccerContract.connect(user4).play(_gameId, _home);
        await SoccerContract.connect(user5).play(_gameId, _home);
        await SoccerContract.connect(user6).play(_gameId, _home);
        await SoccerContract.connect(user7).play(_gameId, _home);
        await SoccerContract.connect(user8).play(_gameId, _away);
        await SoccerContract.connect(user9).play(_gameId, _away);
        await SoccerContract.connect(user10).play(_gameId, _away);

      });

      it("Should accept if multi users played properly.", async function () {

        const _gameTotalBalance = await SoccerContract.connect(deployedUser).balances(_gameId);
        const _gamePlayers = await SoccerContract.connect(deployedUser).getPlayers(_gameId);

        const _totalPlayer = _gamePlayers[0].length + _gamePlayers[1].length; 
        expect(_gameTotalBalance).to.be.equal(_totalPlayer * _fee);
        expect(_gamePlayers[0].length).to.be.equal(7); // home team sider
        expect(_gamePlayers[1].length).to.be.equal(3); // away team sider
      
      });

    });

    describe("Payout Users", function () {

      beforeEach(async function () {

        await SoccerContract.connect(deployedUser).createGame(_gameId, _home, _away, _fee, _start, _end);

        await SoccerContract.connect(deployedUser).setCommission(
          erc20.address, _platformPercent, deployedUser.address
        );
        
        // user1, user2, user3, user4, user5, user6, user7 stand on MANU's side
        await erc20.connect(user1).approve(SoccerContract.address, _fee);        
        await erc20.connect(user2).approve(SoccerContract.address, _fee);        
        await erc20.connect(user3).approve(SoccerContract.address, _fee);        
        await erc20.connect(user4).approve(SoccerContract.address, _fee);      
        await erc20.connect(user5).approve(SoccerContract.address, _fee);      
        await erc20.connect(user6).approve(SoccerContract.address, _fee);
        await erc20.connect(user7).approve(SoccerContract.address, _fee);
        // user8, user9, user10 stand on CHELSEA's side
        await erc20.connect(user8).approve(SoccerContract.address, _fee);
        await erc20.connect(user9).approve(SoccerContract.address, _fee);
        await erc20.connect(user10).approve(SoccerContract.address, _fee);
        
        // start the game
        await network.provider.send("evm_increaseTime", [_start]);

        await SoccerContract.connect(user1).play(_gameId, _home);
        await SoccerContract.connect(user2).play(_gameId, _home);
        await SoccerContract.connect(user3).play(_gameId, _home);
        await SoccerContract.connect(user4).play(_gameId, _home);
        await SoccerContract.connect(user5).play(_gameId, _home);
        await SoccerContract.connect(user6).play(_gameId, _home);
        await SoccerContract.connect(user7).play(_gameId, _home);
        await SoccerContract.connect(user8).play(_gameId, _away);
        await SoccerContract.connect(user9).play(_gameId, _away);
        await SoccerContract.connect(user10).play(_gameId, _away);

      });

      it("Should reject if the caller has no permission.", async function () {
       
        await expect(
            SoccerContract.connect(user1).payout(_gameId, "MANU")
        ).to.be.revertedWith("ERROR: You have no permission.");

      });

      it("Should reject if the game is not existed.", async function () {
       
        await expect(
            SoccerContract.connect(deployedUser).payout(1111, "MANU")
        ).to.be.revertedWith("ERROR: This game has not existed.");

      });

      it("Should accept if the game balance is ZERO on draw.", async function () {
        
        await SoccerContract.connect(deployedUser).payout(_gameId, "DRAW");
        const _gameTotalBalanceAfter = await SoccerContract.connect(deployedUser).balances(_gameId);
        expect(parseInt(_gameTotalBalanceAfter)).to.be.equal(0);

      });

      it("Should accept if the users have primary balance on draw.", async function () {
        
        await SoccerContract.connect(deployedUser).payout(_gameId, "DRAW");

        const _user1Balance = parseInt(await erc20.connect(user1).balanceOf(user1.address));
        const _user2Balance = parseInt(await erc20.connect(user1).balanceOf(user2.address));
        const _user3Balance = parseInt(await erc20.connect(user1).balanceOf(user3.address));
        const _user4Balance = parseInt(await erc20.connect(user1).balanceOf(user4.address));
        const _user5Balance = parseInt(await erc20.connect(user1).balanceOf(user5.address));
        const _user6Balance = parseInt(await erc20.connect(user1).balanceOf(user6.address));
        const _user7Balance = parseInt(await erc20.connect(user1).balanceOf(user7.address));        
        const _user8Balance = parseInt(await erc20.connect(user1).balanceOf(user8.address));
        const _user9Balance = parseInt(await erc20.connect(user1).balanceOf(user9.address));
        const _user10Balance = parseInt(await erc20.connect(user1).balanceOf(user10.address));
        
        expect(parseInt(_user1Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user2Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user3Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user4Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user5Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user6Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user7Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user8Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user9Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user10Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );


      });

      it("Should accept if home team' siders won.", async function () {
        const sss = parseInt(await erc20.connect(deployedUser).balanceOf(deployedUser.address));
        console.log("sss:", sss);
        
        await SoccerContract.connect(deployedUser).payout(_gameId, "MANU");

        // check platform percentage
        const _percentageReceiver = parseInt(await erc20.connect(deployedUser).balanceOf(deployedUser.address));
        console.log("ttt:", _percentageReceiver);
        // winner's balance

        /*
        const _user1Balance = parseInt(await erc20.connect(user1).balanceOf(user1.address));
        const _user2Balance = parseInt(await erc20.connect(user1).balanceOf(user2.address));
        const _user3Balance = parseInt(await erc20.connect(user1).balanceOf(user3.address));
        const _user4Balance = parseInt(await erc20.connect(user1).balanceOf(user4.address));
        const _user5Balance = parseInt(await erc20.connect(user1).balanceOf(user5.address));
        const _user6Balance = parseInt(await erc20.connect(user1).balanceOf(user6.address));
        const _user7Balance = parseInt(await erc20.connect(user1).balanceOf(user7.address));
        
        expect(parseInt(_user1Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user2Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user3Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user4Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user5Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user6Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        expect(parseInt(_user7Balance) ).to.be.equal( amountInWei(_userTokenBalance.toString()) );
        */


      });

    });
    
 
});
