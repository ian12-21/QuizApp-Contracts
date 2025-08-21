const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuizFactory Contract", function () {
    let QuizFactory, quizFactory;
    let Quiz, QuizWithFee;
    let platformWallet, creator, user1;
    let answersHash;
    const QUESTION_COUNT = 5;
    const ENTRY_FEE = ethers.parseEther("0.01");
    const correctAnswers = "12143";

    beforeEach(async function () {
        [platformWallet, creator, user1] = await ethers.getSigners();
        
        // Generate answers hash
        answersHash = ethers.keccak256(ethers.toUtf8Bytes(correctAnswers));
        
        // Deploy factory
        QuizFactory = await ethers.getContractFactory("QuizFactory");
        quizFactory = await QuizFactory.connect(platformWallet).deploy();
        await quizFactory.waitForDeployment();

        // Get contract factories for testing
        Quiz = await ethers.getContractFactory("Quiz");
        QuizWithFee = await ethers.getContractFactory("QuizWithFee");
    });

    describe("Deployment", function () {
        it("Should set platform wallet correctly", async function () {
            expect(await quizFactory.platformWallet()).to.equal(platformWallet.address);
        });
    });

    describe("Creating Basic Quiz", function () {
        it("Should create basic quiz successfully", async function () {
            await expect(
                quizFactory.connect(creator).createBasicQuiz(QUESTION_COUNT, answersHash)
            ).to.emit(quizFactory, "QuizCreated");

            // Get the event to find the quiz address
            const tx = await quizFactory.connect(creator).createBasicQuiz(QUESTION_COUNT, answersHash);
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return quizFactory.interface.parseLog(log).name === "QuizCreated";
                } catch {
                    return false;
                }
            });
            
            const quizAddress = quizFactory.interface.parseLog(event).args.quizAddress;
            
            // Verify quiz was created with correct parameters
            const quiz = Quiz.attach(quizAddress);
            const [creatorAddr, questions, started, finished, quizHash] = 
                await quiz.getQuizInfo();
            
            expect(creatorAddr).to.equal(creator.address);
            expect(questions).to.equal(QUESTION_COUNT);
            expect(started).to.be.false;
            expect(finished).to.be.false;
            expect(quizHash).to.equal(answersHash);
        });

        it("Should revert with invalid question count", async function () {
            await expect(
                quizFactory.connect(creator).createBasicQuiz(0, answersHash)
            ).to.be.revertedWith("Invalid question count (1-50)");
            
            await expect(
                quizFactory.connect(creator).createBasicQuiz(51, answersHash)
            ).to.be.revertedWith("Invalid question count (1-50)");
        });

        it("Should revert with invalid answers hash", async function () {
            const emptyHash = ethers.keccak256(ethers.toUtf8Bytes(""));
            
            await expect(
                quizFactory.connect(creator).createBasicQuiz(QUESTION_COUNT, emptyHash)
            ).to.be.revertedWith("Invalid answers hash");
        });

        it("Should emit QuizCreated event with correct parameters", async function () {
            await expect(
                quizFactory.connect(creator).createBasicQuiz(QUESTION_COUNT, answersHash)
            ).to.emit(quizFactory, "QuizCreated")
            .withArgs(
                function(quizAddress) { return ethers.isAddress(quizAddress); },
                creator.address,
                QUESTION_COUNT
            );
        });

        it("Should allow multiple users to create quizzes", async function () {
            // Creator creates a quiz
            const tx1 = await quizFactory.connect(creator).createBasicQuiz(QUESTION_COUNT, answersHash);
            await tx1.wait();

            // User1 creates a quiz
            const tx2 = await quizFactory.connect(user1).createBasicQuiz(3, answersHash);
            await tx2.wait();

            // Both should be successful (no reverts)
            expect(tx1).to.not.be.reverted;
            expect(tx2).to.not.be.reverted;
        });
    });

    describe("Creating Paid Quiz", function () {
        it("Should create paid quiz successfully", async function () {
            await expect(
                quizFactory.connect(creator).createPaidQuiz(
                    QUESTION_COUNT, 
                    answersHash, 
                    ENTRY_FEE
                )
            ).to.emit(quizFactory, "FeeQuizCreated");

            const tx = await quizFactory.connect(creator).createPaidQuiz(
                QUESTION_COUNT, 
                answersHash, 
                ENTRY_FEE
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return quizFactory.interface.parseLog(log).name === "FeeQuizCreated";
                } catch {
                    return false;
                }
            });
            
            const quizAddress = quizFactory.interface.parseLog(event).args.quizAddress;
            
            // Verify quiz was created with correct parameters
            const quiz = QuizWithFee.attach(quizAddress);
            const [creatorAddr, questions, started, finished, quizHash, , fee, pool] = 
                await quiz.getQuizInfo();
            
            expect(creatorAddr).to.equal(creator.address);
            expect(questions).to.equal(QUESTION_COUNT);
            expect(started).to.be.false;
            expect(finished).to.be.false;
            expect(quizHash).to.equal(answersHash);
            expect(fee).to.equal(ENTRY_FEE);
            expect(pool).to.equal(0);
        });

        it("Should revert with zero entry fee", async function () {
            await expect(
                quizFactory.connect(creator).createPaidQuiz(QUESTION_COUNT, answersHash, 0)
            ).to.be.revertedWith("Entry fee must be greater than 0");
        });
        
        it("Should revert with invalid question count for paid quiz", async function () {
            await expect(
                quizFactory.connect(creator).createPaidQuiz(0, answersHash, ENTRY_FEE)
            ).to.be.revertedWith("Invalid question count (1-50)");
            
            await expect(
                quizFactory.connect(creator).createPaidQuiz(51, answersHash, ENTRY_FEE)
            ).to.be.revertedWith("Invalid question count (1-50)");
        });

        it("Should revert with invalid question count", async function () {
            await expect(
                quizFactory.connect(creator).createPaidQuiz(0, answersHash, ENTRY_FEE)
            ).to.be.revertedWith("Invalid question count (1-50)");
        });

        it("Should revert with invalid answers hash", async function () {
            const emptyHash = ethers.keccak256(ethers.toUtf8Bytes(""));
            
            await expect(
                quizFactory.connect(creator).createPaidQuiz(QUESTION_COUNT, emptyHash, ENTRY_FEE)
            ).to.be.revertedWith("Invalid answers hash");
        });

        it("Should emit FeeQuizCreated event with correct parameters", async function () {
            await expect(
                quizFactory.connect(creator).createPaidQuiz(
                    QUESTION_COUNT, 
                    answersHash, 
                    ENTRY_FEE
                )
            ).to.emit(quizFactory, "FeeQuizCreated")
            .withArgs(
                function(quizAddress) { return ethers.isAddress(quizAddress); },
                creator.address,
                QUESTION_COUNT,
                ENTRY_FEE
            );
        });

        it("Should set platform wallet correctly in created quiz", async function () {
            const tx = await quizFactory.connect(creator).createPaidQuiz(
                QUESTION_COUNT, 
                answersHash, 
                ENTRY_FEE
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return quizFactory.interface.parseLog(log).name === "FeeQuizCreated";
                } catch {
                    return false;
                }
            });
            
            const quizAddress = quizFactory.interface.parseLog(event).args.quizAddress;
            const quiz = QuizWithFee.attach(quizAddress);
            
            expect(await quiz.platformWallet()).to.equal(platformWallet.address);
        });
    });

    describe("Factory State", function () {
        it("Should maintain independent quiz instances", async function () {
            // Create two basic quizzes
            const tx1 = await quizFactory.connect(creator).createBasicQuiz(
                QUESTION_COUNT, 
                answersHash
            );
            const receipt1 = await tx1.wait();
            
            const tx2 = await quizFactory.connect(user1).createBasicQuiz(
                3, 
                answersHash
            );
            const receipt2 = await tx2.wait();

            // Get quiz addresses
            const event1 = receipt1.logs.find(log => {
                try {
                    return quizFactory.interface.parseLog(log).name === "QuizCreated";
                } catch {
                    return false;
                }
            });
            const event2 = receipt2.logs.find(log => {
                try {
                    return quizFactory.interface.parseLog(log).name === "QuizCreated";
                } catch {
                    return false;
                }
            });

            const quiz1Address = quizFactory.interface.parseLog(event1).args.quizAddress;
            const quiz2Address = quizFactory.interface.parseLog(event2).args.quizAddress;

            // Verify they are different addresses
            expect(quiz1Address).to.not.equal(quiz2Address);

            // Verify they have different creators and question counts
            const quiz1 = Quiz.attach(quiz1Address);
            const quiz2 = Quiz.attach(quiz2Address);

            const [creator1, questions1] = await quiz1.getQuizInfo();
            const [creator2, questions2] = await quiz2.getQuizInfo();

            expect(creator1).to.equal(creator.address);
            expect(creator2).to.equal(user1.address);
            expect(questions1).to.equal(QUESTION_COUNT);
            expect(questions2).to.equal(3);
        });

        it("Should create different types of quizzes independently", async function () {
            // Create basic quiz
            const basicTx = await quizFactory.connect(creator).createBasicQuiz(
                QUESTION_COUNT, 
                answersHash
            );
            const basicReceipt = await basicTx.wait();

            // Create paid quiz
            const paidTx = await quizFactory.connect(creator).createPaidQuiz(
                QUESTION_COUNT, 
                answersHash, 
                ENTRY_FEE
            );
            const paidReceipt = await paidTx.wait();

            // Both should succeed
            expect(basicTx).to.not.be.reverted;
            expect(paidTx).to.not.be.reverted;

            // Should emit different events
            const basicEvent = basicReceipt.logs.find(log => {
                try {
                    return quizFactory.interface.parseLog(log).name === "QuizCreated";
                } catch {
                    return false;
                }
            });
            const paidEvent = paidReceipt.logs.find(log => {
                try {
                    return quizFactory.interface.parseLog(log).name === "FeeQuizCreated";
                } catch {
                    return false;
                }
            });

            expect(basicEvent).to.not.be.undefined;
            expect(paidEvent).to.not.be.undefined;
        });
    });

    describe("Edge Cases", function () {
        it("Should handle maximum question count", async function () {
            const maxQuestions = 50;
            
            await expect(
                quizFactory.connect(creator).createBasicQuiz(maxQuestions, answersHash)
            ).to.not.be.reverted;

            await expect(
                quizFactory.connect(creator).createPaidQuiz(
                    maxQuestions, 
                    answersHash, 
                    ENTRY_FEE
                )
            ).to.not.be.reverted;
        });

        it("Should handle very small entry fee", async function () {
            const smallFee = 1; // 1 wei
            
            await expect(
                quizFactory.connect(creator).createPaidQuiz(
                    QUESTION_COUNT, 
                    answersHash, 
                    smallFee
                )
            ).to.not.be.reverted;
        });

        it("Should handle very large entry fee", async function () {
            const largeFee = ethers.parseEther("100");
            
            await expect(
                quizFactory.connect(creator).createPaidQuiz(
                    QUESTION_COUNT, 
                    answersHash, 
                    largeFee
                )
            ).to.not.be.reverted;
        });
    });
});