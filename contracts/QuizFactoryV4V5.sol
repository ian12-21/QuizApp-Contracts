// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;


/**
 * @title QuizFactory
 * @dev Enhanced factory for creating both types of quizzes
 */
contract QuizFactory {
    address public owner;
    address public platformWallet;
    
    Quiz[] public basicQuizzes;
    QuizWithFees[] public paidQuizzes;
    
    mapping(address => Quiz[]) public userBasicQuizzes;
    mapping(address => QuizWithFees[]) public userPaidQuizzes;
    
    event BasicQuizCreated(address indexed quizAddress, address indexed creator, uint256 questionCount);
    event PaidQuizCreated(address indexed quizAddress, address indexed creator, uint256 questionCount, uint256 entryFee);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor(address _platformWallet) {
        owner = msg.sender;
        platformWallet = _platformWallet;
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
        
        basicQuizzes.push(quiz);
        userBasicQuizzes[msg.sender].push(quiz);
        
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
            platformWallet
        );
        
        paidQuizzes.push(quiz);
        userPaidQuizzes[msg.sender].push(quiz);
        
        emit PaidQuizCreated(address(quiz), msg.sender, questionCount, entryFee);
        return address(quiz);
    }

    /**
     * @dev Get all basic quizzes created by user
     */
    function getUserBasicQuizzes(address user) external view returns (Quiz[] memory) {
        return userBasicQuizzes[user];
    }

    /**
     * @dev Get all paid quizzes created by user
     */
    function getUserPaidQuizzes(address user) external view returns (QuizWithFees[] memory) {
        return userPaidQuizzes[user];
    }

    /**
     * @dev Get total number of quizzes
     */
    function getTotalQuizzes() external view returns (uint256 basic, uint256 paid) {
        return (basicQuizzes.length, paidQuizzes.length);
    }

    /**
     * @dev Update platform wallet (only owner)
     */
    function updatePlatformWallet(address newPlatformWallet) external onlyOwner {
        require(newPlatformWallet != address(0), "Invalid platform wallet");
        platformWallet = newPlatformWallet;
    }
}