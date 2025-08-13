// Test configuration and constants
const { ethers } = require("hardhat");

module.exports = {
    // Test constants
    CONSTANTS: {
        QUESTION_COUNT: 5,
        MAX_QUESTIONS: 32,
        MAX_PLAYERS: 100,
        MIN_PLAYERS_PAID: 2,
        QUESTION_DURATION: 20, // seconds
        ENTRY_FEE: ethers.parseEther("0.01"),
        LARGE_ENTRY_FEE: ethers.parseEther("1.0"),
        SMALL_ENTRY_FEE: ethers.parseEther("0.001"),
        CORRECT_ANSWERS: "12143",
    },

    // Prize percentages (in basis points)
    PERCENTAGES: {
        WINNER: 8000,    // 80%
        CREATOR: 500,    // 5%
        PLATFORM: 1500,  // 15%
        TOTAL: 10000     // 100%
    },

    // Test data generators
    generateAnswersHash: (answers) => {
        return ethers.keccak256(ethers.toUtf8Bytes(answers));
    },

    generatePackedAnswers: (count) => {
        return Array(count).fill().map((_, i) => 0x12143 + i);
    },

    generateScores: (count, baseScore = 100) => {
        return Array(count).fill().map((_, i) => baseScore - (i * 10));
    },

    // Common test scenarios
    SCENARIOS: {
        BASIC_QUIZ: {
            questionCount: 5,
            answers: "12143",
            players: 3
        },
        PAID_QUIZ: {
            questionCount: 5,
            answers: "12143",
            players: 3,
            entryFee: ethers.parseEther("0.01")
        },
        MAX_QUESTIONS: {
            questionCount: 32,
            answers: "1234567890123456789012345678901234567890", // 32 chars
            players: 2
        },
        MAX_PLAYERS: {
            questionCount: 5,
            answers: "12143",
            players: 100
        }
    },

    // Error messages
    ERRORS: {
        ONLY_CREATOR: "Only creator can call this",
        QUIZ_NOT_ACTIVE: "Quiz not active",
        QUIZ_NOT_FINISHED: "Quiz not finished",
        INVALID_QUESTION_COUNT: "Invalid question count (1-32)",
        INVALID_ANSWERS_HASH: "Invalid answers hash",
        QUIZ_ALREADY_STARTED: "Quiz already started",
        NO_PLAYERS: "No players joined",
        TOO_MANY_PLAYERS: "Too many players",
        ARRAYS_LENGTH_MISMATCH: "Arrays length mismatch",
        PLAYER_NOT_REGISTERED: "Player not registered",
        INVALID_QUIZ_STATE: "Invalid quiz state",
        INVALID_WINNER_DATA: "Invalid winner data",
        WINNER_NOT_REGISTERED: "Winner not a registered player",
        QUIZ_IN_PROGRESS: "Quiz still in progress",
        INVALID_ANSWERS_HASH_END: "Invalid answers hash",
        PLAYER_NOT_FOUND: "Player not found",
        INCORRECT_ENTRY_FEE: "Incorrect entry fee",
        ALREADY_JOINED: "Already joined",
        QUIZ_FULL: "Quiz is full",
        MIN_PLAYERS_REQUIRED: "Minimum 2 players required",
        ENTRY_FEE_ZERO: "Entry fee must be greater than 0"
    }
};