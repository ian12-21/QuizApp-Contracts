// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract QuizFactory {
    
    event QuizCreated(
        address indexed quizAddress, 
        address indexed creator,
        uint256 questionCount,
        uint256 entryFee
    );
    
    function createQuiz(
        uint256 _questionCount,
        bytes32 _correctAnswersHash,
        uint256 _entryFee
    ) external returns (address) {

        Quiz quiz = new Quiz(
            msg.sender,
            _questionCount,
            _correctAnswersHash,
            _entryFee
        );

        emit QuizCreated(address(quiz), msg.sender, _questionCount, _entryFee);
        return address(quiz);
    }
    

}