import { expect } from "chai";
import { ethers } from "hardhat";

describe("Comprehensive Quiz System Tests", function () {
  let quizFactory: any;
  let platformWallet: any;
  let creator: any;
  let player1: any;
  let player2: any;
  let player3: any;
  let player4: any;

  beforeEach(async function () {
    [platformWallet, creator, player1, player2, player3, player4] = await ethers.getSigners();

    // Deploy QuizFactory
    const QuizFactory = await ethers.getContractFactory("QuizFactory");
    quizFactory = await QuizFactory.connect(platformWallet).deploy();
    await quizFactory.waitForDeployment();
  });

  describe("QuizFactory Advanced Tests", function () {
    it("Should handle multiple quiz creation", async function () {
      const answersHash1 = ethers.keccak256(ethers.toUtf8Bytes("1,2,3"));
      const answersHash2 = ethers.keccak256(ethers.toUtf8Bytes("4,1,2"));
      
      // Create multiple basic quizzes
      await quizFactory.connect(creator).createBasicQuiz(3, answersHash1);
      await quizFactory.connect(player1).createBasicQuiz(5, answersHash2);
      
      // Create multiple paid quizzes
      const entryFee1 = ethers.parseEther("0.1");
      const entryFee2 = ethers.parseEther("0.05");
      
      await quizFactory.connect(creator).createPaidQuiz(3, answersHash1, entryFee1);
      await quizFactory.connect(player2).createPaidQuiz(4, answersHash2, entryFee2);
      
      // All should succeed without conflicts
      expect(true).to.be.true; // If we get here, all creations succeeded
    });

    it("Should validate question count limits", async function () {
      const answersHash = ethers.keccak256(ethers.toUtf8Bytes("1,2,3"));
      
      // Test maximum allowed questions (32)
      const maxAnswersString = Array(32).fill(1).join(",");
      const maxAnswersHash = ethers.keccak256(ethers.toUtf8Bytes(maxAnswersString));
      
      await expect(
        quizFactory.connect(creator).createBasicQuiz(32, maxAnswersHash)
      ).to.not.be.reverted;
      
      // Test beyond maximum (33)
      const tooManyAnswersString = Array(33).fill(1).join(",");
      const tooManyAnswersHash = ethers.keccak256(ethers.toUtf8Bytes(tooManyAnswersString));
      
      await expect(
        quizFactory.connect(creator).createBasicQuiz(33, tooManyAnswersHash)
      ).to.be.revertedWith("Invalid question count (1-32)");
    });
  });

  describe("Quiz Contract Comprehensive Tests", function () {
    let quiz: any;
    let quizAddress: string;
    const questionCount = 4;
    const answersString = "1,3,2,4";
    const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answersString));

    beforeEach(async function () {
      const tx = await quizFactory.connect(creator).createBasicQuiz(questionCount, answersHash);
      const receipt = await tx.wait();
      
      // Get quiz address from event
      for (const log of receipt.logs) {
        try {
          const parsed = quizFactory.interface.parseLog(log);
          if (parsed?.name === "QuizCreated") {
            quizAddress = parsed.args.quizAddress;
            break;
          }
        } catch {
          continue;
        }
      }

      const Quiz = await ethers.getContractFactory("Quiz");
      quiz = Quiz.attach(quizAddress);
    });

    it("Should handle player registration edge cases", async function () {
      // Empty player list
      await expect(
        quiz.connect(creator).startQuiz([])
      ).to.be.revertedWith("Minimum 2 players required to start");

      // Single player (should work)
      await expect(
        quiz.connect(creator).startQuiz([player1.address])
      ).to.be.revertedWith("Minimum 2 players required to start");

      await quiz.connect(creator).startQuiz([player1.address, player2.address]);
      
      const [, , started] = await quiz.getQuizInfo();
      expect(started).to.be.true;
    });

    it("Should prevent non-creator actions", async function () {
      const playerAddresses = [player1.address, player2.address];
      
      // Non-creator trying to start quiz
      await expect(
        quiz.connect(player1).startQuiz(playerAddresses)
      ).to.be.revertedWith("Only creator can call this");

      // Start quiz properly
      await quiz.connect(creator).startQuiz(playerAddresses);

      // Non-creator trying to submit answers
      await expect(
        quiz.connect(player1).submitAllAnswers([player1.address], [123], [85])
      ).to.be.revertedWith("Only creator can call this");

      // Non-creator trying to end quiz
      await ethers.provider.send("evm_increaseTime", [20 * questionCount + 1]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(
        quiz.connect(player1).endQuiz(answersString, player1.address, 85)
      ).to.be.revertedWith("Only creator can call this");
    });

    it("Should handle answer submission validation", async function () {
      const playerAddresses = [player1.address, player2.address, player3.address];
      await quiz.connect(creator).startQuiz(playerAddresses);

      // Mismatched array lengths
      await expect(
        quiz.connect(creator).submitAllAnswers(
          [player1.address, player2.address], 
          [123], 
          [85, 92]
        )
      ).to.be.revertedWith("Arrays length mismatch");

      // Unregistered player
      await expect(
        quiz.connect(creator).submitAllAnswers(
          [player4.address], 
          [123], 
          [85]
        )
      ).to.be.revertedWith("Player not registered");

      // Valid submission
      await quiz.connect(creator).submitAllAnswers(
        playerAddresses,
        [123, 456, 789],
        [85, 92, 78]
      );
    });

    it("Should enforce quiz timing constraints", async function () {
      const playerAddresses = [player1.address, player2.address];
      await quiz.connect(creator).startQuiz(playerAddresses);

      // Try to end immediately (should fail)
      await expect(
        quiz.connect(creator).endQuiz(answersString, player1.address, 85)
      ).to.be.revertedWith("Quiz still in progress");

      // Advance time partially
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine", []);

      // Still too early
      await expect(
        quiz.connect(creator).endQuiz(answersString, player1.address, 85)
      ).to.be.revertedWith("Quiz still in progress");

      // Advance full duration
      await ethers.provider.send("evm_increaseTime", [20 * questionCount]);
      await ethers.provider.send("evm_mine", []);

      // Now should work
      await quiz.connect(creator).endQuiz(answersString, player1.address, 85);
    });

    it("Should validate quiz end conditions", async function () {
      const playerAddresses = [player1.address, player2.address];
      await quiz.connect(creator).startQuiz(playerAddresses);

      // Advance time
      await ethers.provider.send("evm_increaseTime", [20 * questionCount + 1]);
      await ethers.provider.send("evm_mine", []);

      // Wrong answers hash
      await expect(
        quiz.connect(creator).endQuiz("4,2,3,1", player1.address, 85)
      ).to.be.revertedWith("Invalid answers hash");

      // Invalid winner (not registered)
      await expect(
        quiz.connect(creator).endQuiz(answersString, player4.address, 85)
      ).to.be.revertedWith("Winner not a registered player");

      // Invalid score (0)
      await expect(
        quiz.connect(creator).endQuiz(answersString, player1.address, 0)
      ).to.be.revertedWith("Invalid winner data");

      // Valid end
      await quiz.connect(creator).endQuiz(answersString, player1.address, 85);
    });

    it("Should provide complete quiz results", async function () {
      const playerAddresses = [player1.address, player2.address];
      await quiz.connect(creator).startQuiz(playerAddresses);
      
      // Submit answers
      await quiz.connect(creator).submitAllAnswers(
        playerAddresses,
        [123, 456],
        [85, 92]
      );

      // End quiz
      await ethers.provider.send("evm_increaseTime", [20 * questionCount + 1]);
      await ethers.provider.send("evm_mine", []);
      await quiz.connect(creator).endQuiz(answersString, player2.address, 92);

      // Check comprehensive results
      const [winnerAddress, winnerScore, totalPlayers, quizEndTime] = await quiz.getQuizResults();
      expect(winnerAddress).to.equal(player2.address);
      expect(winnerScore).to.equal(92);
      expect(totalPlayers).to.equal(2);
      expect(quizEndTime).to.be.greaterThan(0);

      // Check individual player results
      const [answers1, score1] = await quiz.getPlayerResults(player1.address);
      expect(answers1).to.equal(123);
      expect(score1).to.equal(85);

      const [answers2, score2] = await quiz.getPlayerResults(player2.address);
      expect(answers2).to.equal(456);
      expect(score2).to.equal(92);
    });
  });

  describe("QuizWithFee Comprehensive Tests", function () {
    let quizWithFee: any;
    let quizAddress: string;
    const questionCount = 3;
    const answersString = "2,1,3";
    const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answersString));
    const entryFee = ethers.parseEther("0.05");

    beforeEach(async function () {
      const tx = await quizFactory.connect(creator).createPaidQuiz(questionCount, answersHash, entryFee);
      const receipt = await tx.wait();
      
      // Get quiz address from event
      for (const log of receipt.logs) {
        try {
          const parsed = quizFactory.interface.parseLog(log);
          if (parsed?.name === "FeeQuizCreated") {
            quizAddress = parsed.args.quizAddress;
            break;
          }
        } catch {
          continue;
        }
      }

      const QuizWithFee = await ethers.getContractFactory("QuizWithFee");
      quizWithFee = QuizWithFee.attach(quizAddress);
    });

    it("Should validate fee structure constants", async function () {
      expect(await quizWithFee.WINNER_PERCENTAGE()).to.equal(8000); // 80%
      expect(await quizWithFee.CREATOR_PERCENTAGE()).to.equal(500);  // 5%
      expect(await quizWithFee.PLATFORM_PERCENTAGE()).to.equal(1500); // 15%
      expect(await quizWithFee.entryFee()).to.equal(entryFee);
      expect(await quizWithFee.platformWallet()).to.equal(platformWallet.address);
    });

    it("Should handle player joining edge cases", async function () {
      // Correct payment
      await quizWithFee.connect(player1).joinQuiz({ value: entryFee });
      expect(await quizWithFee.prizePool()).to.equal(entryFee);

      // Wrong payment amount
      await expect(
        quizWithFee.connect(player2).joinQuiz({ value: entryFee / 2n })
      ).to.be.revertedWith("Incorrect entry fee");

      // Double joining
      await expect(
        quizWithFee.connect(player1).joinQuiz({ value: entryFee })
      ).to.be.revertedWith("Already joined");

      // Join after start
      await quizWithFee.connect(player2).joinQuiz({ value: entryFee });
      await quizWithFee.connect(creator).startQuiz();
      
      await expect(
        quizWithFee.connect(player3).joinQuiz({ value: entryFee })
      ).to.be.revertedWith("Quiz already started");
    });

    it("Should enforce minimum player requirements", async function () {
      // Try to start with no players
      await expect(
        quizWithFee.connect(creator).startQuiz()
      ).to.be.revertedWith("Minimum 2 players required");

      // Add one player
      await quizWithFee.connect(player1).joinQuiz({ value: entryFee });
      await expect(
        quizWithFee.connect(creator).startQuiz()
      ).to.be.revertedWith("Minimum 2 players required");

      // Add second player - should work
      await quizWithFee.connect(player2).joinQuiz({ value: entryFee });
      await quizWithFee.connect(creator).startQuiz();
    });

    it("Should handle complete prize distribution lifecycle", async function () {
      // Players join
      await quizWithFee.connect(player1).joinQuiz({ value: entryFee });
      await quizWithFee.connect(player2).joinQuiz({ value: entryFee });
      await quizWithFee.connect(player3).joinQuiz({ value: entryFee });

      const totalPrizePool = entryFee * 3n;
      
      // Start and play quiz
      await quizWithFee.connect(creator).startQuiz();
      await quizWithFee.connect(creator).submitAllAnswers(
        [player1.address, player2.address, player3.address],
        [100, 200, 150],
        [70, 95, 80]
      );

      // Record balances before prize distribution
      const winnerBalanceBefore = await ethers.provider.getBalance(player2.address);
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
      const platformBalanceBefore = await ethers.provider.getBalance(platformWallet.address);

      // End quiz (automatically distributes prizes)
      await ethers.provider.send("evm_increaseTime", [20 * questionCount + 1]);
      await ethers.provider.send("evm_mine", []);
      await quizWithFee.connect(creator).endQuiz(answersString, player2.address, 95);

      // Verify prize distribution
      const winnerPrize = (totalPrizePool * 8000n) / 10000n; // 80%
      const creatorFee = (totalPrizePool * 500n) / 10000n;   // 5%
      const platformFee = (totalPrizePool * 1500n) / 10000n; // 15%

      const winnerBalanceAfter = await ethers.provider.getBalance(player2.address);
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      const platformBalanceAfter = await ethers.provider.getBalance(platformWallet.address);

      // Winner receives exact prize (no gas cost for receiving)
      expect(winnerBalanceAfter - winnerBalanceBefore).to.equal(winnerPrize);
      
      // Creator pays gas for the endQuiz transaction, so balance increase is less than creatorFee
      const creatorBalanceIncrease = creatorBalanceAfter - creatorBalanceBefore;
      const gasAllowance = ethers.parseEther("0.01");
      expect(creatorBalanceIncrease < creatorFee).to.be.true;
      expect(creatorBalanceIncrease > (creatorFee - gasAllowance)).to.be.true;
      
      // Platform receives exact fee (no gas cost for receiving)
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(platformFee);

      // Verify quiz results
      const [winnerAddress, winnerScore, totalPlayers, totalPrize, distributed] = await quizWithFee.getQuizResults();
      expect(winnerAddress).to.equal(player2.address);
      expect(winnerScore).to.equal(95);
      expect(totalPlayers).to.equal(3);
      expect(totalPrize).to.equal(totalPrizePool);
      expect(distributed).to.be.true;
    });

    it("Should provide detailed player results with payment status", async function () {
      // Players join and play
      await quizWithFee.connect(player1).joinQuiz({ value: entryFee });
      await quizWithFee.connect(player2).joinQuiz({ value: entryFee });
      
      await quizWithFee.connect(creator).startQuiz();
      await quizWithFee.connect(creator).submitAllAnswers(
        [player1.address, player2.address],
        [123, 456],
        [85, 92]
      );

      // End quiz
      await ethers.provider.send("evm_increaseTime", [20 * questionCount + 1]);
      await ethers.provider.send("evm_mine", []);
      await quizWithFee.connect(creator).endQuiz(answersString, player2.address, 92);

      // Check detailed player results
      const [answers1, score1, paid1] = await quizWithFee.getPlayerResults(player1.address);
      expect(answers1).to.equal(123);
      expect(score1).to.equal(85);
      expect(paid1).to.be.true;

      const [answers2, score2, paid2] = await quizWithFee.getPlayerResults(player2.address);
      expect(answers2).to.equal(456);
      expect(score2).to.equal(92);
      expect(paid2).to.be.true;
    });

    it("Should provide comprehensive quiz information", async function () {
      await quizWithFee.connect(player1).joinQuiz({ value: entryFee });
      await quizWithFee.connect(player2).joinQuiz({ value: entryFee });

      const [creatorAddress, questions, started, finished, quizAnswersHash, players, fee, pool] = await quizWithFee.getQuizInfo();
      
      expect(creatorAddress).to.equal(creator.address);
      expect(questions).to.equal(questionCount);
      expect(started).to.be.false;
      expect(finished).to.be.false;
      expect(quizAnswersHash).to.equal(answersHash);
      expect(players.length).to.equal(2);
      expect(fee).to.equal(entryFee);
      expect(pool).to.equal(entryFee * 2n);
    });
  });

  describe("System Integration Tests", function () {
    it("Should handle multiple concurrent quizzes", async function () {
      const answersHash1 = ethers.keccak256(ethers.toUtf8Bytes("1,2,3"));
      const answersHash2 = ethers.keccak256(ethers.toUtf8Bytes("3,1,2"));
      const entryFee = ethers.parseEther("0.1");

      // Create multiple quizzes of different types
      const basicTx = await quizFactory.connect(creator).createBasicQuiz(3, answersHash1);
      const paidTx = await quizFactory.connect(creator).createPaidQuiz(3, answersHash2, entryFee);

      // Both should succeed
      expect((await basicTx.wait()).status).to.equal(1);
      expect((await paidTx.wait()).status).to.equal(1);
    });

    it("Should handle large prize pools efficiently", async function () {
      const largeEntryFee = ethers.parseEther("5");
      const answersHash = ethers.keccak256(ethers.toUtf8Bytes("1,2,3"));
      
      const tx = await quizFactory.connect(creator).createPaidQuiz(3, answersHash, largeEntryFee);
      const receipt = await tx.wait();
      
      // Get quiz address
      let quizAddress = "";
      for (const log of receipt.logs) {
        try {
          const parsed = quizFactory.interface.parseLog(log);
          if (parsed?.name === "FeeQuizCreated") {
            quizAddress = parsed.args.quizAddress;
            break;
          }
        } catch {
          continue;
        }
      }

      const QuizWithFee = await ethers.getContractFactory("QuizWithFee");
      const quiz = QuizWithFee.attach(quizAddress);

      // Multiple players join with large fees
      await quiz.connect(player1).joinQuiz({ value: largeEntryFee });
      await quiz.connect(player2).joinQuiz({ value: largeEntryFee });
      
      expect(await quiz.prizePool()).to.equal(largeEntryFee * 2n);
    });
  });
});
