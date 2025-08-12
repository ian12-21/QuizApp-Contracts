// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title QuizWithFees - Version 2 (With Entry Fees)
 * @dev Quiz contract with entry fees and prize distribution
 */
contract QuizWithFee {
    address private creator;
    uint256 private questionCount;
    bytes32 private answersHash;
    
    address[] private playerAddresses;
    mapping(address => uint256) private playerIndexes;
    mapping(address => bool) private hasPaid;
    
    bool private isStarted;
    bool private isFinished;
    uint256 private startTime;

    address private winner = address(0);
    uint256 private winnersScore = 0;
    
    struct PlayerAnswers {
        uint128 answers;
        uint128 score;
    }
    mapping(address => PlayerAnswers) private playerAnswers;
    
    // Fee and prize system
    uint256 public entryFee;
    uint256 public prizePool;
    bool public prizesDistributed;
    
    // Prize distribution (percentages in basis points: 10000 = 100%)
    uint256 public constant WINNER_PERCENTAGE = 8000; // 80%
    uint256 public constant CREATOR_PERCENTAGE = 500; // 5%
    uint256 public constant PLATFORM_PERCENTAGE = 1500; // 15%
    
    address public platformWallet;
    
    uint256 private constant QUESTION_DURATION = 20 seconds;
    
    event QuizStarted(uint256 startTime, uint256 playerCount, uint256 prizePool);
    event QuizFinished(address winner, uint256 score, uint256 prizePool);
    event PlayerJoined(address indexed player, uint256 entryFee);
    event PrizesDistributed(address winner, uint256 winnerPrize, uint256 creatorFee, uint256 platformFee);
    
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
        bytes32 _answersHash,
        uint256 _entryFee,
        address _platformWallet
    ) {
        require(_questionCount > 0 && _questionCount <= 32, "Invalid question count");
        require(_answersHash != bytes32(0), "Invalid answers hash");
        require(_entryFee > 0, "Entry fee must be greater than 0");

        creator = _creator;
        questionCount = _questionCount;
        answersHash = _answersHash;
        entryFee = _entryFee;
        platformWallet = _platformWallet;
    }

    /**
     * @dev Join quiz by paying entry fee
     */
    function joinQuiz() external payable {
        require(!isStarted, "Quiz already started");
        require(msg.value == entryFee, "Incorrect entry fee");
        require(!hasPaid[msg.sender], "Already joined");
        require(playerAddresses.length < 100, "Quiz is full");

        playerAddresses.push(msg.sender);
        playerIndexes[msg.sender] = playerAddresses.length;
        hasPaid[msg.sender] = true;
        prizePool += msg.value;

        emit PlayerJoined(msg.sender, msg.value);
    }

    /**
     * @dev Start quiz (only creator, minimum 2 players required)
     */
    function startQuiz() external onlyCreator {
        require(!isStarted, "Quiz already started");
        require(playerAddresses.length >= 2, "Minimum 2 players required");

        isStarted = true;
        startTime = block.timestamp;

        emit QuizStarted(startTime, playerAddresses.length, prizePool);
    }

    /**
     * @dev Submit all player answers
     */
    function submitAllAnswers(
        address[] calldata players,
        uint128[] calldata answers,
        uint128[] calldata scores
    ) external onlyCreator quizActive {
        require(players.length == answers.length && players.length == scores.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < players.length; i++) {
            require(playerIndexes[players[i]] > 0, "Player not registered");
            
            playerAnswers[players[i]] = PlayerAnswers({
                answers: answers[i],
                score: scores[i]
            });
        }
    }

    /**
     * @dev End quiz and distribute prizes
     */
    function endQuiz(
        string calldata correctAnswers,
        address _winner,
        uint256 _score
    ) external onlyCreator {
        require(isStarted && !isFinished, "Invalid quiz state");
        require(_score > 0 && _winner != address(0), "Invalid winner data");
        require(playerIndexes[_winner] > 0, "Winner not registered");
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

        emit QuizFinished(winner, winnersScore, prizePool);
        
        // Automatically distribute prizes
        _distributePrizes();
    }

    /**
     * @dev Internal function to distribute prizes
     */
    function _distributePrizes() private {
        require(!prizesDistributed, "Prizes already distributed");
        require(prizePool > 0, "No prize pool");

        uint256 winnerPrize = (prizePool * WINNER_PERCENTAGE) / 10000;
        uint256 creatorFee = (prizePool * CREATOR_PERCENTAGE) / 10000;
        uint256 platformFee = (prizePool * PLATFORM_PERCENTAGE) / 10000;

        prizesDistributed = true;

        // Transfer prizes
        (bool winnerSuccess,) = payable(winner).call{value: winnerPrize}("");
        (bool creatorSuccess,) = payable(creator).call{value: creatorFee}("");
        (bool platformSuccess,) = payable(platformWallet).call{value: platformFee}("");

        require(winnerSuccess && creatorSuccess && platformSuccess, "Prize transfer failed");

        emit PrizesDistributed(winner, winnerPrize, creatorFee, platformFee);
    }

    /**
     * @dev Get quiz results including prize info
     */
    function getQuizResults() external view quizEnded returns (
        address winnerAddress,
        uint256 winnerScore,
        uint256 totalPlayers,
        uint256 totalPrizePool,
        bool distributed
    ) {
        return (
            winner,
            winnersScore,
            playerAddresses.length,
            prizePool,
            prizesDistributed
        );
    }

    /**
     * @dev Get player results
     */
    function getPlayerResults(address player) external view quizEnded returns (
        uint128 answers,
        uint128 score,
        bool paidEntry
    ) {
        require(playerIndexes[player] > 0, "Player not found");
        PlayerAnswers memory playerData = playerAnswers[player];
        return (playerData.answers, playerData.score, hasPaid[player]);
    }

    /**
     * @dev Emergency refund (only if quiz hasn't started)
     */
    // function emergencyRefund() external onlyCreator {
    //     require(!isStarted, "Cannot refund after quiz started");
    //     require(prizePool > 0, "No funds to refund");

    //     uint256 refundAmount = prizePool / playerAddresses.length;
        
    //     for (uint256 i = 0; i < playerAddresses.length; i++) {
    //         if (hasPaid[playerAddresses[i]]) {
    //             (bool success,) = payable(playerAddresses[i]).call{value: refundAmount}("");
    //             require(success, "Refund failed");
    //         }
    //     }
        
    //     prizePool = 0;
    //     isFinished = true;
    // }

    /**
     * @dev Get basic quiz info
     */
    function getQuizInfo() external view returns (
        address creatorAddress,
        uint256 questions,
        bool started,
        bool finished,
        bytes32 quizAnswersHash,
        address[] memory players,
        uint256 fee,
        uint256 pool
    ) {
        return (
            creator,
            questionCount,
            isStarted,
            isFinished,
            answersHash,
            playerAddresses,
            entryFee,
            prizePool
        );
    }
}
