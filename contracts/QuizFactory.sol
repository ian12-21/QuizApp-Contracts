// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Quiz.sol";

contract QuizFactory {
    event QuizCreated(address quizAddress);

    function createQuiz(
        uint256 questionCount,
        bytes32 answersHash //to check answers before and after
    ) external returns (address) {
        
        Quiz quiz = new Quiz(
            msg.sender,
            questionCount,
            answersHash
        );
    
        emit QuizCreated(address(quiz));
        return address(quiz);
    }
}