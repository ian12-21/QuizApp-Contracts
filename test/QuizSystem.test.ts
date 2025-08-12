// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { Contract } from "ethers";
// import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// describe("Quiz System - Complete Test Suite", function () {
//   let quizFactory: Contract;
//   let platformWallet: HardhatEthersSigner;
//   let creator: HardhatEthersSigner;
//   let player1: HardhatEthersSigner;
//   let player2: HardhatEthersSigner;
//   let player3: HardhatEthersSigner;
//   let player4: HardhatEthersSigner;

//   beforeEach(async function () {
//     [platformWallet, creator, player1, player2, player3, player4] = await ethers.getSigners();

//     Deploy QuizFactory
//     const QuizFactory = await ethers.getContractFactory("QuizFactory");
//     quizFactory = await QuizFactory.connect(platformWallet).deploy();
//     await quizFactory.deployed();
//   });

//   describe("QuizFactory Tests", function () {
//     it("Should deploy with correct platform wallet", async function () {
//       expect(await quizFactory.platformWallet()).to.equal(platformWallet.address);
//     });

//     it("Should create a basic quiz successfully", async function () {
//       const questionCount = 5;
//       const answersString = "1,2,3,4,1";
//       const answersHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(answersString));

//       const tx = await quizFactory.connect(creator).createBasicQuiz(questionCount, answersHash);
//       const receipt = await tx.wait();
      
//       const event = receipt.events?.find((e: any) => e.event === "QuizCreated");
//       expect(event).to.not.be.undefined;
//       expect(event.args.quizAddress).to.be.properAddress;
//       expect(event.args.creator).to.equal(creator.address);
//       expect(event.args.questionCount).to.equal(questionCount);
//     });

//     it("Should create a paid quiz successfully", async function () {
//       const questionCount = 3;
//       const answersString = "2,1,4";
//       const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answersString));
//       const entryFee = ethers.parseEther("0.1");

//       const tx = await quizFactory.connect(creator).createPaidQuiz(questionCount, answersHash, entryFee);
//       const receipt = await tx.wait();
      
//       const event = receipt.events?.find((e: any) => e.event === "FeeQuizCreated");
//       expect(event).to.not.be.undefined;
//       expect(event.args.quizAddress).to.be.properAddress;
//       expect(event.args.creator).to.equal(creator.address);
//       expect(event.args.questionCount).to.equal(questionCount);
//       expect(event.args.entryFee).to.equal(entryFee);
//     });

//     it("Should reject invalid parameters", async function () {
//       const answersHash = ethers.keccak256(ethers.toUtf8Bytes("1,2,3"));
      
//       // Invalid question count
//       await expect(
//         quizFactory.connect(creator).createBasicQuiz(0, answersHash)
//       ).to.be.revertedWith("Invalid question count");

//       // Invalid answers hash
//       await expect(
//         quizFactory.connect(creator).createBasicQuiz(3, ethers.keccak256(ethers.toUtf8Bytes("")))
//       ).to.be.revertedWith("Invalid answers hash");

//       // Invalid entry fee for paid quiz
//       await expect(
//         quizFactory.connect(creator).createPaidQuiz(3, answersHash, 0)
//       ).to.be.revertedWith("Entry fee must be greater than 0");
//     });
//   });

//   describe("Quiz (Basic) Tests", function () {
//     let quiz: Contract;
//     let quizAddress: string;
//     const questionCount = 4;
//     const answersString = "1,3,2,4";
//     const answersHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(answersString));

//     beforeEach(async function () {
//       const tx = await quizFactory.connect(creator).createBasicQuiz(questionCount, answersHash);
//       const receipt = await tx.wait();
//       const event = receipt.events?.find((e: any) => e.event === "QuizCreated");
//       quizAddress = event.args.quizAddress;

//       const Quiz = await ethers.getContractFactory("Quiz");
//       quiz = Quiz.attach(quizAddress);
//     });

