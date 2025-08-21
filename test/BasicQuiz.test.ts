import { expect } from "chai";
import { ethers } from "hardhat";

describe("Basic Quiz System Tests", function () {
  let quizFactory: any;
  let platformWallet: any;
  let creator: any;
  let player1: any;
  let player2: any;

  beforeEach(async function () {
    [platformWallet, creator, player1, player2] = await ethers.getSigners();

    // Deploy QuizFactory
    const QuizFactory = await ethers.getContractFactory("QuizFactory");
    quizFactory = await QuizFactory.connect(platformWallet).deploy();
    await quizFactory.waitForDeployment();
  });

  it("Should deploy QuizFactory with correct platform wallet", async function () {
    expect(await quizFactory.platformWallet()).to.equal(platformWallet.address);
  });

  it("Should create a basic quiz successfully", async function () {
    const questionCount = 3;
    const answersString = "1,2,3";
    const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answersString));

    const tx = await quizFactory.connect(creator).createBasicQuiz(questionCount, answersHash);
    const receipt = await tx.wait();
    
    // Check for QuizCreated event
    const events = receipt.logs.filter((log: any) => {
      try {
        const parsed = quizFactory.interface.parseLog(log);
        return parsed?.name === "QuizCreated";
      } catch {
        return false;
      }
    });
    
    expect(events.length).to.be.greaterThan(0);
  });

  it("Should create a paid quiz successfully", async function () {
    const questionCount = 3;
    const answersString = "1,2,3";
    const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answersString));
    const entryFee = ethers.parseEther("0.1");

    const tx = await quizFactory.connect(creator).createPaidQuiz(questionCount, answersHash, entryFee);
    const receipt = await tx.wait();
    
    // Check for FeeQuizCreated event
    const events = receipt.logs.filter((log: any) => {
      try {
        const parsed = quizFactory.interface.parseLog(log);
        return parsed?.name === "FeeQuizCreated";
      } catch {
        return false;
      }
    });
    
    expect(events.length).to.be.greaterThan(0);
  });

  it("Should reject invalid parameters for basic quiz", async function () {
    const answersHash = ethers.keccak256(ethers.toUtf8Bytes("1,2,3"));
    
    // Invalid question count
    await expect(
      quizFactory.connect(creator).createBasicQuiz(0, answersHash)
    ).to.be.revertedWith("Invalid question count (1-50)");
    
    await expect(
      quizFactory.connect(creator).createBasicQuiz(51, answersHash)
    ).to.be.revertedWith("Invalid question count (1-50)");

    // Invalid answers hash (empty string)
    await expect(
      quizFactory.connect(creator).createBasicQuiz(3, ethers.keccak256(ethers.toUtf8Bytes("")))
    ).to.be.revertedWith("Invalid answers hash");
  });

  it("Should reject invalid entry fee for paid quiz", async function () {
    const answersHash = ethers.keccak256(ethers.toUtf8Bytes("1,2,3"));
    
    await expect(
      quizFactory.connect(creator).createPaidQuiz(3, answersHash, 0)
    ).to.be.revertedWith("Entry fee must be greater than 0");
  });

  it("Should interact with created Quiz contract", async function () {
    const questionCount = 3;
    const answersString = "1,2,3";
    const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answersString));

    // Create quiz
    const tx = await quizFactory.connect(creator).createBasicQuiz(questionCount, answersHash);
    const receipt = await tx.wait();
    
    // Get quiz address from event
    let quizAddress: string = "";
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
    
    expect(quizAddress).to.not.equal("");
    
    // Get Quiz contract instance
    const Quiz = await ethers.getContractFactory("Quiz");
    const quiz = Quiz.attach(quizAddress);
    
    // Check quiz info
    const [creatorAddress, questions, started, finished] = await quiz.getQuizInfo();
    expect(creatorAddress).to.equal(creator.address);
    expect(questions).to.equal(questionCount);
    expect(started).to.be.false;
    expect(finished).to.be.false;
  });

  it("Should start and manage Quiz lifecycle", async function () {
    const questionCount = 3;
    const answersString = "1,2,3";
    const answersHash = ethers.keccak256(ethers.toUtf8Bytes(answersString));

    // Create quiz
    const tx = await quizFactory.connect(creator).createBasicQuiz(questionCount, answersHash);
    const receipt = await tx.wait();
    
    // Get quiz address
    let quizAddress: string = "";
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
    const quiz = Quiz.attach(quizAddress);
    
    // Start quiz with players
    const playerAddresses = [player1.address, player2.address];
    await quiz.connect(creator).startQuiz(playerAddresses);
    
    // Verify quiz started
    const [, , started, finished] = await quiz.getQuizInfo();
    expect(started).to.be.true;
    expect(finished).to.be.false;
    
    // Try to start again (should fail)
    await expect(
      quiz.connect(creator).startQuiz(playerAddresses)
    ).to.be.revertedWith("Quiz already started");
  });
});
