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
            ).to.be.revertedWith("Invalid question count (1-50)");

            await expect(
                Quiz.deploy(creator.address, 51, answersHash)
            ).to.be.revertedWith("Invalid question count (1-50)");

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
            ).to.be.revertedWith("Minimum 2 players required to start");
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
            const answers = ["12143", "21434", "31241"]; // String answers
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
            const answers = ["12143"];
            const scores = [100];

            await expect(
                quiz.connect(player1).submitAllAnswers([player1.address], answers, scores)
            ).to.be.revertedWith("Only creator can call this");
        });

        it("Should revert if quiz not active", async function () {
            // Try before starting
            const newQuiz = await Quiz.deploy(creator.address, QUESTION_COUNT, answersHash);
            const answers = ["12143"];
            const scores = [100];

            await expect(
                newQuiz.connect(creator).submitAllAnswers([player1.address], answers, scores)
            ).to.be.revertedWith("Quiz not active");
        });

        it("Should revert with mismatched arrays", async function () {
            const answers = ["12143", "21434"];
            const scores = [100]; // Different length

            await expect(
                quiz.connect(creator).submitAllAnswers(players, answers, scores)
            ).to.be.revertedWith("Arrays length mismatch");
        });

        it("Should revert for unregistered player", async function () {
            const answers = ["12143", "21434", "31241"];
            const scores = [100, 80, 60];

            await expect(
                quiz.connect(creator).submitAllAnswers([nonPlayer.address, player1.address, player2.address], answers, scores)
            ).to.be.revertedWith("Player not registered");
        });
    });

    describe("Ending Quiz", function () {
        let players;

        beforeEach(async function () {
            players = [player1.address, player2.address, player3.address];
            await quiz.connect(creator).startQuiz(players);
            
            // Submit answers
            const answers = ["12143", "21434", "31241"];
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
            
            const answers = ["12143", "21434", "31241"];
            const scores = [100, 80, 60];
            await quiz.connect(creator).submitAllAnswers(players, answers, scores);
            
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");
            
            await quiz.connect(creator).endQuiz(correctAnswers, player1.address, 100);
        });

        it("Should get player results correctly", async function () {
            const [answers, score] = await quiz.getPlayerResults(player1.address);
            expect(answers).to.equal("12143");
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

    describe("Answer String Validation", function () {
        it("Should validate correct answer string and reject incorrect ones", async function () {
            // Create a specific answer string for testing (length must match QUESTION_COUNT = 5)
            const testAnswers = "31425"; // 5 characters for 5 questions
            const testAnswersHash = ethers.keccak256(ethers.toUtf8Bytes(testAnswers));
            
            // Deploy quiz with the test answer hash
            const testQuiz = await Quiz.deploy(creator.address, QUESTION_COUNT, testAnswersHash);
            await testQuiz.waitForDeployment();
            
            // Start quiz with players
            const players = [player1.address, player2.address];
            await testQuiz.connect(creator).startQuiz(players);
            
            // Submit answers
            const answers = ["12143", "21434"];
            const scores = [100, 80];
            await testQuiz.connect(creator).submitAllAnswers(players, answers, scores);
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");
            
            // Test with wrong answer string (correct length but wrong content) - should fail
            const wrongAnswers = "12143"; // Same length but different content
            await expect(
                testQuiz.connect(creator).endQuiz(wrongAnswers, player1.address, 100)
            ).to.be.revertedWith("Invalid answers hash");
            
            // Test with wrong length answer string - should fail with length mismatch
            const wrongLengthAnswers = "123"; // Too short
            await expect(
                testQuiz.connect(creator).endQuiz(wrongLengthAnswers, player1.address, 100)
            ).to.be.revertedWith("Length mismatch");
            
            // Test with another wrong length - should fail with length mismatch
            const tooLongAnswers = "1234567"; // Too long
            await expect(
                testQuiz.connect(creator).endQuiz(tooLongAnswers, player1.address, 100)
            ).to.be.revertedWith("Length mismatch");
            
            // Test with correct answer string - should succeed
            await expect(
                testQuiz.connect(creator).endQuiz(testAnswers, player1.address, 100)
            ).to.emit(testQuiz, "QuizFinished")
            .withArgs(player1.address, 100);
            
            // Verify quiz is finished and results are correct
            const [winnerAddr, winnerScore, totalPlayers, endTime] = 
                await testQuiz.getQuizResults();
            
            expect(winnerAddr).to.equal(player1.address);
            expect(winnerScore).to.equal(100);
            expect(totalPlayers).to.equal(2);
        });

        it("Should handle different question counts with proper length validation", async function () {
            // Test with 1 question
            const singleAnswers = "3"; // 1 character for 1 question
            const singleHash = ethers.keccak256(ethers.toUtf8Bytes(singleAnswers));
            const singleQuiz = await Quiz.deploy(creator.address, 1, singleHash);
            await singleQuiz.waitForDeployment();
            
            const players = [player1.address, player2.address];
            await singleQuiz.connect(creator).startQuiz(players);
            
            const answers = ["3", "2"];
            const scores = [100, 80];
            await singleQuiz.connect(creator).submitAllAnswers(players, answers, scores);
            
            await ethers.provider.send("evm_increaseTime", [1 * 20]);
            await ethers.provider.send("evm_mine");
            
            // Should work with correct length (1 character)
            await expect(
                singleQuiz.connect(creator).endQuiz(singleAnswers, player1.address, 100)
            ).to.emit(singleQuiz, "QuizFinished");
            
            // Test with 3 questions
            const tripleAnswers = "142"; // 3 characters for 3 questions
            const tripleHash = ethers.keccak256(ethers.toUtf8Bytes(tripleAnswers));
            const tripleQuiz = await Quiz.deploy(creator.address, 3, tripleHash);
            await tripleQuiz.waitForDeployment();
            
            await tripleQuiz.connect(creator).startQuiz(players);
            await tripleQuiz.connect(creator).submitAllAnswers(players, ["142", "241"], [90, 85]);
            
            await ethers.provider.send("evm_increaseTime", [3 * 20]);
            await ethers.provider.send("evm_mine");
            
            // Should work with correct length (3 characters)
            await expect(
                tripleQuiz.connect(creator).endQuiz(tripleAnswers, player1.address, 90)
            ).to.emit(tripleQuiz, "QuizFinished");
        });

        it("Should reject empty strings and enforce length validation", async function () {
            // Test with empty string - should fail deployment validation first
            const emptyStringHash = ethers.keccak256(ethers.toUtf8Bytes(""));
            
            // Empty string hash is valid for deployment (not bytes32(0))
            const emptyStringQuiz = await Quiz.deploy(creator.address, QUESTION_COUNT, emptyStringHash);
            await emptyStringQuiz.waitForDeployment();
            
            const players = [player1.address, player2.address];
            await emptyStringQuiz.connect(creator).startQuiz(players);
            await emptyStringQuiz.connect(creator).submitAllAnswers(players, ["1", "2"], [100, 80]);
            
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");
            
            // Empty string should fail length validation (0 != QUESTION_COUNT)
            await expect(
                emptyStringQuiz.connect(creator).endQuiz("", player1.address, 100)
            ).to.be.revertedWith("Length mismatch");
        });

        it("Should reject zero hash during deployment", async function () {
            // Test with bytes32(0) - should fail deployment
            await expect(
                Quiz.deploy(creator.address, QUESTION_COUNT, ethers.ZeroHash)
            ).to.be.revertedWith("Invalid answers hash");

            // Test with valid hash - should succeed
            const validAnswers = "12345"; // Correct length for QUESTION_COUNT
            const validHash = ethers.keccak256(ethers.toUtf8Bytes(validAnswers));
            const validQuiz = await Quiz.deploy(creator.address, QUESTION_COUNT, validHash);
            await validQuiz.waitForDeployment();
            
            // Verify quiz was created successfully
            const [creatorAddr, questions, started, finished, quizHash] = await validQuiz.getQuizInfo();
            expect(creatorAddr).to.equal(creator.address);
            expect(questions).to.equal(QUESTION_COUNT);
            expect(quizHash).to.equal(validHash);
            expect(started).to.be.false;
            expect(finished).to.be.false;
        });
    });
});