//     it("Should initialize with correct parameters", async function () {
//       const [creatorAddress, questions, started, finished, quizAnswersHash, players] = await quiz.getQuizInfo();
      
//       expect(creatorAddress).to.equal(creator.address);
//       expect(questions).to.equal(questionCount);
//       expect(started).to.be.false;
//       expect(finished).to.be.false;
//       expect(quizAnswersHash).to.equal(answersHash);
//       expect(players.length).to.equal(0);
//     });

//     it("Should start quiz with players", async function () {
//       const playerAddresses = [player1.address, player2.address, player3.address];
      
//       const tx = await quiz.connect(creator).startQuiz(playerAddresses);
//       const receipt = await tx.wait();
      
//       const event = receipt.events?.find((e: any) => e.event === "QuizStarted");
//       expect(event).to.not.be.undefined;
//       expect(event.args.playerCount).to.equal(3);

//       // Verify quiz state
//       const [, , started, finished, , players] = await quiz.getQuizInfo();
//       expect(started).to.be.true;
//       expect(finished).to.be.false;
//       expect(players.length).to.equal(3);
//     });

//     it("Should reject invalid start conditions", async function () {
//       // Empty player list
//       await expect(
//         quiz.connect(creator).startQuiz([])
//       ).to.be.revertedWith("No players joined");

//       // Too many players
//       const tooManyPlayers = Array(101).fill(0).map((_, i) => ethers.Wallet.createRandom().address);
//       await expect(
//         quiz.connect(creator).startQuiz(tooManyPlayers)
//       ).to.be.revertedWith("Too many players");

//       // Non-creator trying to start
//       await expect(
//         quiz.connect(player1).startQuiz([player1.address, player2.address])
//       ).to.be.revertedWith("Only creator can call this");

//       // Start quiz properly
//       await quiz.connect(creator).startQuiz([player1.address, player2.address]);

//       // Try to start again
//       await expect(
//         quiz.connect(creator).startQuiz([player1.address])
//       ).to.be.revertedWith("Quiz already started");
//     });

//     it("Should submit player answers", async function () {
//       const playerAddresses = [player1.address, player2.address];
//       await quiz.connect(creator).startQuiz(playerAddresses);

//       const answers = [123, 456]; // Packed answers
//       const scores = [85, 92];

//       const tx = await quiz.connect(creator).submitAllAnswers(playerAddresses, answers, scores);
//       const receipt = await tx.wait();

//       // Check events
//       const events = receipt.events?.filter((e: any) => e.event === "PlayerAnswersSubmitted");
//       expect(events.length).to.equal(2);
//     });

//     it("Should end quiz and declare winner", async function () {
//       const playerAddresses = [player1.address, player2.address];
//       await quiz.connect(creator).startQuiz(playerAddresses);

//       // Submit answers
//       await quiz.connect(creator).submitAllAnswers(playerAddresses, [123, 456], [85, 92]);

//       // Fast forward time
//       const quizDuration = 20 * questionCount;
//       await ethers.provider.send("evm_increaseTime", [quizDuration + 1]);
//       await ethers.provider.send("evm_mine", []);

//       // End quiz
//       const tx = await quiz.connect(creator).endQuiz(answersString, player2.address, 92);
//       const receipt = await tx.wait();

//       const event = receipt.events?.find((e: any) => e.event === "QuizFinished");
//       expect(event).to.not.be.undefined;
//       expect(event.args.winner).to.equal(player2.address);
//       expect(event.args.score).to.equal(92);

//       // Check results
//       const [winnerAddress, winnerScore, totalPlayers, quizEndTime] = await quiz.getQuizResults();
//       expect(winnerAddress).to.equal(player2.address);
//       expect(winnerScore).to.equal(92);
//       expect(totalPlayers).to.equal(2);
//     });

//     it("Should validate quiz end conditions", async function () {
//       const playerAddresses = [player1.address, player2.address];
//       await quiz.connect(creator).startQuiz(playerAddresses);

