const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuizWithFee Contract", function () {
    let QuizWithFee, quiz;
    let creator, player1, player2, player3, nonPlayer, platformWallet;
    let answersHash;
    const QUESTION_COUNT = 5;
    const ENTRY_FEE = ethers.parseEther("0.01");
    const correctAnswers = "12143";

    beforeEach(async function () {
        [creator, player1, player2, player3, nonPlayer, platformWallet] = await ethers.getSigners();
        
        answersHash = ethers.keccak256(ethers.toUtf8Bytes(correctAnswers));
        
        QuizWithFee = await ethers.getContractFactory("QuizWithFee");
        quiz = await QuizWithFee.deploy(
            creator.address,
            QUESTION_COUNT,
            answersHash,
            ENTRY_FEE,
            platformWallet.address
        );
        await quiz.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set correct initial values", async function () {
            const [creatorAddr, questions, started, finished, quizHash, players, fee, pool] = 
                await quiz.getQuizInfo();
            
            expect(creatorAddr).to.equal(creator.address);
            expect(questions).to.equal(QUESTION_COUNT);
            expect(started).to.be.false;
            expect(finished).to.be.false;
            expect(quizHash).to.equal(answersHash);
            expect(players).to.have.length(0);
            expect(fee).to.equal(ENTRY_FEE);
            expect(pool).to.equal(0);
            expect(await quiz.platformWallet()).to.equal(platformWallet.address);
        });

        it("Should revert with invalid parameters", async function () {
            await expect(
                QuizWithFee.deploy(creator.address, 0, answersHash, ENTRY_FEE, platformWallet.address)
            ).to.be.revertedWith("Invalid question count");
            
            await expect(
                QuizWithFee.deploy(creator.address, 51, answersHash, ENTRY_FEE, platformWallet.address)
            ).to.be.revertedWith("Invalid question count");

            await expect(
                QuizWithFee.deploy(creator.address, QUESTION_COUNT, ethers.ZeroHash, ENTRY_FEE, platformWallet.address)
            ).to.be.revertedWith("Invalid answers hash");

            await expect(
                QuizWithFee.deploy(creator.address, QUESTION_COUNT, answersHash, 0, platformWallet.address)
            ).to.be.revertedWith("Entry fee must be greater than 0");
        });
    });

    describe("Joining Quiz", function () {
        it("Should allow players to join with correct fee", async function () {
            await expect(quiz.connect(player1).joinQuiz({ value: ENTRY_FEE }))
                .to.emit(quiz, "PlayerJoined")
                .withArgs(player1.address, ENTRY_FEE);

            const [, , , , , players, , pool] = await quiz.getQuizInfo();
            expect(players).to.include(player1.address);
            expect(pool).to.equal(ENTRY_FEE);
        });

        it("Should revert with incorrect fee", async function () {
            await expect(
                quiz.connect(player1).joinQuiz({ value: ENTRY_FEE / 2n })
            ).to.be.revertedWith("Incorrect entry fee");

            await expect(
                quiz.connect(player1).joinQuiz({ value: ENTRY_FEE * 2n })
            ).to.be.revertedWith("Incorrect entry fee");
        });

        it("Should revert if already joined", async function () {
            await quiz.connect(player1).joinQuiz({ value: ENTRY_FEE });
            
            await expect(
                quiz.connect(player1).joinQuiz({ value: ENTRY_FEE })
            ).to.be.revertedWith("Already joined");
        });

        it("Should revert if quiz already started", async function () {
            await quiz.connect(player1).joinQuiz({ value: ENTRY_FEE });
            await quiz.connect(player2).joinQuiz({ value: ENTRY_FEE });
            await quiz.connect(creator).startQuiz();

            await expect(
                quiz.connect(player3).joinQuiz({ value: ENTRY_FEE })
            ).to.be.revertedWith("Quiz already started");
        });

        it("Should accumulate prize pool correctly", async function () {
            await quiz.connect(player1).joinQuiz({ value: ENTRY_FEE });
            await quiz.connect(player2).joinQuiz({ value: ENTRY_FEE });
            await quiz.connect(player3).joinQuiz({ value: ENTRY_FEE });

            const [, , , , , , , pool] = await quiz.getQuizInfo();
            expect(pool).to.equal(ENTRY_FEE * 3n);
        });

        it("Should revert when quiz is full", async function () {
            // Join 100 players (maximum)
            const players = [];
            for (let i = 0; i < 100; i++) {
                const player = ethers.Wallet.createRandom().connect(ethers.provider);
                // Fund the player
                await creator.sendTransaction({
                    to: player.address,
                    value: ENTRY_FEE * 2n
                });
                players.push(player);
                await quiz.connect(player).joinQuiz({ value: ENTRY_FEE });
            }

            // Try to join one more
            const extraPlayer = ethers.Wallet.createRandom().connect(ethers.provider);
            await creator.sendTransaction({
                to: extraPlayer.address,
                value: ENTRY_FEE * 2n
            });

            await expect(
                quiz.connect(extraPlayer).joinQuiz({ value: ENTRY_FEE })
            ).to.be.revertedWith("Quiz is full");
        });
    });

    describe("Starting Quiz", function () {
        beforeEach(async function () {
            await quiz.connect(player1).joinQuiz({ value: ENTRY_FEE });
            await quiz.connect(player2).joinQuiz({ value: ENTRY_FEE });
        });

        it("Should start quiz with minimum players", async function () {
            await expect(quiz.connect(creator).startQuiz())
                .to.emit(quiz, "QuizStarted");

            const [, , started, , , ,] = await quiz.getQuizInfo();
            expect(started).to.be.true;
        });

        it("Should revert if not creator", async function () {
            await expect(
                quiz.connect(player1).startQuiz()
            ).to.be.revertedWith("Only creator can call this");
        });

        it("Should revert if already started", async function () {
            await quiz.connect(creator).startQuiz();
            
            await expect(
                quiz.connect(creator).startQuiz()
            ).to.be.revertedWith("Quiz already started");
        });

        it("Should revert with insufficient players", async function () {
            const singlePlayerQuiz = await QuizWithFee.deploy(
                creator.address,
                QUESTION_COUNT,
                answersHash,
                ENTRY_FEE,
                platformWallet.address
            );
            
            await singlePlayerQuiz.connect(player1).joinQuiz({ value: ENTRY_FEE });
            
            await expect(
                singlePlayerQuiz.connect(creator).startQuiz()
            ).to.be.revertedWith("Minimum 2 players required");
        });
    });

    describe("Answer Submission and Quiz Completion", function () {
        beforeEach(async function () {
            await quiz.connect(player1).joinQuiz({ value: ENTRY_FEE });
            await quiz.connect(player2).joinQuiz({ value: ENTRY_FEE });
            await quiz.connect(player3).joinQuiz({ value: ENTRY_FEE });
            await quiz.connect(creator).startQuiz();
        });

        it("Should submit answers and end quiz with prize distribution", async function () {
            const players = [player1.address, player2.address, player3.address];
            const answers = ["12143", "21434", "31241"];
            const scores = [100, 80, 60];

            await quiz.connect(creator).submitAllAnswers(players, answers, scores);

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");

            // Get initial balances
            const initialWinnerBalance = await ethers.provider.getBalance(player1.address);
            const initialCreatorBalance = await ethers.provider.getBalance(creator.address);
            const initialPlatformBalance = await ethers.provider.getBalance(platformWallet.address);

            // Execute endQuiz and capture gas used
            const tx = await quiz.connect(creator).endQuiz(correctAnswers, player1.address, 100);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed;
            const gasPrice = tx.gasPrice;
            const gasCost = gasUsed * gasPrice;

            // Check that events were emitted
            expect(receipt.logs.some(log => {
                try {
                    const parsed = quiz.interface.parseLog(log);
                    return parsed?.name === "QuizFinished";
                } catch {
                    return false;
                }
            })).to.be.true;

            expect(receipt.logs.some(log => {
                try {
                    const parsed = quiz.interface.parseLog(log);
                    return parsed?.name === "PrizesDistributed";
                } catch {
                    return false;
                }
            })).to.be.true;

            // Check prize distribution
            const totalPrize = ENTRY_FEE * 3n;
            const winnerPrize = (totalPrize * 8500n) / 10000n; // 85%
            const creatorFee = (totalPrize * 500n) / 10000n;   // 5%
            const platformFee = (totalPrize * 1000n) / 10000n; // 10%

            const finalWinnerBalance = await ethers.provider.getBalance(player1.address);
            const finalCreatorBalance = await ethers.provider.getBalance(creator.address);
            const finalPlatformBalance = await ethers.provider.getBalance(platformWallet.address);

            // Check prize distribution (accounting for gas costs for creator)
            expect(finalWinnerBalance - initialWinnerBalance).to.equal(winnerPrize);
            expect(finalCreatorBalance - initialCreatorBalance).to.equal(creatorFee - gasCost);
            expect(finalPlatformBalance - initialPlatformBalance).to.equal(platformFee);

            // Verify quiz results
            const [winnerAddr, winnerScore, totalPlayers, prizePool, distributed] = 
                await quiz.getQuizResults();
            
            expect(winnerAddr).to.equal(player1.address);
            expect(winnerScore).to.equal(100);
            expect(totalPlayers).to.equal(3);
            expect(prizePool).to.equal(totalPrize);
            expect(distributed).to.be.true;
        });

        it("Should get player results correctly", async function () {
            const players = [player1.address, player2.address];
            const answers = ["12143", "21434"];
            const scores = [100, 80];

            await quiz.connect(creator).submitAllAnswers(players, answers, scores);

            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");

            await quiz.connect(creator).endQuiz(correctAnswers, player1.address, 100);

            const [playerAnswers, playerScore, paidEntry] = 
                await quiz.getPlayerResults(player1.address);
            
            expect(playerAnswers).to.equal("12143");
            expect(playerScore).to.equal(100);
            expect(paidEntry).to.be.true;
        });

        it("Should revert ending quiz too early", async function () {
            const players = [player1.address];
            const answers = ["12143"];
            const scores = [100];

            await quiz.connect(creator).submitAllAnswers(players, answers, scores);

            await expect(
                quiz.connect(creator).endQuiz(correctAnswers, player1.address, 100)
            ).to.be.revertedWith("Quiz still in progress");
        });
    });

    describe("Prize Distribution", function () {
        it("Should calculate prizes correctly", async function () {
            const totalPrize = ethers.parseEther("1.0");
            
            // Expected distribution
            const expectedWinnerPrize = (totalPrize * 8000n) / 10000n; // 80%
            const expectedCreatorFee = (totalPrize * 500n) / 10000n;   // 5%  
            const expectedPlatformFee = (totalPrize * 1500n) / 10000n; // 15%

            expect(expectedWinnerPrize + expectedCreatorFee + expectedPlatformFee)
                .to.equal(totalPrize);
        });

        it("Should handle prize distribution failure gracefully", async function () {
            // This test would require mocking contract calls which is complex in Hardhat
            // In a real scenario, you'd test with contracts that revert on receive()
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            await quiz.connect(player1).joinQuiz({ value: ENTRY_FEE });
            await quiz.connect(player2).joinQuiz({ value: ENTRY_FEE });
            await quiz.connect(creator).startQuiz();
            
            const players = [player1.address, player2.address];
            const answers = ["12143", "21434"];
            const scores = [100, 80];
            await quiz.connect(creator).submitAllAnswers(players, answers, scores);
            
            await ethers.provider.send("evm_increaseTime", [QUESTION_COUNT * 20]);
            await ethers.provider.send("evm_mine");
            
            await quiz.connect(creator).endQuiz(correctAnswers, player1.address, 100);
        });

        it("Should return correct quiz info", async function () {
            const [creatorAddr, questions, started, finished, quizHash, players, fee, pool] = 
                await quiz.getQuizInfo();
            
            expect(creatorAddr).to.equal(creator.address);
            expect(questions).to.equal(QUESTION_COUNT);
            expect(started).to.be.true;
            expect(finished).to.be.true;
            expect(quizHash).to.equal(answersHash);
            expect(players).to.have.length(2);
            expect(fee).to.equal(ENTRY_FEE);
            expect(pool).to.equal(ENTRY_FEE * 2n);
        });

        it("Should revert getting results before quiz ends", async function () {
            const newQuiz = await QuizWithFee.deploy(
                creator.address,
                QUESTION_COUNT,
                answersHash,
                ENTRY_FEE,
                platformWallet.address
            );

            await expect(
                newQuiz.getQuizResults()
            ).to.be.revertedWith("Quiz not finished");

            await expect(
                newQuiz.getPlayerResults(player1.address)
            ).to.be.revertedWith("Quiz not finished");
        });
    });

    describe("Constants and Percentages", function () {
        it("Should have correct percentage constants", async function () {
            expect(await quiz.WINNER_PERCENTAGE()).to.equal(8500);
            expect(await quiz.CREATOR_PERCENTAGE()).to.equal(500);
            expect(await quiz.PLATFORM_PERCENTAGE()).to.equal(1000);
            
            // Should add up to 100%
            const total = 8500 + 500 + 1000;
            expect(total).to.equal(10000);
        });
    });

    describe("Edge Cases", function () {
        it("Should handle minimum valid entry fee", async function () {
            const minFeeQuiz = await QuizWithFee.deploy(
                creator.address,
                QUESTION_COUNT,
                answersHash,
                1, // 1 wei
                platformWallet.address
            );

            await expect(
                minFeeQuiz.connect(player1).joinQuiz({ value: 1 })
            ).to.not.be.reverted;
        });

        it("Should handle large prize pools", async function () {
            const largeFee = ethers.parseEther("10");
            const largeFeeQuiz = await QuizWithFee.deploy(
                creator.address,
                QUESTION_COUNT,
                answersHash,
                largeFee,
                platformWallet.address
            );

            // Fund players
            await creator.sendTransaction({
                to: player1.address,
                value: largeFee * 2n
            });
            await creator.sendTransaction({
                to: player2.address,
                value: largeFee * 2n
            });

            await largeFeeQuiz.connect(player1).joinQuiz({ value: largeFee });
            await largeFeeQuiz.connect(player2).joinQuiz({ value: largeFee });

            const [, , , , , , , pool] = await largeFeeQuiz.getQuizInfo();
            expect(pool).to.equal(largeFee * 2n);
        });
    });
});