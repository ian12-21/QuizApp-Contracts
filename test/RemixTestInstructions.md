# Quiz Contract Testing in Remix IDE

## Setup Instructions

1. **Deploy the contracts in this order:**
   - First deploy `Quiz.sol`
   - Then deploy `QuizTestData.sol` (it will automatically deploy a Quiz instance)

## Test Data Overview

### Quiz Parameters
- **Creator**: `0xa95BcDFEc541Ead7793F8857751Ebb0f2060F442` (Account 1)
- **Question Count**: `5`
- **Correct Answers**: `"13021"`
- **Answers Hash**: `keccak256("13021")`

### Test Players & Data
| Player   | Address                                      | Answer String | Score | Description |
|--------  |----------------------------------------------|---------------|-------|-------------|
| Player 1 | `0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2` | `"13021"`     | `5`   | All correct |
| Player 2 | `0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db` | `"13020"`     | `4`   | 4 correct, 1 wrong |
| Player 3 | `0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB` | `"1302-1"`    | `4`   | 4 correct, 1 missing |
| Player 4 | `0x617F2E2fD72FD9D5503197092aC168c91465E7f2` | `"00000"`     | `0`   | All wrong |

## Step-by-Step Testing

### 1. Deploy and Get Quiz Info
```solidity
// Call getQuizInfo() - should return:
// creator, questionCount=5, started=false, finished=false, answersHash, empty players array
```

### 2. Start Quiz
```solidity
// Switch to creator account (Account 1)
// Call startQuiz with player addresses:
address[] memory players = [
    0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2,
    0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db,
    0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB,
    0x617F2E2fD72FD9D5503197092aC168c91465E7f2
];
```

### 3. Submit All Answers
```solidity
// Call submitAllAnswers with:
address[] memory players = [/* same as above */];
string[] memory answers = ["13021", "13020", "1302-1", "00000"];
uint128[] memory scores = [5, 4, 4, 0];
```

### 4. End Quiz
```solidity
// Call endQuiz with:
// correctAnswers: "13021"
// winner: 0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2 (Player 1)
// score: 5
```

### 5. Test Results
```solidity
// Call getQuizResults() - should return:
// winner address, score=5, totalPlayers=4, quizEndTime

// Call getPlayerResults for each player:
// Player 1: ("13021", 5)
// Player 2: ("13020", 4)  
// Player 3: ("1302-1", 4)
// Player 4: ("00000", 0)
```

## Expected Behaviors

### ✅ Should Work
- Deploy contract with valid parameters
- Start quiz with 2+ players
- Submit answers as strings
- End quiz with correct hash
- Retrieve player results after quiz ends

### ❌ Should Fail
- Start quiz with < 2 players
- Submit answers when not creator
- End quiz with wrong answers hash
- Get player results before quiz ends
- Call functions from wrong account

## Helper Functions

Use `QuizTestData.sol` helper functions:
- `getTestData()` - Get all test data at once
- `getPlayerTestData(index)` - Get specific player data
- `getQuizAddress()` - Get deployed quiz address

## Gas Optimization Notes

- String storage is more expensive than uint128
- Consider the trade-off between readability and gas costs
- Test with different answer string lengths