//       // Try to end before time is up
//       await expect(
//         quiz.connect(creator).endQuiz(answersString, player1.address, 85)
//       ).to.be.revertedWith("Quiz still in progress");

//       // Fast forward time
//       const quizDuration = 20 * questionCount;
//       await ethers.provider.send("evm_increaseTime", [quizDuration + 1]);
//       await ethers.provider.send("evm_mine", []);

//       // Try with wrong answers
//       await expect(
//         quiz.connect(creator).endQuiz("4,2,3,1", player1.address, 85)
//       ).to.be.revertedWith("Invalid answers hash");

//       // Try with invalid winner
//       await expect(
//         quiz.connect(creator).endQuiz(answersString, player4.address, 85)
//       ).to.be.revertedWith("Winner not a registered player");

//       // Try as non-creator
//       await expect(
//         quiz.connect(player1).endQuiz(answersString, player1.address, 85)
//       ).to.be.revertedWith("Only creator can call this");
//     });

//     it("Should get player results", async function () {
//       const playerAddresses = [player1.address, player2.address];
//       await quiz.connect(creator).startQuiz(playerAddresses);
      
//       const playerAnswers = [123, 456];
//       const playerScores = [85, 92];
//       await quiz.connect(creator).submitAllAnswers(playerAddresses, playerAnswers, playerScores);

//       // Fast forward and end quiz
//       await ethers.provider.send("evm_increaseTime", [20 * questionCount + 1]);
//       await ethers.provider.send("evm_mine", []);
//       await quiz.connect(creator).endQuiz(answersString, player2.address, 92);

//       // Check player results
//       const [answers1, score1] = await quiz.getPlayerResults(player1.address);
//       expect(answers1).to.equal(123);
//       expect(score1).to.equal(85);

//       const [answers2, score2] = await quiz.getPlayerResults(player2.address);
//       expect(answers2).to.equal(456);
//       expect(score2).to.equal(92);
//     });
//   });

//   describe("QuizWithFee Tests", function () {
//     let quizWithFee: Contract;
//     let quizAddress: string;
//     const questionCount = 3;
//     const answersString = "2,1,3";
//     const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answersString));
//     const entryFee = ethers.parseEther("0.05");

//     beforeEach(async function () {
//       const tx = await quizFactory.connect(creator).createPaidQuiz(questionCount, answersHash, entryFee);
//       const receipt = await tx.wait();
//       const event = receipt.events?.find((e: any) => e.event === "FeeQuizCreated");
//       quizAddress = event.args.quizAddress;

//       const QuizWithFee = await ethers.getContractFactory("QuizWithFee");
//       quizWithFee = QuizWithFee.attach(quizAddress);
//     });

//     it("Should initialize with correct fee structure", async function () {
//       expect(await quizWithFee.entryFee()).to.equal(entryFee);
//       expect(await quizWithFee.platformWallet()).to.equal(platformWallet.address);
//       expect(await quizWithFee.WINNER_PERCENTAGE()).to.equal(8000); // 80%
//       expect(await quizWithFee.CREATOR_PERCENTAGE()).to.equal(500);  // 5%
//       expect(await quizWithFee.PLATFORM_PERCENTAGE()).to.equal(1500); // 15%
//     });

//     it("Should allow players to join by paying entry fee", async function () {
//       const tx1 = await quizWithFee.connect(player1).joinQuiz({ value: entryFee });
//       const receipt1 = await tx1.wait();
      
//       const event1 = receipt1.events?.find((e: any) => e.event === "PlayerJoined");
//       expect(event1).to.not.be.undefined;
//       expect(event1.args.player).to.equal(player1.address);
//       expect(event1.args.entryFee).to.equal(entryFee);

//       // Check prize pool
//       expect(await quizWithFee.prizePool()).to.equal(entryFee);

//       // Second player joins
//       await quizWithFee.connect(player2).joinQuiz({ value: entryFee });
//       expect(await quizWithFee.prizePool()).to.equal(entryFee.mul(2));
//     });

