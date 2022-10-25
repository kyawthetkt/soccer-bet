// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Soccer is Initializable, OwnableUpgradeable, AccessControlUpgradeable {

    string public name;

    address private erc20ContractAddress;
    uint256 private platformPercent;
    address private commissionRecipient;

    bytes32 public constant CREATOR = keccak256("CREATOR");
    bytes32 public constant EDITOR = keccak256("EDITOR");
    bytes32 public constant CLOSER = keccak256("CLOSER");

    struct Game {
        bytes32 homeTeam;
        bytes32 awayTeam;
        uint256 fee;
        uint256 startTime;
        uint256 endTime;
        bool isEnded;
    }
 
    mapping(bytes32 => Game) public games;
    mapping(bytes32 => bytes32) public winners; // set when called closeToIncentivize()
    mapping(bytes32 => uint256) public balances;

    mapping(bytes32 => address[]) public homePlayers;
    mapping(bytes32 => address[]) public awayPlayers;
    mapping(bytes32 => mapping(address => bool)) public isPlayed;

    function initialize(string memory _name) public initializer {

        name = _name;
 
        _grantRole(CREATOR, msg.sender);
        _grantRole(EDITOR, msg.sender);
        _grantRole(CLOSER, msg.sender);
 
        __Ownable_init();
    }

    /*** Events ***/
    event LogGame(
        bytes10 action,
        bytes32 homeTeam, 
        bytes32 awayTeam,
        uint256 fee,
        uint256 startTime,
        uint256 endTime,
        bool isEnded
    );

    event LogGameWinners(
        bytes32 gameId,
        bytes32 winnerTeam,
        uint256 platformPercentAmount,
        address[] winners,
        uint256 amountForEach
    );

    event LogPlay(
        bytes32 gameId,
        bytes32 teamName,
        address player
    );

    /*** Modifiers ***/
    modifier isCreator() {
        require(hasRole(CREATOR, msg.sender));
        _;
    }

    modifier isEditor() {
        require(hasRole(EDITOR, msg.sender));
        _;
    }

    modifier isCloser() {
        require(hasRole(CLOSER, msg.sender));
        _;
    }
    
    /*
    * Functions
    */
    function createGame(
        bytes32 _homeTeam, 
        bytes32 _awayTeam,
        uint256 _fee,
        uint256 _startTime,
        uint256 _endTime
    ) external isCreator {

        bytes32 _gameId = keccak256(abi.encodePacked(_homeTeam, _awayTeam));
        require( games[_gameId].startTime > 0, "ERROR: This game has not added.");

        games[_gameId] = Game({
            homeTeam: _homeTeam,
            awayTeam: _awayTeam,
            fee: _fee,
            startTime: _startTime,
            endTime: _endTime,
            isEnded: false
        });

        emit LogGame(
            "ADD", 
            _homeTeam, 
            _awayTeam, 
            _fee, 
            _startTime, 
            _endTime, 
            false
        );

    }

    function editGame(
        bytes32 _gameId,
        bytes32 _homeTeam, 
        bytes32 _awayTeam,
        uint256 _fee,
        uint256 _startTime,
        uint256 _endTime
    ) external isEditor {
        // must be between start and end date
        Game storage activeGame = games[_gameId];

        if ( activeGame.homeTeam != _homeTeam ) {
            activeGame.homeTeam = _homeTeam;
        }

        if ( activeGame.awayTeam != _awayTeam ) {
            activeGame.awayTeam = _awayTeam;
        }

        if ( activeGame.fee != _fee ) {
            activeGame.fee = _fee;
        }

        if ( activeGame.startTime != _startTime ) {
            activeGame.startTime = _startTime;
        }

        if ( activeGame.endTime != _endTime ) {
            activeGame.endTime = _endTime;
        }
        emit LogGame(
            "EDIT", 
            _homeTeam, 
            _awayTeam, 
            _fee, 
            _startTime, 
            _endTime, 
            activeGame.isEnded
        );
    }
 
    function cancelGame(bytes32 _gameId) external isCreator {
        // must be less than start date
        Game storage activeGame = games[_gameId];
        require( uint64(block.timestamp) < activeGame.startTime, "ERROR: This game has already started.");
        activeGame.isEnded = true;

        emit LogGame(
            "CANCEL", 
            activeGame.homeTeam, 
            activeGame.awayTeam, 
            activeGame.fee, 
            activeGame.startTime, 
            activeGame.endTime, 
            activeGame.isEnded
        );
    }

    function closeToIncentivize(bytes32 _gameId, bytes3 _winnerTeam) external isCloser {
        // must be greater end date
        Game storage targetGame = games[_gameId];
        require( uint64(block.timestamp) > targetGame.endTime, "ERROR: This game has not ended.");
        
        // Process Payment to list of players
        if ( _winnerTeam == bytes32("DRAW_DROPED") ) {

            uint256 _amount = balances[_gameId] / (homePlayers[_gameId].length + awayPlayers[_gameId].length);

            _payoutToWinners(homePlayers[_gameId], _amount);

            _payoutToWinners(awayPlayers[_gameId], _amount);

        } else {
            uint256 _platformPercent = balances[_gameId] * platformPercent / 10000;
            uint256 _amountLeft = balances[_gameId] - _platformPercent;

            if ( targetGame.homeTeam == _winnerTeam ) {

                uint256 _amountForEach = _amountLeft / homePlayers[_gameId].length;

                _payoutToWinners(homePlayers[_gameId], _amountForEach);
                
                emit LogGameWinners(
                    _gameId, 
                    _winnerTeam,
                    platformPercent, 
                    homePlayers[_gameId], 
                    _amountForEach
                );

            } else if ( targetGame.awayTeam == _winnerTeam ) {

                uint256 _amountForEach = _amountLeft / awayPlayers[_gameId].length;

                _payoutToWinners(awayPlayers[_gameId], _amountForEach);

                emit LogGameWinners(
                    _gameId, 
                    _winnerTeam, 
                    platformPercent, 
                    awayPlayers[_gameId], 
                    _amountForEach
                );
            }

            _payTokenFromContract(commissionRecipient, _platformPercent);
        }

        winners[_gameId] = _winnerTeam;
        targetGame.isEnded = true;

         emit LogGame(
            "CLOSE", 
            targetGame.homeTeam, 
            targetGame.awayTeam, 
            targetGame.fee, 
            targetGame.startTime, 
            targetGame.endTime, 
            true
        );
    }

    function play(bytes32 _gameId, bytes32 _selectedTeam) external {
        // check it is not ended
        // check valid time
        // already voted
        Game storage targetGame = games[_gameId];

        require(targetGame.isEnded == false, "ERROR: This game has been already ended.");
        require( uint64(block.timestamp) <= targetGame.startTime, "ERROR: This game has already started.");
        require(isPlayed[_gameId][msg.sender] == false, "ERROR: You have already played.");

        if ( targetGame.homeTeam == _selectedTeam ) {
            homePlayers[_gameId].push(msg.sender);
        }
        if ( targetGame.awayTeam == _selectedTeam ) {
            awayPlayers[_gameId].push(msg.sender);
        }
        // Transfer ERC20 Token
        if ( targetGame.fee > 0 ) {
            _payTokenFromAcc(msg.sender, address(this), targetGame.fee);
        }

        isPlayed[_gameId][msg.sender] = true;
        balances[_gameId] += targetGame.fee;
        
        emit LogPlay(_gameId, _selectedTeam, msg.sender);
    }

    function grantUserRoles(uint8[] memory _roleIds, address _address) external onlyOwner {
        for (uint256 i = 0; i < _roleIds.length; i++) {
            if ( _roleIds[i] == 1 ) _grantRole(CREATOR, _address);
            if ( _roleIds[i] == 2 ) _grantRole(EDITOR, _address);
            if ( _roleIds[i] == 3 ) _grantRole(CLOSER, _address);
        }
    }

    function revokeUserRoles(uint8[] memory _roleIds, address _address) external onlyOwner {
       for (uint256 i = 0; i < _roleIds.length; i++) {
            if ( _roleIds[i] == 1 ) _revokeRole(CREATOR, _address);
            if ( _roleIds[i] == 2 ) _revokeRole(EDITOR, _address);
            if ( _roleIds[i] == 3 ) _revokeRole(CLOSER, _address);
        }
    }

    /*
    ** erc20ContractAddress
    ** platformPercent
    ** commissionRecipient
    */
    function setCommission(address _erc20ContractAddress, uint256 _platformPercent, address _commissionRecipient) external payable onlyOwner {
        
        if ( _erc20ContractAddress != address(0) ) {
            erc20ContractAddress = _erc20ContractAddress;
        }

        if ( _platformPercent != 0 ) {
            platformPercent = _platformPercent;
        }

        if ( _commissionRecipient != address(0) ) {
            commissionRecipient = _commissionRecipient;
        }
    }
 
    function transferToAccount(address _receiver, uint256 _amount) external payable onlyOwner {
        _payTokenFromContract(_receiver, _amount);
    }

    function getPlayers(bytes32 _gameId) public view returns(address[] memory, address[] memory) {
        return(homePlayers[_gameId], awayPlayers[_gameId]);
    }

    function getWinners(bytes32 _gameId) public view returns(bytes32) {
        return winners[_gameId];
    }

    function getRoles() external pure returns(bytes32, bytes32, bytes32) {
        return (CREATOR, EDITOR, CLOSER);
    }

    /*
    * Internal Functions
    */
    function _payoutToWinners(address[] memory _addresses, uint256 _amount) internal {
        for (uint256 i = 0; i < _addresses.length; i++) {
            _payTokenFromContract(_addresses[i], _amount);
        }
    }
    function _payTokenFromAcc(address _sender, address _receiver, uint256 _amount) internal {
        IERC20Upgradeable(erc20ContractAddress).transferFrom(_sender, _receiver, _amount);
    }

    function _payTokenFromContract(address _receiver, uint256 _amount) internal {
        IERC20Upgradeable(erc20ContractAddress).transfer(_receiver, _amount);
    }

}
