const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Quiz Contract", function () {
    let Quiz, quiz;
    let creator, player1, player2, player3, nonPlayer;
    let answersHash;
    const QUESTION_COUNT = 5;
    const correctAnswers = "12143"; // Example correct answers

    beforeEach(async function () {
        [creator, player1, player2, player3, nonPlayer] = await ethers.getSigners();
        
        // Generate answers hash
        answersHash = ethers.keccak256(ethers.toUtf8Bytes(correctAnswers));
        
        Quiz = await ethers.getContractFactory("Quiz");
        quiz = await Quiz.deploy(creator.address, QUESTION_COUNT, answersHash);
        await quiz.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set correct initial values", async function () {
            const [creatorAddr, questions, started, finished, quizHash, players] = 
                await quiz.getQuizInfo();
            
            expect(creatorAddr).to.equal(creator.address);
            expect(questions).to.equal(QUESTION_COUNT);
            expect(started).to.be.false;
            expect(finished).to.be.false;
            expect(quizHash).to.equal(answersHash);
            expect(players).to.have.length(0);
        });

        it("Should revert with invalid parameters", async function () {
            await expect(
                Quiz.deploy(creator.address, 0, answersHash)
            ).to.be.revertedWith("Invalid question count (1-32)");

            await expect(
                Quiz.deploy(creator.address, 33, answersHash)
            ).to.be.revertedWith("Invalid question count (1-32)");

            await expect(
                Quiz.deploy(creator.address, QUESTION_COUNT, ethers.ZeroHash)
            ).to.be.revertedWith("Invalid answers hash");
        });
    });

    describe("Starting Quiz", function () {
        it("Should start quiz with valid players", async function () {
            const players = [player1.address, player2.address, player3.address];
            
            await expect(quiz.connect(creator).startQuiz(players))
                .to.emit(quiz, "QuizStarted");

            const [, , started, finished, , registeredPlayers] = await quiz.getQuizInfo();
            expect(started).to.be.true;
            expect(finished).to.be.false;
            expect(registeredPlayers).to.deep.equal(players);
        });

        it("Should revert if not creator", async function () {
            const players = [player1.address, player2.address];
            
            await expect(
                quiz.connect(player1).startQuiz(players)
            ).to.be.revertedWith("Only creator can call this");
        });

        it("Should revert if already started", async function () {
            const players = [player1.address, player2.address];
            
            await quiz.connect(creator).startQuiz(players);
            
            await expect(
                quiz.connect(creator).startQuiz(players)
            ).to.be.revertedWith("Quiz already started");
        });

        it("Should revert with no players", async function () {
            await expect(
                quiz.connect(creator).startQuiz([])
            ).to.be.revertedWith("No players joined");
        });

        it("Should revert with too many players", async function () {
            const players = Array(101).fill().map((_, i) => 
                ethers.Wallet.createRandom().address
            );
            
            await expect(
                quiz.connect(creator).startQuiz(players)
            ).to.be.revertedWith("Too many players");
        });
    });

    describe("Answer Submission", function () {
        let players;

        beforeEach(async function () {
            players = [player1.address, player2.address, player3.address];
            await quiz.connect(creator).startQuiz(players);
        });

        it("Should submit all answers correctly", async function () {
            const answers = [0x12143, 0x21434, 0x31241]; // Packed answers
            const scores = [100, 80, 60];

            await expect(
                quiz.connect(creator).submitAllAnswers(players, answers, scores)
            ).to.emit(quiz, "PlayerAnswersSubmitted");

            // Verify answers were stored
            for (let i = 0; i < players.length; i++) {
                // Note: getPlayerResults requires quiz to be ended first
            }
        });

        it("Should revert if not creator", async function () {
            const answers = [0x12143];
            const scores = [100];

            await expect(
                quiz.connect(player1).submitAllAnswers([player1.address], answers, scores)
            ).to.be.revertedWith("Only creator can call this");
        });

        it("Should revert if quiz not active", async function () {
            // Try before starting
            const newQuiz = await Quiz.deploy(creator.address, QUESTION_COUNT, answersHash);
            const answers = [0x12143];
            const scores = [100];

            await expect(
                newQuiz.connect(creator).submitAllAnswers([player1.address], answers, scores)
            ).to.be.revertedWith("Quiz not active");
        });

        it("Should revert with mismatched arrays", async function () {
            const answers = [0x12143, 0x21434];
            const scores = [100]; // Different length

            await expect(
                quiz.connect(creator).submitAllAnswers(players, answers, scores)
            ).to.be.revertedWith("Arrays length mismatch");
        });

        it("Should revert for unregistered player", async function () {
            const answers = [0x12143];
            const scores = [100];

            await expect(
                quiz.connect(creator).submitAllAnswers([nonPlayer.address], answers, scores)
            ).to.be.revertedWith("Player not registered");
        });
    });

    describe("Ending Quiz", function () {
        let players;

        beforeEach(async function () {
            players = [player1.address, player2.address, player3.address];
            await quiz.connect(creator).startQuiz(players);
            
            // Submit answers
            const answers = [0x12143, 0x21434, 0x31241];
            const scores = [100, 80, 60];
            await quiz.connect(creator).submitAllAnswers(players, answers, scores);
        });

        it("Should end quiz correctly", async function () {
            // Fast forward time to allow quiz to end
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]); // 20 seconds per question
            await ethers.provider.send("evm_mine");

            await expect(
                quiz.connect(creator).endQuiz(correctAnswers, player1.address, 100)
            ).to.emit(quiz, "QuizFinished")
            .withArgs(player1.address, 100);

            const [winnerAddr, winnerScore, totalPlayers, endTime] = 
                await quiz.getQuizResults();
            
            expect(winnerAddr).to.equal(player1.address);
            expect(winnerScore).to.equal(100);
            expect(totalPlayers).to.equal(3);
        });

        it("Should revert if not creator", async function () {
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");

            await expect(
                quiz.connect(player1).endQuiz(correctAnswers, player1.address, 100)
            ).to.be.revertedWith("Only creator can call this");
        });

        it("Should revert with invalid winner data", async function () {
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");

            await expect(
                quiz.connect(creator).endQuiz(correctAnswers, ethers.ZeroAddress, 100)
            ).to.be.revertedWith("Invalid winner data");

            await expect(
                quiz.connect(creator).endQuiz(correctAnswers, player1.address, 0)
            ).to.be.revertedWith("Invalid winner data");
        });

        it("Should revert if winner not registered", async function () {
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");

            await expect(
                quiz.connect(creator).endQuiz(correctAnswers, nonPlayer.address, 100)
            ).to.be.revertedWith("Winner not a registered player");
        });

        it("Should revert if quiz still in progress", async function () {
            await expect(
                quiz.connect(creator).endQuiz(correctAnswers, player1.address, 100)
            ).to.be.revertedWith("Quiz still in progress");
        });

        it("Should revert with invalid answers hash", async function () {
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");

            await expect(
                quiz.connect(creator).endQuiz("wrong", player1.address, 100)
            ).to.be.revertedWith("Invalid answers hash");
        });

        it("Should revert if already finished", async function () {
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");

            await quiz.connect(creator).endQuiz(correctAnswers, player1.address, 100);

            await expect(
                quiz.connect(creator).endQuiz(correctAnswers, player2.address, 80)
            ).to.be.revertedWith("Invalid quiz state");
        });
    });

    describe("Results and Info", function () {
        let players;

        beforeEach(async function () {
            players = [player1.address, player2.address, player3.address];
            await quiz.connect(creator).startQuiz(players);
            
            const answers = [0x12143, 0x21434, 0x31241];
            const scores = [100, 80, 60];
            await quiz.connect(creator).submitAllAnswers(players, answers, scores);
            
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");
            
            await quiz.connect(creator).endQuiz(correctAnswers, player1.address, 100);
        });

        it("Should get player results correctly", async function () {
            const [answers, score] = await quiz.getPlayerResults(player1.address);
            expect(answers).to.equal(0x12143);
            expect(score).to.equal(100);
        });

        it("Should revert getting results for non-existent player", async function () {
            await expect(
                quiz.getPlayerResults(nonPlayer.address)
            ).to.be.revertedWith("Player not found");
        });

        it("Should get all players", async function () {
            const allPlayers = await quiz.getAllPlayers();
            expect(allPlayers).to.deep.equal(players);
        });

        it("Should revert getting results before quiz ends", async function () {
            const newQuiz = await Quiz.deploy(creator.address, QUESTION_COUNT, answersHash);
            
            await expect(
                newQuiz.getQuizResults()
            ).to.be.revertedWith("Quiz not finished");
        });
    });
});