//     it("Should reject invalid join attempts", async function () {
//       // Wrong entry fee
//       await expect(
//         quizWithFee.connect(player1).joinQuiz({ value: entryFee.div(2) })
//       ).to.be.revertedWith("Incorrect entry fee");

//       // Join properly
//       await quizWithFee.connect(player1).joinQuiz({ value: entryFee });

//       // Try to join again
//       await expect(
//         quizWithFee.connect(player1).joinQuiz({ value: entryFee })
//       ).to.be.revertedWith("Already joined");

//       // Start quiz
//       await quizWithFee.connect(player2).joinQuiz({ value: entryFee });
//       await quizWithFee.connect(creator).startQuiz();

//       // Try to join after start
//       await expect(
//         quizWithFee.connect(player3).joinQuiz({ value: entryFee })
//       ).to.be.revertedWith("Quiz already started");
//     });

//     it("Should start quiz with minimum players", async function () {
//       // Try to start with no players
//       await expect(
//         quizWithFee.connect(creator).startQuiz()
//       ).to.be.revertedWith("Minimum 2 players required");

//       // Add one player
//       await quizWithFee.connect(player1).joinQuiz({ value: entryFee });
//       await expect(
//         quizWithFee.connect(creator).startQuiz()
//       ).to.be.revertedWith("Minimum 2 players required");

//       // Add second player and start
//       await quizWithFee.connect(player2).joinQuiz({ value: entryFee });
      
//       const tx = await quizWithFee.connect(creator).startQuiz();
//       const receipt = await tx.wait();
      
//       const event = receipt.events?.find((e: any) => e.event === "QuizStarted");
//       expect(event).to.not.be.undefined;
//       expect(event.args.playerCount).to.equal(2);
//       expect(event.args.prizePool).to.equal(entryFee.mul(2));
//     });

//     it("Should complete full paid quiz lifecycle with prize distribution", async function () {
//       // Players join
//       await quizWithFee.connect(player1).joinQuiz({ value: entryFee });
//       await quizWithFee.connect(player2).joinQuiz({ value: entryFee });
//       await quizWithFee.connect(player3).joinQuiz({ value: entryFee });

//       const totalPrizePool = entryFee.mul(3);
      
//       // Start quiz
//       await quizWithFee.connect(creator).startQuiz();

//       // Submit answers
//       const playerAddresses = [player1.address, player2.address, player3.address];
//       await quizWithFee.connect(creator).submitAllAnswers(
//         playerAddresses, 
//         [100, 200, 150], 
//         [70, 95, 80]
//       );

//       // Fast forward time and end quiz
//       await ethers.provider.send("evm_increaseTime", [20 * questionCount + 1]);
//       await ethers.provider.send("evm_mine", []);

//       // Record balances before prize distribution
//       const winnerBalanceBefore = await ethers.provider.getBalance(player2.address);
//       const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
//       const platformBalanceBefore = await ethers.provider.getBalance(platformWallet.address);

//       // End quiz (this automatically distributes prizes)
//       await quizWithFee.connect(creator).endQuiz(answersString, player2.address, 95);

//       // Check prize distribution
//       const winnerPrize = totalPrizePool.mul(8000).div(10000); // 80%
//       const creatorFee = totalPrizePool.mul(500).div(10000);   // 5%
//       const platformFee = totalPrizePool.mul(1500).div(10000); // 15%

//       const winnerBalanceAfter = await ethers.provider.getBalance(player2.address);
//       const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
//       const platformBalanceAfter = await ethers.provider.getBalance(platformWallet.address);

//       expect(winnerBalanceAfter - winnerBalanceBefore).to.equal(winnerPrize);
//       expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(creatorFee);
//       expect(platformBalanceAfter - platformBalanceBefore).to.equal(platformFee);

