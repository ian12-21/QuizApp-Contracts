# QuizApp-Contracts

A comprehensive decentralized quiz application built on Ethereum blockchain using Solidity smart contracts. This project enables the creation and management of both free and paid quizzes with transparent prize distribution and tamper-proof functionality.

## Overview

QuizApp-Contracts consists of three main smart contracts:

1. **Quiz.sol**: Basic quiz contract for free quizzes with participant management and scoring.
2. **QuizWithFee.sol**: Advanced quiz contract with entry fees, prize pools, and automatic prize distribution.
3. **QuizFactory.sol**: Factory contract that creates instances of both quiz types.

## Features

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

## Smart Contract Architecture

### Quiz Contract (Basic)

The basic Quiz contract manages free quizzes with the following lifecycle:

- **Initialization**: Created with creator address, question count (1-32), and answers hash
- **Player Registration**: Creator adds participants before starting
- **Quiz Execution**: 20-second time limit per question with state validation
- **Answer Submission**: Batch submission of player answers with packed data storage
- **Quiz Completion**: Secure winner determination with answer hash verification
- **Results Retrieval**: Access to player scores, answers, and quiz metadata

**Key Functions:**
- `startQuiz(address[] playerAddresses)`: Start quiz with registered players
- `submitAllAnswers(address[], uint128[], uint128[])`: Submit all player responses
- `endQuiz(string correctAnswers, address winner, uint256 score)`: End quiz and set winner
- `getQuizResults()`: Retrieve final quiz results
- `getPlayerResults(address player)`: Get individual player performance

### QuizWithFee Contract (Advanced)

The paid quiz contract extends basic functionality with economic incentives:

- **Entry Fee System**: Players pay to join, creating a prize pool
- **Prize Distribution**: Automatic distribution upon quiz completion
  - Winner: 80% of prize pool
  - Creator: 5% of prize pool  
  - Platform: 15% of prize pool
- **Minimum Players**: Requires at least 2 players to start
- **Payment Validation**: Ensures correct entry fee payment
- **Prize Security**: Secure fund handling with failure protection

**Key Functions:**
- `joinQuiz()`: Pay entry fee to join quiz (payable)
- `startQuiz()`: Start quiz when minimum players reached
- `endQuiz()`: End quiz and automatically distribute prizes
- `getQuizResults()`: Get results including prize information

### QuizFactory Contract

Factory contract for creating quiz instances:

- **Dual Creation**: Support for both basic and paid quiz creation
- **Event Tracking**: Emits events for easy indexing and monitoring
- **Parameter Validation**: Ensures valid quiz parameters before deployment
- **Platform Integration**: Manages platform wallet for fee collection

**Key Functions:**
- `createBasicQuiz(uint256 questionCount, bytes32 answersHash)`: Create free quiz
- `createPaidQuiz(uint256 questionCount, bytes32 answersHash, uint256 entryFee)`: Create paid quiz

## Testing Suite

The project includes a comprehensive testing suite with multiple test files covering different aspects:

### Test Files Structure

- **`ComprehensiveQuiz.test.ts`**: Complete integration tests covering all contract interactions
- **`BasicQuiz.test.ts`**: Focused tests for basic quiz functionality
- **`Quiz.test.js`**: Core quiz contract tests
- **`QuizFactory.test.js`**: Factory contract creation and validation tests
- **`QuizWithFee.test.js`**: Paid quiz functionality and prize distribution tests
- **`test-config.js`**: Shared test configuration and constants
- **`test-helper.js`**: Common test utilities and helper functions

### Test Coverage Areas

- **Contract Creation**: Factory contract quiz creation with parameter validation
- **Player Management**: Registration, validation, and edge cases
- **Quiz Lifecycle**: Start, execution, timing constraints, and completion
- **Answer Submission**: Batch processing, validation, and security
- **Prize Distribution**: Fee collection, prize calculation, and secure transfers
- **Security Testing**: Access control, state validation, and error handling
- **Integration Testing**: Multiple concurrent quizzes and system interactions

