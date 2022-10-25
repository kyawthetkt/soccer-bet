const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers, upgrades } = require('hardhat');
const { BigNumber } = require("ethers");
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
const UserTokenBalance = 1000; // for minting, no need to convert to WEI
const percentage = 0; // 1.5%
const dispensable = false;

describe("AdpVote", function () {

    let nftAddress;
    let runningCampaign;
    let nftVote;

    let adpVoteContract;
    let deployedUser;

    let ERC20Contract;
    let erc20;

    let NftContract;
    let nft;

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

    let _tokenIds;
    let _addresses;

    beforeEach(async function () {

        // Contracts are deployed using the first signer/account by default
        [deployedUser, user1, user2, user3, user4, user5, user6 ,user7, user8, user9, user10 ] = await ethers.getSigners();

        const AdpVoteDeployment = await ethers.getContractFactory('AdpVote');
        // console.log('Deploying AdpVote...');
        const adpVote = await upgrades.deployProxy(AdpVoteDeployment, ["Adpost Voting" ], { initializer: 'initialize' });
        await adpVote.deployed();
        adpVoteContract = adpVote;

        // Deploy ERC20 Contract
        ERC20Contract = await ethers.getContractFactory("AdpERC20Contract");
        erc20 = await ERC20Contract.deploy("GS Token", "GSTKN"); // Good Sale Token
        await erc20.deployed();
        await erc20.mint(deployedUser.address, UserTokenBalance);
        await erc20.mint(user1.address, UserTokenBalance);
        await erc20.mint(user2.address, UserTokenBalance);
        await erc20.mint(user3.address, UserTokenBalance);
        await erc20.mint(user4.address, UserTokenBalance);
        await erc20.mint(user5.address, UserTokenBalance);
        await erc20.mint(user6.address, UserTokenBalance);
        await erc20.mint(user7.address, UserTokenBalance);
        await erc20.mint(user8.address, UserTokenBalance);
        await erc20.mint(user9.address, UserTokenBalance);
        await erc20.mint(user10.address, UserTokenBalance);
        erc20Address = erc20.address;

        await adpVote.connect(deployedUser).setERC20Address(erc20.address);

        // Deploy ERC-721
        NftContract = await ethers.getContractFactory("AdpERC721Contract");
        nft = await NftContract.deploy("TEST", "TST");
        await nft.deployed();

        await nft.mintNft(deployedUser.address, "test.nft.uri"); // token id 1
        await nft.mintNft(deployedUser.address, "test.nft.uri"); // token id 2    
        await nft.mintNft(deployedUser.address, "test.nft.uri"); // token id 3

        await nft.mintNft(deployedUser.address, "test.nft.uri"); // token id 4
        await nft.mintNft(deployedUser.address, "test.nft.uri"); // token id 5
        await nft.mintNft(deployedUser.address, "test.nft.uri"); // token id 6

        await nft.mintNft(deployedUser.address, "test.nft.uri"); // token id 7
        
        _tokenIds = [1, 2, 3, 4, 5, 6, 7];
        _addresses = [ 
              user1.address, user1.address, user1.address, 
              user2.address, user2.address, user2.address,
              user8.address
        ];

        nftOwnerAddress = user1.address;
        nftAddress = nft.address;

    });

    describe("Deployment", function () {

      it("Should have contract address", async function () {
        expect(adpVoteContract.address).to.not.be.null;
      }); 

      it("Should have right contract name", async function () {
        expect(await adpVoteContract.name()).to.equal("Adpost Voting");
      });

      it("Should have right owner", async function () {
        expect(await adpVoteContract.owner()).to.equal(deployedUser.address);
      });
  
    });

    describe("Setting ERC20 Address", function () {

      it("Should accept if contract deployer can call setERC20Address()", async function () {
         await adpVoteContract.connect(deployedUser).setERC20Address(erc20.address);         
         const ERC20_TOKEN_ADDRESS = await adpVoteContract.ERC20_TOKEN_ADDRESS();
         expect(ERC20_TOKEN_ADDRESS).to.equal(erc20.address);       
      });

      it("Should reject if non-callable person call setERC20Address()", async function () {
        await expect( 
          adpVoteContract.connect(user1).setERC20Address(erc20.address) 
        ).to.be.revertedWith("Caller is not allowed to set ERC20 contract.");
      });

      it("Should accept if user2 having permission call setERC20Address()", async function () {
        
        await adpVoteContract.connect(deployedUser).grantUserRole(5, user2.address); // grant permissions
        await adpVoteContract.connect(user2).setERC20Address(erc20.address);
        const ERC20_TOKEN_ADDRESS = await adpVoteContract.ERC20_TOKEN_ADDRESS();
        expect(ERC20_TOKEN_ADDRESS).to.equal(erc20.address);

      });
  
    });

    describe("Granting and Revoking User Role", function () {

      it("Should accept if contract deployer can call grantUserRole()", async function () {
         await adpVoteContract.connect(deployedUser).grantUserRole(5, user1.address);
      });

      it("Should accept if contract deployer can call revokeUserRole()", async function () {
        await adpVoteContract.connect(deployedUser).revokeUserRole(5, user1.address);
      });

      it("Should reject if non-deployer person call grantUserRole()", async function () {
        await expect( 
          adpVoteContract.connect(user1).grantUserRole(5, user2.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Should reject if non-deployer person call revokeUserRole()", async function () {
        await expect( 
          adpVoteContract.connect(user1).revokeUserRole(5, user2.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
  
    });

    describe("Successful Voting Campaign Creation", function () {
        beforeEach(async function () {
            await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
            await adpVoteContract.connect(deployedUser).startVotingCampaign(
              nftAddress,
              votingFee,
              toggleVote, // toggleVote
              prizePool, 
              shareCount, // topWinner No
              endDate,
              [1, 2, 3], // tokenIds,
              percentage, dispensable
            );
            runningCampaign = await adpVoteContract.campaigns(nftAddress);
        });

        it("Should accept if campaign has the correct properties", async function () {

          const _votingFee = await runningCampaign.votingFee;
          const _toggleVote = await runningCampaign.toggleVote;
          const _prizePool = await runningCampaign.prizeAmount;
          const _shareCount = await runningCampaign.shareCount;
          
          expect(parseInt(_votingFee)).to.equal(votingFee);   
          expect(_toggleVote).to.equal(toggleVote);       
          expect(parseInt(_prizePool)).to.equal(prizePool);
          expect(parseInt(_shareCount)).to.equal(shareCount);
        });
  
    });

    describe("Failed Voting Campaign Creation", function () {
    
      it("Should reject if tried to create voting when already running", async function () {
        await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
        await adpVoteContract.connect(deployedUser).startVotingCampaign(
          nftAddress,
          votingFee,
          toggleVote, // toggleVote
          prizePool, 
          shareCount, // topWinner No
          endDate,
          [1, 2, 3], // tokenIds
          percentage, dispensable
        );
        
        await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
        await expect(adpVoteContract.connect(deployedUser).startVotingCampaign(
            nftAddress,
            votingFee,
            toggleVote, // toggleVote
            prizePool, 
            shareCount, // topWinner No
            endDate,
            [1, 2, 3], // tokenIds,
            percentage, dispensable
          )).to.be.revertedWith("Campaign is still running.");

      });
    });

    describe("Successful Voting Campaign Edition", function () {

      const _editPrizeAmount = 300;
      const _shareCount = 2;
      const _endedDate = 2221;
      const _isActive = false;
      let editedCollectionVote;

      beforeEach(async function () {            
          await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
          await adpVoteContract.connect(deployedUser).startVotingCampaign(
            nftAddress,
            votingFee,
            toggleVote, // toggleVote
            prizePool, 
            shareCount, // topWinner No
            endDate,
            [1, 2, 3], // tokenIds,
            percentage, dispensable
          );
  
          await erc20.connect(deployedUser).approve(adpVoteContract.address, _editPrizeAmount);
          await adpVoteContract.connect(deployedUser).editVotingCampaign(
            nftAddress,
            _editPrizeAmount, 
            _shareCount, 
            _endedDate,
            _isActive
          );
          editedCollectionVote = await adpVoteContract.campaigns(nftAddress);

      });

      it("should have the updated campaign properties.", async function () {
         expect( parseInt(editedCollectionVote.prizeAmount) ).to.equal(_editPrizeAmount);
         expect( parseInt(editedCollectionVote.shareCount) ).to.equal(_shareCount);
         expect(editedCollectionVote.isActive).to.be.false;
      });

    });

    describe("Failed Voting Campaign Edition", function () {

      beforeEach(async function () {            
        await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
        await adpVoteContract.connect(deployedUser).startVotingCampaign(
          nftAddress,
          votingFee,
          toggleVote, // toggleVote
          prizePool, 
          shareCount, // topWinner No
          endDate,
          [1, 2, 3], // tokenIds
          percentage, dispensable
        );
      });

      it("Should reject if caller has no permmission.", async function () {        

        _editPrizeAmount = 300;
        _shareCount = 2;
        _endedDate = 2221;
        _isActive = false;
        
        await erc20.connect(user8).approve(adpVoteContract.address, _editPrizeAmount);
        await expect(
          adpVoteContract.connect(user8).editVotingCampaign(
            nftAddress,
            _editPrizeAmount, 
            _shareCount, 
            _endedDate,
            _isActive
          )
        ).to.be.revertedWith("Caller is not allowed to edit campaign."); 

      });

      it("Should reject if voting is not active", async function () {  

        const _editPrizeAmount = 300;
        const _shareCount = 2;
        const _endedDate = 2221;
        const _isActive = false;

        await erc20.connect(deployedUser).approve(adpVoteContract.address, _editPrizeAmount);
        await adpVoteContract.connect(deployedUser).editVotingCampaign(
          nftAddress,
          _editPrizeAmount, 
          _shareCount, 
          _endedDate,
          false
        );        
        await erc20.connect(deployedUser).approve(adpVoteContract.address, _editPrizeAmount);
        await expect(
          adpVoteContract.connect(deployedUser).editVotingCampaign(
            nftAddress,
            _editPrizeAmount, 
            _shareCount, 
            _endedDate,
            _isActive
          )
        ).to.be.revertedWith("Cannot edit as campaign is not running.");
      });

    });

    describe("Adding multiple items and single item", function () {

      beforeEach(async function () {            
          await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
          await adpVoteContract.connect(deployedUser).startVotingCampaign(
            nftAddress,
            votingFee,
            toggleVote, // toggleVote
            prizePool, 
            shareCount, // topWinner No
            endDate,
            [1, 2, 3], // tokenIds
            percentage, dispensable
          ); 
      });

      it("Should reject if caller is not contract owner.", async function () {

        await expect( adpVoteContract.connect(user2).addItems(nftAddress, [4, 5, 6]) ).to.be.revertedWith(
          "Caller is not allowed to create or cancel campaign."
        );

     });

      it("Should accept if primary item count is 3", async function () {
        const tokenPairs = await adpVoteContract.getTokenIds(nftAddress);
        expect(tokenPairs.length).to.equal(3);
      });
    
      it("Should accept if added items count is 3", async function () {
         await adpVoteContract.connect(deployedUser).addItems(nftAddress, [4, 5, 6]);
         const _newTokenPairs = await adpVoteContract.getTokenIds(nftAddress);
         expect(_newTokenPairs.length).to.equal(6);
      });

      it("Should accept if added item count is 4", async function () {
        await adpVoteContract.connect(deployedUser).addItems(nftAddress, [6]);
        const _newTokenPairs = await adpVoteContract.getTokenIds(nftAddress);
        expect(_newTokenPairs.length).to.equal(4);
     });

    });

    describe("Failed Users Vote", function () {

      it("Should reject if NFT Collection Voting ended date has gone.", async function () {

        await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
        await adpVoteContract.connect(deployedUser).startVotingCampaign(
            nftAddress,
            votingFee,
            toggleVote, // toggleVote
            prizePool, 
            shareCount, // topWinner No
            endDate,
            [1, 2, 3], // tokenIds,
            percentage, dispensable
        );

        await erc20.connect(user2).approve(adpVoteContract.address, 1);
        await network.provider.send("evm_increaseTime", [endDate + 1]);
        await expect(adpVoteContract.connect(user2).vote(nft.address, 1)).to.be.revertedWith(
          "Campaign is over."
        );
               
      });

      it("Should reject if there is no campaign in the list.", async function () {
        
        await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
        await adpVoteContract.connect(deployedUser).startVotingCampaign(
            nftAddress,
            votingFee,
            toggleVote, // toggleVote
            prizePool, 
            shareCount, // topWinner No
            endDate,
            [1, 2, 3], // tokenIds,
            percentage, dispensable
        );

        const nonExistingNft = 0;
        await expect(adpVoteContract.connect(user1).vote(nft.address, nonExistingNft)).to.be.revertedWith(
          "Cannot find NFT in this voting."
        );
      });

      it("Should reject if user votes his own.", async function () {
        
        await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
        await adpVoteContract.connect(deployedUser).startVotingCampaign(
            nftAddress,
            votingFee,
            toggleVote, // toggleVote
            prizePool, 
            shareCount, // topWinner No
            endDate,
            [1, 2, 3], // tokenIds,
            percentage, dispensable
        );
          // user1
        await expect(adpVoteContract.connect(deployedUser).vote(nft.address, 1)).to.be.revertedWith(
          "You cannot vote your own."
        );
      });

      it("Should reject if voter has insufficient balance for voting fee.", async function () {
        
        await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
        await adpVoteContract.connect(deployedUser).startVotingCampaign(
            nftAddress,
            amountInWei("1001"), // Flase voting fee
            toggleVote, // toggleVote
            prizePool, 
            shareCount, // topWinner No
            endDate,
            [1, 2, 3], // tokenIds,
            percentage, dispensable
        );

        await erc20.connect(user2).approve(adpVoteContract.address, amountInWei("1001"));
        await expect(adpVoteContract.connect(user2).vote(nft.address, 1)).to.be.revertedWith(
          "Insufficient Balance."
        );

      });

    });

    describe("Successful Users Vote", function () { 
        
        beforeEach(async function () {
          await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
          await adpVoteContract.connect(deployedUser).startVotingCampaign(
            nftAddress,
            votingFee,
            toggleVote, // toggleVote
            prizePool, 
            shareCount, // topWinner No
            endDate,
            [1, 2, 3], // tokenIds,
            percentage, dispensable
          );
        });

          it("Should accept if vote count is 1 as on user2 votes.", async function () {
              await erc20.connect(user2).approve(adpVoteContract.address, votingFee);
              await adpVoteContract.connect(user2).vote(nft.address, 1);
              nftVote = await adpVoteContract.counters(nftAddress, 1);
              expect(parseInt(nftVote)).to.equal(1);
          });

          it("Should accept if vote count is 0 as on user2 votes up and down.", async function () {
              await erc20.connect(user2).approve(adpVoteContract.address, amountInWei("2"));
              await adpVoteContract.connect(user2).vote(nft.address, 1);
              await adpVoteContract.connect(user2).vote(nft.address, 1);

              nftVote = await adpVoteContract.counters(nftAddress, 1);
              expect(parseInt(nftVote)).to.equal(0);
          });

          it("Should accept if vote count is 3 as on user2, user3 and user4 vote.", async function () {

              await erc20.connect(user2).approve(adpVoteContract.address, votingFee);
              await adpVoteContract.connect(user2).vote(nft.address, 1);

              await erc20.connect(user3).approve(adpVoteContract.address, votingFee);
              await adpVoteContract.connect(user3).vote(nft.address, 1);

              await erc20.connect(user4).approve(adpVoteContract.address, votingFee);
              await adpVoteContract.connect(user4).vote(nft.address, 1);

              nftVote = await adpVoteContract.counters(nftAddress, 1);
              expect(parseInt(nftVote)).to.equal(3);
        });

        it("Should accept if vote count is 2 as on user2, user3 and user4 vote.Finally user4 votes again(votes down).", async function () {

            await erc20.connect(user2).approve(adpVoteContract.address, votingFee);
            await adpVoteContract.connect(user2).vote(nft.address, 1);

            await erc20.connect(user3).approve(adpVoteContract.address, votingFee);
            await adpVoteContract.connect(user3).vote(nft.address, 1);

            await erc20.connect(user4).approve(adpVoteContract.address, amountInWei("2"));
            await adpVoteContract.connect(user4).vote(nft.address, 1); // vote up
            await adpVoteContract.connect(user4).vote(nft.address, 1); // vote down

            nftVote = await adpVoteContract.counters(nftAddress, 1);
            expect(parseInt(nftVote)).to.equal(2);
      });

      it("Should accept if voting has correct voters list when user2 votes up and down and up and finally down.", async function () {

          await erc20.connect(user2).approve(adpVoteContract.address, amountInWei("4"));
          await adpVoteContract.connect(user2).vote(nft.address, 1);
          await adpVoteContract.connect(user2).vote(nft.address, 1);
          await adpVoteContract.connect(user2).vote(nft.address, 1);
          await adpVoteContract.connect(user2).vote(nft.address, 1);

          await erc20.connect(user3).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user3).vote(nft.address, 1);

          await erc20.connect(user4).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user4).vote(nft.address, 1);

          const voters = await adpVoteContract.connect(user1).getVoters(nft.address, 1);

          expect(voters.length).to.equal(2);
      });

      it("Should accept if total voting fee in 6000000.", async function () {

        await erc20.connect(user2).approve(adpVoteContract.address, amountInWei("4"));
        await adpVoteContract.connect(user2).vote(nft.address, 1);
        await adpVoteContract.connect(user2).vote(nft.address, 1);
        await adpVoteContract.connect(user2).vote(nft.address, 1);
        await adpVoteContract.connect(user2).vote(nft.address, 1);

        await erc20.connect(user3).approve(adpVoteContract.address, votingFee);
        await adpVoteContract.connect(user3).vote(nft.address, 1);

        await erc20.connect(user4).approve(adpVoteContract.address, votingFee);
        await adpVoteContract.connect(user4).vote(nft.address, 1);

        // const votingAmount = await adpVoteContract.connect(user1).votingAmount(nft.address);
        runningCampaign = await adpVoteContract.connect(user1).campaigns(nft.address);

        expect(runningCampaign.totalVoteAmount).to.equal(6000000);
    });

      it("Should accept if balance of user2 after voting.", async function () {
          const balBefore = parseInt( await erc20.connect(user2).balanceOf(user2.address) );
          await erc20.connect(user2).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user2).vote(nft.address, 1);
          const balAfter = parseInt( await erc20.connect(user2).balanceOf(user2.address) );
          expect(balBefore - votingFee).to.equal(balAfter);
      });

    });

    describe("Checking multiple voters of parallel votes", function () { 
        
      beforeEach(async function () {
          await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
          await adpVoteContract.connect(deployedUser).startVotingCampaign(
            nftAddress,
            votingFee,
            toggleVote, // toggleVote
            prizePool, 
            shareCount, // topWinner No
            endDate,
            [1, 4], // tokenIds,
            percentage, dispensable
          );
  
          await erc20.connect(user3).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user3).vote(nft.address, 1);  
          await erc20.connect(user4).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user4).vote(nft.address, 1);

          await erc20.connect(user5).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user5).vote(nft.address, 4);
          await erc20.connect(user6).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user6).vote(nft.address, 4);
          await erc20.connect(user7).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user7).vote(nft.address, 4);

          await nft.connect(deployedUser).setApprovalForAll(adpVoteContract.address, true);
          await adpVoteContract.connect(deployedUser).tranferToContestants(nft.address, _tokenIds, _addresses);

      });
 
      it("Should accept if owner 1 is user1.", async function () {
        const _nft1Owner = await adpVoteContract.owners(nftAddress, 1);
        expect(_nft1Owner).to.equal(user1.address);
      });

      it("Should accept if owner2 is user2.", async function () {
        const _nft2Owner = await adpVoteContract.owners(nftAddress, 4);        
        expect(_nft2Owner).to.equal(user2.address);
      });

      it("Should accept if Token Id length is 2.", async function () {
        const _tokenPairs = await adpVoteContract.getTokenIds(nftAddress);    
        expect(_tokenPairs.length).to.equal(2);
      });
 
      it("Should accept if vote cout and voters length of NFT1 is 2.", async function () {
        const _nft1counter = await adpVoteContract.counters(nftAddress, 1);
        const _nft1voters = await adpVoteContract.getVoters(nftAddress, 1);
        expect( parseInt(_nft1counter) ).to.equal( _nft1voters.length );
      });

      it("Should accept if vote cout and voters length of NFT4 is 3.", async function () {
        const _nft4counter = await adpVoteContract.counters(nftAddress, 4);
        const _nft4voters = await adpVoteContract.getVoters(nftAddress, 4);
        expect( parseInt(_nft4counter) ).to.equal( _nft4voters.length );
      });

    });

    describe("Dispensing Prize", function () {
        
      beforeEach(async function () {
          await erc20.connect(deployedUser).approve(adpVoteContract.address, prizePool);
          await adpVoteContract.connect(deployedUser).startVotingCampaign(
            nftAddress,
            votingFee,
            toggleVote, // toggleVote
            prizePool, 
            2, //topWinner No
            endDate,
            [1, 2, 4, 7], // tokenIds
            0,
            dispensable
          );

          await erc20.connect(user4).approve(adpVoteContract.address, votingFee);
          await erc20.connect(user5).approve(adpVoteContract.address, votingFee);
          await erc20.connect(user7).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user4).vote(nft.address, 2);
          await adpVoteContract.connect(user5).vote(nft.address, 2);
          await adpVoteContract.connect(user7).vote(nft.address, 2);

          await erc20.connect(user6).approve(adpVoteContract.address, votingFee);
          await erc20.connect(user7).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user6).vote(nft.address, 4);
          await adpVoteContract.connect(user7).vote(nft.address, 4);
          
          await erc20.connect(user4).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user4).vote(nft.address, 7);
  
          await erc20.connect(user3).approve(adpVoteContract.address, votingFee);
          await adpVoteContract.connect(user3).vote(nft.address, 1);

          await nft.connect(deployedUser).setApprovalForAll(adpVoteContract.address, true);
          await adpVoteContract.connect(deployedUser).tranferToContestants(nft.address, _tokenIds, _addresses);
      });
      /*
      * Prize is 100 USDT. Top 2 winners will be chosen.
      * user1 is one of top winners
      * So after dispensing prizes, user1 will receive 50 USDT from prize awarded
      */
      it("Should accept if user1 balance is 1050000000 after dispensing.", async function () {
        await network.provider.send("evm_increaseTime", [endDate + 1]);
          await adpVoteContract.connect(deployedUser).dispensePrize(nft.address);
          const user1BalAfterDispensing = parseInt( await erc20.connect(user1).balanceOf(user2.address) );
         expect(user1BalAfterDispensing).to.equal(amountInWei("1050"));
      });

      /*
      * Prize is 100 USDT. Top 2 winners will be chosen.
      * user2 is one of top winners
      * So after dispensing prizes, user2 will receive 50 USDT from prize awarded
      */
      it("Should accept if user2 balance is 1050000000 after dispensing.", async function () {
          await network.provider.send("evm_increaseTime", [endDate + 1]);
          await adpVoteContract.connect(deployedUser).dispensePrize(nft.address);
          const user2BalAfterDispensing = await erc20.connect(user2).balanceOf(user2.address);
          expect(user2BalAfterDispensing).to.equal( amountInWei("1050") );
      });

      /*
      * user2 is one of top winners
      * So after dispensing prizes, user2 will receive 50 USDT from prize awarded
      */
      it("Should accept if top voter (user4) balance is 999400000 after dispensing.", async function () {
        await network.provider.send("evm_increaseTime", [endDate + 1]);
        await adpVoteContract.connect(deployedUser).dispensePrize(nft.address);
        const user4BalAfterDispensing = parseInt( await erc20.connect(deployedUser).balanceOf(user4.address) );
        expect(user4BalAfterDispensing).to.equal(999400000);
      });

      /*
      * user4 is voter who spend 2USDT for two votes
      * its first vote is for losing entry and second vote is for winning entry
      * so I will get back 1 USDT.
      * So after dispensing prizes, user4's balance is 999 USDT
      */
      it("Should accept if top voter (user4) balance is 999400000 after dispensing.", async function () {
        await network.provider.send("evm_increaseTime", [endDate + 1]);
        await adpVoteContract.connect(deployedUser).dispensePrize(nft.address);
        const user4BalAfterDispensing = parseInt( await erc20.connect(deployedUser).balanceOf(user4.address) );
        expect(user4BalAfterDispensing).to.equal(999400000);
      });

      /*
      * user5 is voter who spend 1USDT for one vote
      * it votes for winning entry and it will get back  USDT.
      * So after dispensing prizes, user5's balance is 1000 USDT.
      */
      it("Should accept if top voter (user5) has original balance - 1000400000 after dispensing.", async function () {
        await network.provider.send("evm_increaseTime", [endDate + 1]);
        await adpVoteContract.connect(deployedUser).dispensePrize(nft.address);
        const user5BalAfterDispensing = parseInt( await erc20.connect(deployedUser).balanceOf(user5.address) );
        expect(user5BalAfterDispensing).to.equal(1000400000);
      });

      /*
      * user6 is voter who spend 1USDT for one vote
      * it votes for winning entry and it will get back  USDT.
      * So after dispensing prizes, user6's balance is 1000 USDT.
      */
      it("Should accept if top voter (user6) has original balance - 1000400000 after dispensing.", async function () {
        await network.provider.send("evm_increaseTime", [endDate + 1]);
        await adpVoteContract.connect(deployedUser).dispensePrize(nft.address);
        const user6BalAfterDispensing = parseInt( await erc20.connect(deployedUser).balanceOf(user6.address) );
        expect(user6BalAfterDispensing).to.equal(1000400000);
      });

      /*
      * use7 is voter who spend 1USDT for one vote
      * it votes for winning entry and it will get back  USDT.
      * So after dispensing prizes, user7's balance is 1000 USDT.
      */
      it("Should accept if top voter (user7) has original balance - 1000800000 after dispensing.", async function () {
        await network.provider.send("evm_increaseTime", [endDate + 1]);
        await adpVoteContract.connect(deployedUser).dispensePrize(nft.address);
        const user7BalAfterDispensing = parseInt( await erc20.connect(deployedUser).balanceOf(user7.address) );
        expect(user7BalAfterDispensing).to.equal(1000800000);
      });

      /*
      * user3 is voter who spend 1USDT for one votes
      * it votes for losing entry and it will lost 1 USDT.
      * So after dispensing prizes, user3's balance is 999 USDT.
      */
      it("Should accept if non top voter (user3) does not have original balance - 999000000 after dispensing.", async function () {
        await network.provider.send("evm_increaseTime", [endDate + 1]);
        await adpVoteContract.connect(deployedUser).dispensePrize(nft.address);
        const user3BalAfterDispensing = parseInt( await erc20.connect(deployedUser).balanceOf(user3.address) );
        
        // const _finales = await adpVoteContract.connect(deployedUser).getWinnersAndVoters(nft.address);

        expect(user3BalAfterDispensing).to.equal( amountInWei("999") );
      });
      
    });

    // describe("Test Method", function () {
    //   it("Should accept if this is testing.", async function () {
    //     const _data = await adpVoteContract.connect(deployedUser).getAddressRole();
    //     console.log("_data", _data );
    //     expect(100).to.equal(100);
    //   });
    // });
 
});