//       // Check quiz results
//       const [winnerAddress, winnerScore, totalPlayers, totalPrize, distributed] = await quizWithFee.getQuizResults();
//       expect(winnerAddress).to.equal(player2.address);
//       expect(winnerScore).to.equal(95);
//       expect(totalPlayers).to.equal(3);
//       expect(totalPrize).to.equal(totalPrizePool);
//       expect(distributed).to.be.true;
//     });

//     it("Should get player results with payment status", async function () {
//       // Players join and play
//       await quizWithFee.connect(player1).joinQuiz({ value: entryFee });
//       await quizWithFee.connect(player2).joinQuiz({ value: entryFee });
      
//       await quizWithFee.connect(creator).startQuiz();
//       await quizWithFee.connect(creator).submitAllAnswers([player1.address, player2.address], [123, 456], [85, 92]);

//       // End quiz
//       await ethers.provider.send("evm_increaseTime", [20 * questionCount + 1]);
//       await ethers.provider.send("evm_mine", []);
//       await quizWithFee.connect(creator).endQuiz(answersString, player2.address, 92);

//       // Check player results
//       const [answers1, score1, paid1] = await quizWithFee.getPlayerResults(player1.address);
//       expect(answers1).to.equal(123);
//       expect(score1).to.equal(85);
//       expect(paid1).to.be.true;

//       const [answers2, score2, paid2] = await quizWithFee.getPlayerResults(player2.address);
//       expect(answers2).to.equal(456);
//       expect(score2).to.equal(92);
//       expect(paid2).to.be.true;
//     });

//     it("Should get comprehensive quiz info", async function () {
//       await quizWithFee.connect(player1).joinQuiz({ value: entryFee });
//       await quizWithFee.connect(player2).joinQuiz({ value: entryFee });

//       const [creatorAddress, questions, started, finished, quizAnswersHash, players, fee, pool] = await quizWithFee.getQuizInfo();
      
//       expect(creatorAddress).to.equal(creator.address);
//       expect(questions).to.equal(questionCount);
//       expect(started).to.be.false;
//       expect(finished).to.be.false;
//       expect(quizAnswersHash).to.equal(answersHash);
//       expect(players.length).to.equal(2);
//       expect(fee).to.equal(entryFee);
//       expect(pool).to.equal(entryFee.mul(2));
//     });
//   });

//   describe("Edge Cases and Security Tests", function () {
//     it("Should handle quiz with maximum questions", async function () {
//       const maxQuestions = 32;
//       const answersString = Array(maxQuestions).fill(1).join(",");
//       const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answersString));

//       const tx = await quizFactory.connect(creator).createBasicQuiz(maxQuestions, answersHash);
//       const receipt = await tx.wait();
//       expect(receipt.status).to.equal(1);
//     });

//     it("Should reject quiz with too many questions", async function () {
//       const tooManyQuestions = 33;
//       const answersString = Array(tooManyQuestions).fill(1).join(",");
//       const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answersString));

//       // This should fail in the Quiz constructor
//       await expect(
//         quizFactory.connect(creator).createBasicQuiz(tooManyQuestions, answersHash)
//       ).to.be.revertedWith("Invalid question count (1-32)");
//     });

//     it("Should handle large prize pools correctly", async function () {
//       const largeEntryFee = ethers.parseEther("10");
      
//       const tx = await quizFactory.connect(creator).createPaidQuiz(3, ethers.keccak256(ethers.toUtf8Bytes("1,2,3")), largeEntryFee);
//       const receipt = await tx.wait();
//       const event = receipt.events?.find((e: any) => e.event === "FeeQuizCreated");
      
//       const QuizWithFee = await ethers.getContractFactory("QuizWithFee");
//       const quiz = QuizWithFee.attach(event.args.quizAddress);

//       // Multiple players join with large fees
//       await quiz.connect(player1).joinQuiz({ value: largeEntryFee });
//       await quiz.connect(player2).joinQuiz({ value: largeEntryFee });
      
//       expect(await quiz.prizePool()).to.equal(largeEntryFee.mul(2));
//     });
//   });
// });