## Getting Started

### Prerequisites

- Node.js (v16+) and npm
- Hardhat development environment
- Ethereum wallet for testing (MetaMask recommended)

### Installation

```shell
# Clone the repository
git clone https://github.com/yourusername/QuizApp-Contracts.git
cd QuizApp-Contracts

# Install dependencies
npm install
```

### Development Commands

```shell
# Compile contracts
npx hardhat compile

# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/ComprehensiveQuiz.test.ts

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost

# Generate gas reports
REPORT_GAS=true npx hardhat test

# Check test coverage
npx hardhat coverage
```

## Usage Examples

### Creating a Basic Quiz

```javascript
// 1. Deploy QuizFactory
const QuizFactory = await ethers.getContractFactory("QuizFactory");
const factory = await QuizFactory.deploy();

// 2. Create answers hash
const answers = "1,3,2,4,1"; // Correct answers for 5 questions
const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answers));

// 3. Create basic quiz
const tx = await factory.createBasicQuiz(5, answersHash);
const receipt = await tx.wait();

// 4. Get quiz address from event
const quizAddress = receipt.logs[0].args.quizAddress;
```

### Creating a Paid Quiz

```javascript
// 1. Set entry fee (0.01 ETH)
const entryFee = ethers.parseEther("0.01");

// 2. Create paid quiz
const tx = await factory.createPaidQuiz(5, answersHash, entryFee);
const receipt = await tx.wait();

// 3. Players join by paying entry fee
const QuizWithFee = await ethers.getContractFactory("QuizWithFee");
const quiz = QuizWithFee.attach(quizAddress);

await quiz.connect(player1).joinQuiz({ value: entryFee });
await quiz.connect(player2).joinQuiz({ value: entryFee });
```

### Running a Complete Quiz

```javascript
// 1. Start the quiz (creator only)
await quiz.connect(creator).startQuiz();

// 2. Submit all player answers (after quiz completion)
const playerAddresses = [player1.address, player2.address];
const packedAnswers = [0x13241, 0x12341]; // Packed answer format
const scores = [85, 92];

await quiz.connect(creator).submitAllAnswers(
    playerAddresses, 
    packedAnswers, 
    scores
);

// 3. End quiz and distribute prizes
await quiz.connect(creator).endQuiz(answers, player2.address, 92);

// 4. Retrieve results
const [winner, score, totalPlayers, prizePool] = await quiz.getQuizResults();
```

## Security Considerations

### Answer Security
- **Hash Validation**: Correct answers stored as cryptographic hashes prevent tampering
- **Batch Submission**: All answers submitted together to prevent front-running
- **Time Constraints**: Automatic timing enforcement prevents manipulation

### Access Control
- **Creator Privileges**: Only quiz creators can start, submit answers, and end quizzes
- **State Validation**: Strict state machine prevents invalid transitions
- **Player Verification**: Only registered players can participate

### Financial Security
- **Secure Transfers**: Prize distribution uses secure transfer patterns
- **Reentrancy Protection**: Built-in protection against reentrancy attacks
- **Fee Validation**: Entry fee validation prevents payment manipulation

### Gas Optimization
- **Packed Storage**: Efficient data packing reduces gas costs
- **Batch Operations**: Multiple operations combined to minimize transactions
- **Player Limits**: Maximum player limits prevent gas limit issues

## Contract Specifications

### Technical Limits
- **Maximum Questions**: 32 per quiz
- **Maximum Players**: 100 per quiz  
- **Question Duration**: 20 seconds each
- **Answer Format**: 4-bit packed answers (0-15 values)

### Prize Distribution (Paid Quizzes)
- **Winner**: 80% of prize pool
- **Creator**: 5% of prize pool
- **Platform**: 15% of prize pool

## License

This project is licensed under the MIT License - see the LICENSE file for details.
