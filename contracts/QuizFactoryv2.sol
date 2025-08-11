// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Quiz.sol";

contract QuizFactory {
    
    event QuizCreated(
        address indexed quizAddress,
        address indexed creator,
        uint256 questionCount,
        uint256 createdAt
    );

    function createQuiz(
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

        emit QuizCreated(address(quiz), msg.sender, questionCount, block.timestamp);
        return address(quiz);
    }

}
