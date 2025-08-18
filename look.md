# QuizApp-Contracts: Architecture & Workflow Overview

This document explains the structure, core features, and workflow of the **QuizApp-Contracts** project, which contains all smart contracts for the decentralized Quiz application.

---

## Overview

QuizApp-Contracts consists of three main smart contracts:

1. **Quiz.sol**: Basic quiz contract for free quizzes with participant management and scoring.
2. **QuizWithFee.sol**: Advanced quiz contract with entry fees, prize pools, and automatic prize distribution.
3. **QuizFactory.sol**: Factory contract that creates instances of both quiz types.

---

## Core Features

### Core Features
- **Dual Quiz Types**: Support for both free (basic) and paid quizzes with entry fees
- **Secure Answer Validation**: Answers stored as cryptographic hashes to prevent cheating
- **Time-based Constraints**: 20-second duration per question with automatic timing enforcement
- **Player Management**: Efficient player registration and lookup systems
- **Prize Distribution**: Automatic prize distribution for paid quizzes (80% winner, 5% creator, 15% platform)
- **Gas Optimization**: Packed data structures and efficient storage patterns

### Advanced Features
- **Batch Answer Submission**: Submit all player answers in a single transaction
- **Emergency Controls**: Built-in safety mechanisms and state validation
- **Event Logging**: Comprehensive event emission for off-chain tracking
- **Scalability**: Support for up to 100 players per quiz and 32 questions maximum

---

## Smart Contract Architecture

### Quiz Contract (Basic)
Manages free quizzes with the following lifecycle:

- **Initialization**: Created with creator address, question count (1-32), and answers hash
- **Player Registration**: Creator adds participants before starting
- **Quiz Execution**: 20-second time limit per question with state validation
- **Answer Submission**: Batch submission of player answers with packed data storage
- **Quiz Completion**: Winner is determined securely with answer hash verification
- **Results Retrieval**: Access to player scores, answers, and quiz metadata

**Key Functions:**
- `startQuiz(address[] playerAddresses)`
- `submitAllAnswers(address[], uint128[], uint128[])`
- `endQuiz(string correctAnswers, address winner, uint256 score)`
- `getQuizResults()`
- `getPlayerResults(address player)`

### QuizWithFee Contract (Advanced)
Extends the basic contract with economic incentives:

- **Entry Fee System**: Players pay to join, creating a prize pool
- **Prize Distribution**: 
    - Winner: 80% 
    - Creator: 5% 
    - Platform: 15%
- **Minimum Players**: At least 2 players required to start
- **Payment Validation**: Ensures correct entry fee payment
- **Prize Security**: Secure fund handling, failure protection

**Key Functions:**
- `joinQuiz()`
- `startQuiz()`
- `endQuiz()`
- `getQuizResults()`

### QuizFactory Contract
- **Dual Creation**: Supports both basic and paid quiz creation
- **Event Tracking**: Emits events for easy indexing and monitoring
- **Parameter Validation**: Ensures valid quiz parameters before deployment
- **Platform Integration**: Manages platform wallet for fee collection

**Key Functions:**
- `createBasicQuiz(uint256 questionCount, bytes32 answersHash)`
- `createPaidQuiz(uint256 questionCount, bytes32 answersHash, uint256 entryFee)`

---

## Contract Workflow Diagram

```mermaid
flowchart TD
  F[QuizFactory]
  Q1[Quiz (free)]
  Q2[QuizWithFee (paid)]
  User -- "deploys via" --> F
  F -- "deploys" --> Q1
  F -- "deploys" --> Q2
  User -- "joins/starts/answers" --> Q1
  User -- "joins/starts/answers" --> Q2
  Q2 -- "prize distribution" --> Winner
  Q2 -- "prize distribution" --> Creator
  Q2 -- "prize distribution" --> Platform
```

---

## Usage Example

```javascript
// 1. Deploy QuizFactory
const QuizFactory = await ethers.getContractFactory("QuizFactory");
const factory = await QuizFactory.deploy();

// 2. Create answers hash
const answers = "1,3,2,4,1";
const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answers));

// 3. Create basic quiz
const tx = await factory.createBasicQuiz(5, answersHash);
const receipt = await tx.wait();

// 4. Get quiz address
const quizAddress = receipt.logs[0].args.quizAddress;
```

---

## Technical Limits

- **Maximum Questions**: 32 per quiz
- **Maximum Players**: 100 per quiz  
- **Question Duration**: 20 seconds each
- **Answer Format**: 4-bit packed answers (0-15 values)

---

## Security Considerations

- **Hash Validation**: Correct answers stored as hashes prevent tampering
- **Batch Submission**: Prevents front-running
- **Strict Access Control**: Only quiz creators can perform sensitive operations
- **Prize Security**: Secure fund transfers & reentrancy protection

---

*For more technical information, see the [README.md](./README.md) in the repository.*
