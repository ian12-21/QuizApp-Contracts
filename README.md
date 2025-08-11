# QuizApp-Contracts

A decentralized quiz application built on Ethereum blockchain using Solidity smart contracts. This project enables the creation and management of quizzes in a transparent and tamper-proof manner.

## Overview

QuizApp-Contracts consists of two main smart contracts:

1. **Quiz.sol**: Manages individual quiz instances including questions, answers, participants, and scoring.
2. **QuizFactory.sol**: Factory contract that creates new Quiz instances.

## Features

- **Quiz Creation**: Create quizzes with a specified number of questions and secure answer validation.
- **Participant Management**: Add participants to a quiz before starting.
- **Secure Answer Validation**: Answers are stored as a hash to ensure integrity.
- **Quiz Lifecycle Management**: Start, run, and end quizzes with proper state validation.
- **Winner Determination**: Securely record and verify quiz winners and scores.
- **Time-based Constraints**: Quizzes have time limits for questions.

## Smart Contract Details

### Quiz Contract

The Quiz contract manages the entire lifecycle of a quiz:

- **Creation**: Initialized with creator address, question count, and answers hash.
- **Starting**: Only the creator can start a quiz with a list of participants.
- **Ending**: Creator ends the quiz by providing the correct answers, winner, and score.
- **Data Retrieval**: Get information about finished quizzes.

### QuizFactory Contract

The QuizFactory contract is responsible for creating new Quiz instances:

- **Quiz Creation**: Creates a new Quiz contract with the specified parameters.
- **Event Emission**: Emits events when new quizzes are created for easy tracking.

## Getting Started

### Prerequisites

- Node.js and npm
- Hardhat development environment

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

# Run tests
npx hardhat test

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost

# Generate gas reports
REPORT_GAS=true npx hardhat test
```

## Usage Example

1. Deploy the QuizFactory contract
2. Create a new quiz with `createQuiz(questionCount, answersHash)`
3. Start the quiz with `startQuiz(playerAddresses)`
4. After the quiz completes, end it with `endQuiz(answers, winner, score)`
5. Retrieve quiz results with `getFinishedQuizData()`

## Security Considerations

- Answer validation is done through hash comparison to prevent cheating
- Only the quiz creator can start or end a quiz
- Time constraints ensure quizzes follow a predetermined schedule
- State validation prevents improper quiz lifecycle management

## License

This project is licensed under the MIT License - see the LICENSE file for details.
