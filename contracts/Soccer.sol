// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract Soccer is Initializable, OwnableUpgradeable, AccessControlUpgradeable {

    string public name;

    address public ERC20_CONTRACT_ADDRESS;
    address public COMMISSION_RECIPIENT;
    uint256 public PLATFORM_PERCENT;

    bytes32 public constant GAME_ON_DRAW = keccak256("DRAW");
    bytes32 public constant CREATOR = keccak256("CREATOR");
    bytes32 public constant EDITOR = keccak256("EDITOR");
    bytes32 public constant CLOSER = keccak256("CLOSER");

    struct Game {
        string homeTeam;
        string awayTeam;
        uint256 fee;
        uint256 startTime;
        uint256 endTime;
        bool isEnded;
    }
 
    mapping(uint256 => Game) public games;
    mapping(uint256 => uint256) public balances;
    mapping(uint256 => string) public winners; // set when called closeToIncentivize()

    mapping(uint256 => address[]) public homePlayers;
    mapping(uint256 => address[]) public awayPlayers;
    mapping(uint256 => mapping(address => bool)) public isPlayed;

    function initialize() public initializer {

        name = "Soccer Vote";
 
        _grantRole(CREATOR, msg.sender);
        _grantRole(EDITOR, msg.sender);
        _grantRole(CLOSER, msg.sender);
 
        __Ownable_init();
    }

    /*** Events ***/
    event LogGame(
        bytes10 action,
        uint256 gameId,
        string homeTeam, 
        string awayTeam,
        uint256 fee,
        uint256 startTime,
        uint256 endTime,
        bool isEnded
    );

    event LogGameWinners(
        uint256 gameId,
        string winnerTeam,
        uint256 platformPercentAmount,
        address[] winners,
        uint256 amountForEach
    );

    event LogPlay(
        uint256 gameId,
        string teamName,
        address player
    );

    /*** Modifiers ***/
    modifier isCreator() {
        require(hasRole(CREATOR, msg.sender), "ERROR: You have no permission.");
        _;
    }

    modifier isEditor() {
        require(hasRole(EDITOR, msg.sender), "ERROR: You have no permission.");
        _;
    }

    modifier isCloser() {
        require(hasRole(CLOSER, msg.sender), "ERROR: You have no permission.");
        _;
    }
    
    /*
    * Functions
    */
    function createGame(
        uint256 _gameId,
        string memory _homeTeam, 
        string memory _awayTeam,
        uint256 _fee,
        uint256 _startTime,
        uint256 _endTime
    ) external isCreator {

        require( games[_gameId].fee <= 0, "ERROR: This game has already existed.");
        
        uint256 _currentTime = uint64(block.timestamp);

        games[_gameId] = Game({
            homeTeam: _homeTeam,
            awayTeam: _awayTeam,
            fee: _fee,
            startTime: _currentTime + _startTime,
            endTime: _currentTime + _endTime,
            isEnded: false
        });

        emit LogGame(
            "ADD", 
            _gameId,
            _homeTeam, 
            _awayTeam, 
            _fee, 
            _currentTime + _startTime, 
            _currentTime + _endTime, 
            false
        );
    }

    function editGame(
        uint256 _gameId,
        string memory _homeTeam, 
        string memory _awayTeam,
        uint256 _fee,
        uint256 _startTime,
        uint256 _endTime
    ) external isEditor {

        Game storage activeGame = games[_gameId];

        require( activeGame.fee > 0, "ERROR: The game has not existed.");

        require( _fee > 0, "ERROR: The game fee must be greater than 0.");

        uint256 _currentTime = uint64(block.timestamp);

        require( _currentTime < activeGame.startTime, "ERROR: The game has already started.");

        if ( _keccak256(activeGame.homeTeam) != _keccak256(_homeTeam) ) {
            activeGame.homeTeam = _homeTeam;
        }

        if ( _keccak256(activeGame.awayTeam) != _keccak256(_awayTeam) ) {
            activeGame.awayTeam = _awayTeam;
        }

        if ( activeGame.fee != _fee ) {
            activeGame.fee = _fee;
        }

        if ( activeGame.startTime != _startTime ) {
            activeGame.startTime = _currentTime + _startTime;
        }

        if ( activeGame.endTime != _endTime ) {
            activeGame.endTime = _currentTime + _endTime;
        }
        emit LogGame(
            "EDIT", 
            _gameId,
            _homeTeam, 
            _awayTeam, 
            _fee, 
            activeGame.startTime, 
            activeGame.endTime, 
            activeGame.isEnded
        );
    }
 
    function cancelGame(uint256 _gameId) external isCreator {
        // must be less than start date
        Game storage activeGame = games[_gameId];
        
        require( activeGame.fee > 0, "ERROR: The game has not existed.");

        require( uint64(block.timestamp) < activeGame.startTime, "ERROR: The game has already started.");

        activeGame.isEnded = true;

        emit LogGame(
            "CANCEL",
            _gameId,
            activeGame.homeTeam, 
            activeGame.awayTeam, 
            activeGame.fee, 
            activeGame.startTime, 
            activeGame.endTime, 
            activeGame.isEnded
        );
    }

    function play(uint256 _gameId, string memory _selectedTeam) external {

        Game storage targetGame = games[_gameId];

        uint64 _currentTime = uint64(block.timestamp);

        require(
            IERC20Upgradeable(ERC20_CONTRACT_ADDRESS).balanceOf(msg.sender) >= targetGame.fee, 
            "ERROR: Insufficient balance."
        );

        require( _currentTime > targetGame.startTime, "ERROR: The game has not started yet.");

        require( _currentTime < targetGame.endTime, "ERROR: The game has been ended.");

        require(isPlayed[_gameId][msg.sender] == false, "ERROR: You have already played.");
 
        if ( _keccak256(targetGame.homeTeam) == _keccak256(_selectedTeam) ) {
            homePlayers[_gameId].push(payable(msg.sender));
        }

        if ( _keccak256(targetGame.awayTeam) == _keccak256(_selectedTeam) ) {
            awayPlayers[_gameId].push(payable(msg.sender));
        }
        // Lock ERC20 Token in contract
        if ( targetGame.fee > 0 ) {
            _payTokenFromAcc(msg.sender, address(this), targetGame.fee);
        }

        isPlayed[_gameId][msg.sender] = true;
        balances[_gameId] += targetGame.fee;
        
        emit LogPlay(_gameId, _selectedTeam, msg.sender);
    }

    function payout(uint256 _gameId, string memory _winnerTeam) external isCloser {

        Game storage targetGame = games[_gameId];

        bytes32 _tempWinnerTeam = _keccak256(_winnerTeam);
        bytes32 _tempHomeTeam = _keccak256(targetGame.homeTeam);
        bytes32 _tempAwayTeam = _keccak256(targetGame.awayTeam);

        require( targetGame.fee > 0, "ERROR: This game has not existed.");
        require( 
            _tempWinnerTeam == GAME_ON_DRAW || _tempWinnerTeam == _tempHomeTeam || _tempWinnerTeam == _tempAwayTeam, 
            "ERROR: The game is not on draw or incorrect team chosen."
        );
        
        uint256 _gameBalance;

        if ( GAME_ON_DRAW == _tempWinnerTeam ) {

            address[] memory _homePlayers = homePlayers[_gameId];
            address[] memory _awayPlayers = awayPlayers[_gameId];
            _gameBalance = balances[_gameId];
            uint256 _amount = _gameBalance / (_homePlayers.length + _awayPlayers.length);

            _payoutToWinners(_homePlayers, _amount);
            _payoutToWinners(_awayPlayers, _amount);

        } else {

            address[] memory _homePlayers = homePlayers[_gameId];
            address[] memory _awayPlayers = awayPlayers[_gameId];
            uint256 _platformPercent;

            if ( _tempHomeTeam == _tempWinnerTeam ) {                

                _gameBalance = targetGame.fee * _awayPlayers.length;
                _platformPercent = _gameBalance * PLATFORM_PERCENT / 10000;
                uint256 _share = (_gameBalance - _platformPercent) / _homePlayers.length;

                _payoutToWinners(_homePlayers, _share);                
                emit LogGameWinners(_gameId, _winnerTeam, PLATFORM_PERCENT, _homePlayers, _share);

            } else if ( _tempAwayTeam == _tempWinnerTeam ) {

                _gameBalance = targetGame.fee * _homePlayers.length;
                _platformPercent = _gameBalance * PLATFORM_PERCENT / 10000;
                uint256 _share = (_gameBalance - _platformPercent) / _awayPlayers.length;

                _payoutToWinners(_awayPlayers, _share);
                emit LogGameWinners(_gameId, _winnerTeam, PLATFORM_PERCENT, _awayPlayers, _share);
            }
            // Platform Percentage
            _payTokenFromContract(COMMISSION_RECIPIENT, _platformPercent);
        }

        winners[_gameId] = _winnerTeam;
        balances[_gameId] = balances[_gameId] - _gameBalance;
        targetGame.isEnded = true;

         emit LogGame(
            "CLOSE",
            _gameId,
            targetGame.homeTeam, 
            targetGame.awayTeam, 
            targetGame.fee, 
            targetGame.startTime, 
            targetGame.endTime, 
            true
        );
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

    function setCommission(address _erc20ContractAddress, uint256 _platformPercent, address _commissionRecipient) external onlyOwner {
        
        if ( _erc20ContractAddress != address(0) ) {
            ERC20_CONTRACT_ADDRESS = _erc20ContractAddress;
        }

        if ( _platformPercent != 0 ) {
            PLATFORM_PERCENT = _platformPercent;
        }

        if ( _commissionRecipient != address(0) ) {
            COMMISSION_RECIPIENT = _commissionRecipient;
        }
    }
 
    function transferToAccount(address _receiver, uint256 _amount) external payable onlyOwner {
        _payTokenFromContract(_receiver, _amount);
    }

    function getPlayers(uint256 _gameId) public view returns(address[] memory, address[] memory) {
        return(homePlayers[_gameId], awayPlayers[_gameId]);
    }

    function getWinners(uint256 _gameId) public view returns(string memory) {
        return winners[_gameId];
    }
    
    function game(uint256 _gameId) public view returns(
        string memory, string memory, uint256, uint256, uint256, bool
    ) {
        return(
            games[_gameId].homeTeam,
            games[_gameId].awayTeam,
            games[_gameId].fee,
            games[_gameId].startTime,
            games[_gameId].endTime,
            games[_gameId].isEnded
        );
    }
    /*
    * Internal Functions
    */

    function _keccak256(string memory _str) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(_str));
    }

    function _payoutToWinners(address[] memory _addresses, uint256 _amount) internal {
        for (uint256 i = 0; i < _addresses.length; i++) {
            _payTokenFromContract(_addresses[i], _amount);
        }
    }

    function _payTokenFromAcc(address _sender, address _receiver, uint256 _amount) internal {
        IERC20Upgradeable(ERC20_CONTRACT_ADDRESS).transferFrom(_sender, _receiver, _amount);
    }

    function _payTokenFromContract(address _receiver, uint256 _amount) internal {
        IERC20Upgradeable(ERC20_CONTRACT_ADDRESS).transfer(_receiver, _amount);
    }

}
