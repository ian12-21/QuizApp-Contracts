// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract QuizOriginal {

    address private creator;
    uint256 private questionCount;
    bytes32 private answersHash;
    
    address[] private playerAddresses;
    
    bool private isStarted;
    bool private isFinished;
    uint256 private startTime;

    address private winner = address(0);
    uint256 private winners_score = 0;
    
    uint256 private constant QUESTION_DURATION = 20 seconds;
    uint256 private constant AUTO_DESTROY_DELAY = 24 hours;
    
    event QuizStarted(uint256 startTime);
    event QuizFinished(address winner, uint256 score);
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator can call this");
        _;
    }
    
    modifier quizActive() {
        require(isStarted && !isFinished, "Quiz not active");
        _;
    }

    modifier quizEnded(){
        require(isFinished, "Quiz not finished");
        _;
    }

    constructor(
        address _creator,
        uint256 _questionCount,
        bytes32 _answersHash
    ) {
        require(questionCount > 0, "Invalid question count");
        require(answersHash != keccak256(""), "Invalid answers hash");

        creator = _creator;
        questionCount = _questionCount;
        answersHash = _answersHash;
    }

    function startQuiz(address[] calldata _playerAddresses) external onlyCreator {
        require(!isStarted, "Quiz already started");
        require(_playerAddresses.length > 0, "No players joined");

        playerAddresses = _playerAddresses;

        isStarted = true;
        startTime = block.timestamp;
        isFinished = false;

        emit QuizStarted(startTime);
    }
    
    function endQuiz(
        string calldata answers,
        address _winner,
        uint256 _score
    ) external onlyCreator {
        require(isStarted && !isFinished, "Invalid quiz state");
        require(_score != 0 && _winner != address(0), "Invalid data inputed");
        require(
            block.timestamp > startTime + (questionCount * QUESTION_DURATION),
            "Quiz still in progress"
        );
        require(
            keccak256(abi.encodePacked(answers)) == answersHash,
            "Invalid answers hash"
        );

        winner = _winner;
        winners_score = _score;
        
        isFinished = true;
        emit QuizFinished(winner, winners_score);
    }

    function getFinishedQuizData() external quizEnded view returns(address, uint256){
        require(isFinished, "Quiz not finished");
        require(winner != address(0), "Quiz not finished");
        return (winner, winners_score);
    }


}
