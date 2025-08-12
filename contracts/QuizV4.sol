// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Quiz - Version 1 (Basic)
 * @dev Enhanced quiz contract with answer storage and improved functionality
 */
contract Quiz {
    address private creator;
    uint256 private questionCount;
    bytes32 private answersHash;
    
    address[] private playerAddresses;
    mapping(address => uint256) private playerIndexes; // For O(1) lookup
    
    bool private isStarted;
    bool private isFinished;
    uint256 private startTime;

    address private winner = address(0);
    uint256 private winnersScore = 0;
    
    // Store all player answers efficiently
    // Using packed struct to save gas
    struct PlayerAnswers {
        uint128 answers; // Can store up to 32 answers (4 bits each, 0-15 values)
        uint128 score;
    }
    mapping(address => PlayerAnswers) private playerAnswers;
    
    uint256 private constant QUESTION_DURATION = 20 seconds;
    uint256 private constant AUTO_DESTROY_DELAY = 24 hours;
    
    event QuizStarted(uint256 startTime, uint256 playerCount);
    event QuizFinished(address winner, uint256 score);
    event PlayerAnswersSubmitted(address indexed player, uint256 score);
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator can call this");
        _;
    }
    
    modifier quizActive() {
        require(isStarted && !isFinished, "Quiz not active");
        _;
    }

    modifier quizEnded() {
        require(isFinished, "Quiz not finished");
        _;
    }

    constructor(
        address _creator,
        uint256 _questionCount,
        bytes32 _answersHash
    ) {
        require(_questionCount > 0 && _questionCount <= 32, "Invalid question count (1-32)");
        require(_answersHash != bytes32(0), "Invalid answers hash");

        creator = _creator;
        questionCount = _questionCount;
        answersHash = _answersHash;
    }

    /**
     * @dev Start the quiz with registered players
     */
    function startQuiz(address[] calldata _playerAddresses) external onlyCreator {
        require(!isStarted, "Quiz already started");
        require(_playerAddresses.length > 0, "No players joined");
        require(_playerAddresses.length <= 100, "Too many players"); // Gas limit protection

        playerAddresses = _playerAddresses;
        
        // Create efficient lookup mapping
        for (uint256 i = 0; i < _playerAddresses.length; i++) {
            playerIndexes[_playerAddresses[i]] = i + 1; // +1 to avoid 0 (default value)
        }

        isStarted = true;
        startTime = block.timestamp;
        isFinished = false;

        emit QuizStarted(startTime, _playerAddresses.length);
    }
    
    /**
     * @dev Submit all player answers at once (called by backend signer)
     * @param players Array of player addresses
     * @param answers Array of packed answers for each player
     * @param scores Array of calculated scores
     */
    function submitAllAnswers(
        address[] calldata players,
        uint128[] calldata answers,
        uint128[] calldata scores
    ) external onlyCreator quizActive {
        require(players.length == answers.length && players.length == scores.length, "Arrays length mismatch");
        require(players.length <= playerAddresses.length, "Too many players");
        
        for (uint256 i = 0; i < players.length; i++) {
            require(playerIndexes[players[i]] > 0, "Player not registered");
            
            playerAnswers[players[i]] = PlayerAnswers({
                answers: answers[i],
                score: scores[i]
            });
            
            emit PlayerAnswersSubmitted(players[i], scores[i]);
        }
    }
    
    /**
     * @dev End the quiz and set winner
     */
    function endQuiz(
        string calldata correctAnswers,
        address _winner,
        uint256 _score
    ) external onlyCreator {
        require(isStarted && !isFinished, "Invalid quiz state");
        require(_score > 0 && _winner != address(0), "Invalid winner data");
        require(playerIndexes[_winner] > 0, "Winner not a registered player");
        require(
            block.timestamp >= startTime + (questionCount * QUESTION_DURATION),
            "Quiz still in progress"
        );
        require(
            keccak256(abi.encodePacked(correctAnswers)) == answersHash,
            "Invalid answers hash"
        );

        winner = _winner;
        winnersScore = _score;
        isFinished = true;
        
        emit QuizFinished(winner, winnersScore);
    }

    /**
     * @dev Get quiz results
     */
    function getQuizResults() external view quizEnded returns (
        address winnerAddress,
        uint256 winnerScore,
        uint256 totalPlayers,
        uint256 quizEndTime
    ) {
        return (
            winner,
            winnersScore,
            playerAddresses.length,
            startTime + (questionCount * QUESTION_DURATION)
        );
    }

    /**
     * @dev Get player's answers and score
     */
    function getPlayerResults(address player) external view quizEnded returns (
        uint128 answers,
        uint128 score
    ) {
        require(playerIndexes[player] > 0, "Player not found");
        PlayerAnswers memory playerData = playerAnswers[player];
        return (playerData.answers, playerData.score);
    }

    /**
     * @dev Get all players addresses
     */
    function getAllPlayers() external view returns (address[] memory) {
        return playerAddresses;
    }

    /**
     * @dev Get quiz basic info
     */
    function getQuizInfo() external view returns (
        address creatorAddress,
        uint256 questions,
        bool started,
        bool finished,
        uint256 startedAt,
        uint256 playersCount
    ) {
        return (
            creator,
            questionCount,
            isStarted,
            isFinished,
            startTime,
            playerAddresses.length
        );
    }

    /**
     * @dev Emergency stop (only creator)
     */
    function emergencyStop() external onlyCreator {
        require(isStarted && !isFinished, "Cannot stop quiz in current state");
        isFinished = true;
        emit QuizFinished(address(0), 0); // No winner in emergency stop
    }
}
