// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Quiz {
    struct Player {
        address playerAddress;
        uint256 score;
    }

    address public creator;
    uint256 public questionCount;
    
    mapping(address => Player) public players;
    address[] public playerAddresses;
    
    bytes32 public answersHash;
    
    bool public isStarted;
    bool public isFinished;
    uint256 public startTime;
    uint256 public currentQuestionIndex;
    
    uint256 public constant QUESTION_DURATION = 15 seconds;
    uint256 public constant AUTO_DESTROY_DELAY = 24 hours;
    
    event QuizStarted(uint256 startTime);
    event AnswerSubmitted(address player, uint256 questionIndex, bytes1 answer);
    event QuizFinished(address winner, uint256 score);
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator can call this");
        _;
    }
    
    modifier quizActive() {
        require(isStarted && !isFinished, "Quiz not active");
        _;
    }

    constructor(
        address _creator,
        uint256 _questionCount,
        bytes32 _answersHash
    ) {
        creator = _creator;
        questionCount = _questionCount;
        answersHash = _answersHash;

        require(questionCount > 0, "Invalid question count");
        require(answersHash != keccak256(""), "Invalid answers hash");
    }

    function startQuiz(address[] calldata _playerAddresses) external onlyCreator {
        require(!isStarted, "Quiz already started");
        
        playerAddresses = _playerAddresses;
        require(playerAddresses.length > 0, "No players joined");
        
        isStarted = true;
        startTime = block.timestamp;
        
        emit QuizStarted(startTime);
    }
    
    function CalculateWinner(
        string calldata answers,
        address[] calldata _players,
        uint256[] calldata _scores
    ) external onlyCreator returns (address) {
        require(isStarted && !isFinished, "Invalid quiz state");
        require(_players.length == _scores.length, "Arrays length mismatch");
        require(
            block.timestamp > startTime + (questionCount * QUESTION_DURATION),
            "Quiz still in progress"
        );
        require(
            keccak256(abi.encodePacked(answers)) == answersHash,
            "Invalid answers hash"
        );
        
        // Find winner from submitted scores
        address winner = address(0);
        uint256 highestScore = 0;
        
        // Only one loop needed, and it's O(n) where n is number of players
        for (uint i = 0; i < _players.length; i++) {
            
            uint256 score = _scores[i];
            // Store score for transparency
            players[_players[i]].score = score;
            
            if (score > highestScore) {
                highestScore = score;
                winner = _players[i];
            }
        }
        
        
        isFinished = true;
        emit QuizFinished(winner, highestScore);

        return address(winner);
    }
}
