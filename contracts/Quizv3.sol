// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Enhanced Quiz Contract with batch submission and better gas optimization
contract Quiz {
    struct Player {
        address playerAddress;
        bytes32 answersHash;    // Hash of all answers submitted together
        uint256 score;
        bool hasSubmitted;
    }

    address private creator;
    bool private isActive;
    bool private isFinished;
    uint256 private startTime;
    uint256 private endTime;
    uint256 public entryFee;
    uint256 public questionCount;
    bytes32 public correctAnswersHash;
    
    Player[] public players;
    mapping(address => uint256) public playerIndex;
    mapping(address => bool) public isRegistered;
    
    address[] public winners;
    uint256 public winnerScore;
    uint256 public prizePool;
    
    // Constants for better gas optimization
    uint256 private constant QUESTION_DURATION = 30 seconds;
    uint256 private constant SUBMISSION_WINDOW = 60 seconds; // After quiz ends
    uint256 private constant AUTO_DESTROY_DELAY = 7 days;
    
    // Events
    event QuizCreated(address indexed creator, uint256 questionCount);
    event PlayerRegistered(address indexed player, uint256 totalRegistered);
    event QuizStarted(uint256 startTime, uint256 endTime);
    event AnswersSubmitted(address indexed player, bytes32 answersHash, uint256 submissionTime);
    event QuizFinished(address[] winners, uint256 winnerScore, uint256 totalPlayers);
    event PrizeDistributed(address indexed winner, uint256 amount);
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator allowed");
        _;
    }
    
    modifier quizActive() {
        require(isActive && !isFinished, "Quiz not active");
        require(block.timestamp <= endTime, "Quiz time expired");
        _;
    }
    
    modifier submissionWindow() {
        require(
            isActive && 
            block.timestamp > endTime && 
            block.timestamp <= endTime + SUBMISSION_WINDOW,
            "Submission window closed"
        );
        _;
    }
    
    constructor(
        address _creator,
        uint256 _questionCount,
        bytes32 _correctAnswersHash,
        uint256 _entryFee
    ) {
        require(_questionCount > 0 && _questionCount <= 50, "Invalid question count");
        require(_correctAnswersHash != bytes32(0), "Invalid answers hash");

        creator = _creator;
        questionCount = _questionCount;
        entryFee = _entryFee;
        correctAnswersHash = _correctAnswersHash;

        emit QuizCreated(creator, questionCount);
    }
    
    // Player registration with optional entry fee
    function registerForQuiz() external payable {
        require(!isRegistered[msg.sender], "Already registered");
        require(msg.value == entryFee, "Incorrect entry fee");
        
        players.push(Player({
            playerAddress: msg.sender,
            answersHash: bytes32(0),
            score: 0,
            hasSubmitted: false
        }));
        
        playerIndex[msg.sender] = players.length - 1;
        isRegistered[msg.sender] = true;
        prizePool += msg.value;
        
        emit PlayerRegistered(msg.sender, players.length);
    }
    
    // Creator starts the quiz
    function startQuiz() external onlyCreator {
        require(players.length > 0, "No players registered");
        require(!isActive, "Quiz already started");
        
        isActive = true;
        startTime = block.timestamp;
        endTime = block.timestamp + (questionCount * QUESTION_DURATION);
        
        emit QuizStarted(startTime, endTime);
    }
    
    // Players submit all answers at once (after quiz ends)
    function submitAnswers(bytes32 _answersHash) external submissionWindow {
        require(isRegistered[msg.sender], "Not registered");
        
        uint256 pIndex = playerIndex[msg.sender];
        require(!players[pIndex].hasSubmitted, "Already submitted");
        
        players[pIndex].answersHash = _answersHash;
        players[pIndex].hasSubmitted = true;
        
        emit AnswersSubmitted(msg.sender, _answersHash, block.timestamp);
    }
    
    // Creator reveals correct answers and calculates scores
    function revealAnswersAndFinish(
        string calldata _correctAnswers,
        address[] calldata _playerAddresses,
        uint256[] calldata _scores
    ) external onlyCreator {
        require(isActive && !isFinished, "Invalid state");
        require(block.timestamp > endTime + SUBMISSION_WINDOW, "Submission window still open");
        require(
            keccak256(abi.encodePacked(_correctAnswers)) == correctAnswersHash,
            "Invalid correct answers"
        );
        require(_playerAddresses.length == _scores.length, "Arrays length mismatch");
        
        // Update player scores
        winnerScore = 0;
        for (uint256 i = 0; i < _playerAddresses.length; i++) {
            require(isRegistered[_playerAddresses[i]], "Player not registered");
            uint256 pIndex = playerIndex[_playerAddresses[i]];
            players[pIndex].score = _scores[i];
            
            if (_scores[i] > winnerScore) {
                winnerScore = _scores[i];
                delete winners; // Clear previous winners
                winners.push(_playerAddresses[i]);
            } else if (_scores[i] == winnerScore && winnerScore > 0) {
                winners.push(_playerAddresses[i]);
            }
        }
        
        isFinished = true;
        emit QuizFinished(winners, winnerScore, players.length);
        
        // Distribute prizes if there's a prize pool
        if (prizePool > 0 && winners.length > 0) {
            _distributePrizes();
        }
    }
    
    // Internal function to distribute prizes
    function _distributePrizes() private {
        if (prizePool == 0 || winners.length == 0) return;
        
        uint256 prizePerWinner = prizePool / winners.length;
        uint256 creatorFee = prizePool * 5 / 100; // 5% creator fee
        uint256 remainingPrize = prizePool - creatorFee;
        prizePerWinner = remainingPrize / winners.length;
        
        // Send creator fee
        if (creatorFee > 0) {
            payable(creator).transfer(creatorFee);
        }
        
        // Send prizes to winners
        for (uint256 i = 0; i < winners.length; i++) {
            payable(winners[i]).transfer(prizePerWinner);
            emit PrizeDistributed(winners[i], prizePerWinner);
        }
        
        prizePool = 0;
    }
    
    // Emergency refund function (before quiz starts)
    // function emergencyRefund() external onlyCreator {
    //     require(isActive, "Quiz already started");
        
    //     if (prizePool > 0) {
    //         uint256 refundPerPlayer = prizePool / players.length;
    //         for (uint256 i = 0; i < players.length; i++) {
    //             payable(players[i].playerAddress).transfer(refundPerPlayer);
    //         }
    //         prizePool = 0;
    //     }
    // }
    

    function getPlayersCount() external view returns (uint256) {
        return players.length;
    }
    
    function getPlayerData(uint256 index) external view returns (Player memory) {
        require(index < players.length, "Invalid index");
        return players[index];
    }
    
    function getWinners() external view returns (address[] memory, uint256) {
        require(isFinished, "Quiz not finished");
        return (winners, winnerScore);
    }
    
    function hasPlayerSubmitted(address _player) external view returns (bool) {
        if (!isRegistered[_player]) return false;
        return players[playerIndex[_player]].hasSubmitted;
    }
    
    // Self-destruct after delay (only if quiz is finished)
    function cleanup() external {
        require(
            isFinished && 
            block.timestamp > endTime + AUTO_DESTROY_DELAY,
            "Cannot cleanup yet"
        );
        selfdestruct(payable(creator));
    }
}