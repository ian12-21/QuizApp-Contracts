// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;


/**
 * @title QuizFactory
 * @dev Enhanced factory for creating both types of quizzes
 */
contract QuizFactory {
    address public owner;
    
    event BasicQuizCreated(address indexed quizAddress, address indexed creator, uint256 questionCount);
    event PaidQuizCreated(address indexed quizAddress, address indexed creator, uint256 questionCount, uint256 entryFee);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    /**
     * @dev Create basic quiz (no fees)
     */
    function createBasicQuiz(
        uint256 questionCount,
        bytes32 answersHash
    ) external returns (address) {
        Quiz quiz = new Quiz(
            msg.sender,
            questionCount,
            answersHash
        );
        
        emit BasicQuizCreated(address(quiz), msg.sender, questionCount);
        return address(quiz);
    }

    /**
     * @dev Create paid quiz (with entry fees)
     */
    function createPaidQuiz(
        uint256 questionCount,
        bytes32 answersHash,
        uint256 entryFee
    ) external returns (address) {
        require(entryFee > 0, "Entry fee must be greater than 0");
        
        QuizWithFees quiz = new QuizWithFees(
            msg.sender,
            questionCount,
            answersHash,
            entryFee,
        );
        
        emit PaidQuizCreated(address(quiz), msg.sender, questionCount, entryFee);
        return address(quiz);
    }
}