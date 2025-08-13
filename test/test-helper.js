const { ethers } = require("hardhat");

// Helper function to advance time in tests
async function advanceTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
}

// Helper function to get current block timestamp
async function getCurrentTime() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
}

// Helper function to advance blocks
async function advanceBlocks(blocks) {
    for (let i = 0; i < blocks; i++) {
        await ethers.provider.send("evm_mine");
    }
}

// Helper function to fund multiple accounts
async function fundAccounts(funder, accounts, amount) {
    for (const account of accounts) {
        await funder.sendTransaction({
            to: account.address,
            value: amount
        });
    }
}

// Helper function to create quiz with players
async function setupQuizWithPlayers(Quiz, creator, players, questionCount = 5) {
    const correctAnswers = "12143";
    const answersHash = ethers.keccak256(ethers.toUtf8Bytes(correctAnswers));
    
    const quiz = await Quiz.deploy(creator.address, questionCount, answersHash);
    await quiz.waitForDeployment();
    
    const playerAddresses = players.map(p => p.address);
    await quiz.connect(creator).startQuiz(playerAddresses);
    
    return { quiz, answersHash, correctAnswers };
}

// Helper function to setup paid quiz with players
async function setupPaidQuizWithPlayers(QuizWithFee, creator, players, entryFee, platformWallet) {
    const correctAnswers = "12143";
    const answersHash = ethers.keccak256(ethers.toUtf8Bytes(correctAnswers));
    
    const quiz = await QuizWithFee.deploy(
        creator.address,
        5,
        answersHash,
        entryFee,
        platformWallet.address
    );
    await quiz.waitForDeployment();
    
    // Fund and join players
    for (const player of players) {
        await creator.sendTransaction({
            to: player.address,
            value: entryFee * 2n
        });
        await quiz.connect(player).joinQuiz({ value: entryFee });
    }
    
    return { quiz, answersHash, correctAnswers };
}

// Helper function to submit answers and end quiz
async function completeQuiz(quiz, creator, players, correctAnswers, winnerAddress, winnerScore) {
    const answers = players.map((_, i) => 0x12143 + i);
    const scores = players.map((_, i) => 100 - (i * 10));
    
    const playerAddresses = players.map(p => p.address);
    await quiz.connect(creator).submitAllAnswers(playerAddresses, answers, scores);
    
    await advanceTime(5 * 20); // 5 questions * 20 seconds each
    
    await quiz.connect(creator).endQuiz(correctAnswers, winnerAddress, winnerScore);
}

// Helper to parse quiz creation events
async function getQuizAddressFromTx(tx, factory, eventName = "QuizCreated") {
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
        try {
            return factory.interface.parseLog(log).name === eventName;
        } catch {
            return false;
        }
    });
    
    if (!event) {
        throw new Error(`${eventName} event not found`);
    }
    
    return factory.interface.parseLog(event).args.quizAddress;
}

// Helper to generate random addresses
function generateRandomAddresses(count) {
    return Array(count).fill().map(() => ethers.Wallet.createRandom().address);
}

// Helper to check if address is valid
function isValidAddress(address) {
    return ethers.isAddress(address);
}

module.exports = {
    advanceTime,
    getCurrentTime,
    advanceBlocks,
    fundAccounts,
    setupQuizWithPlayers,
    setupPaidQuizWithPlayers,
    completeQuiz,
    getQuizAddressFromTx,
    generateRandomAddresses,
    isValidAddress
};