// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/Quiz.sol";

/**
 * @title QuizTestData
 * @dev Test data and helper functions for testing Quiz contract in Remix IDE
 */
contract QuizTestData {
    Quiz public quiz;
    
    // Test data
    address public creator = 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4; // First Remix account
    uint256 public questionCount = 5;
    bytes32 public answersHash = keccak256(abi.encodePacked("13021")); // Hash of correct answers
    
    // Test player addresses (use Remix accounts)
    address[] public testPlayers = [
        0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2, // Account 2
        0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db, // Account 3
        0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB, // Account 4
        0x617F2E2fD72FD9D5503197092aC168c91465E7f2  // Account 5
    ];
    
    // Test answer strings
    string[] public testAnswerStrings = [
        "13021",    // Player 1: all correct answers
        "13020",    // Player 2: 4 correct, 1 wrong
        "1302-1",   // Player 3: 4 correct, 1 missing
        "00000"     // Player 4: all wrong
    ];
    
    // Test scores
    uint128[] public testScores = [5, 4, 4, 0];
    
    constructor() {
        // Deploy Quiz contract with test data
        quiz = new Quiz(creator, questionCount, answersHash);
    }
    
    /**
     * @dev Get test data for manual testing in Remix
     */
    function getTestData() external view returns (
        address creatorAddr,
        uint256 questions,
        bytes32 correctAnswersHash,
        address[] memory players,
        string[] memory answerStrings,
        uint128[] memory scores
    ) {
        return (
            creator,
            questionCount,
            answersHash,
            testPlayers,
            testAnswerStrings,
            testScores
        );
    }
    
    /**
     * @dev Get individual test player data
     */
    function getPlayerTestData(uint256 index) external view returns (
        address playerAddr,
        string memory answerString,
        uint128 score
    ) {
        require(index < testPlayers.length, "Invalid player index");
        return (
            testPlayers[index],
            testAnswerStrings[index],
            testScores[index]
        );
    }
    
    /**
     * @dev Helper to get the deployed quiz address
     */
    function getQuizAddress() external view returns (address) {
        return address(quiz);
    }
}
