// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Quiz.sol";
import "./QuizWithFee.sol";

/**
 * @title QuizFactory
 * @dev Enhanced factory for creating both types of quizzes
 */
contract QuizFactory {
    address public platformWallet;

    event QuizCreated(address indexed quizAddress, address indexed creator, uint256 questionCount);
    event FeeQuizCreated(address indexed quizAddress, address indexed creator, uint256 questionCount, uint256 entryFee);
    
    modifier onlyPlatformWallet() {
        require(msg.sender == platformWallet, "Only platform wallet can call this");
        _;
    }

    constructor() {
        platformWallet = msg.sender;
    }

    /**
     * @dev Create basic quiz (no fees)
     */
    function createBasicQuiz(
        uint256 questionCount,
        bytes32 answersHash
    ) external returns (address) {
        require(questionCount > 0, "Invalid question count");
        require(answersHash != keccak256(""), "Invalid answers hash");

        Quiz quiz = new Quiz(
            msg.sender,
            questionCount,
            answersHash
        );
        
        emit QuizCreated(address(quiz), msg.sender, questionCount);
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
        require(questionCount > 0, "Invalid question count");
        require(answersHash != keccak256(""), "Invalid answers hash");
        
        QuizWithFee quiz = new QuizWithFee(
            msg.sender,
            questionCount,
            answersHash,
            entryFee,
            platformWallet
        );
        
        emit FeeQuizCreated(address(quiz), msg.sender, questionCount, entryFee);
        return address(quiz);
    }

    //functions for collecting fee's when user creates a quiz
    // function collectFees() external onlyPlatformWallet {
    //     payable(platformWallet).transfer(address(this).balance);
    // }
}