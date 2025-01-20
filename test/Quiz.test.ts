import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Quiz System", function () {
  let quizFactory: Contract;
  let mockToken: Contract;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;

  beforeEach(async function () {
    // Get signers
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy();
    await mockToken.deployed();

    // Deploy QuizFactory
    const QuizFactory = await ethers.getContractFactory("QuizFactory");
    quizFactory = await QuizFactory.deploy();
    await quizFactory.deployed();
  });

  it("Should create a new quiz", async function () {
    const questionCount = 3;
    const prizeAmount = ethers.utils.parseEther("1");
    const questionHashes = [
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Q1")),
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Q2")),
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Q3"))
    ];

    // Approve token spending
    await mockToken.approve(quizFactory.address, prizeAmount);

    // Create quiz
    const tx = await quizFactory.createQuiz(
      questionCount,
      prizeAmount,
      mockToken.address,
      questionHashes
    );

    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === "QuizCreated");
    expect(event).to.not.be.undefined;
    expect(event.args.quizAddress).to.be.properAddress;
  });

  it("Should allow players to join quiz", async function () {
    // Create quiz first
    const questionCount = 3;
    const prizeAmount = ethers.utils.parseEther("1");
    const questionHashes = [
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Q1")),
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Q2")),
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Q3"))
    ];

    await mockToken.approve(quizFactory.address, prizeAmount);
    const tx = await quizFactory.createQuiz(
      questionCount,
      prizeAmount,
      mockToken.address,
      questionHashes
    );

    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === "QuizCreated");
    const quizAddress = event.args.quizAddress;
    const pin = event.args.pin;

    // Get quiz contract instance
    const Quiz = await ethers.getContractFactory("Quiz");
    const quiz = Quiz.attach(quizAddress);

    // Player 1 joins
    await quiz.connect(player1).joinQuiz();
    
    // Verify player joined
    const playerAddress = await quiz.playerAddresses(0);
    expect(playerAddress).to.equal(player1.address);
  });

  it("Should handle full quiz lifecycle", async function () {
    // Similar setup as above
    // ... create quiz and join players ...

    // Start quiz
    await quiz.startQuiz();

    // Submit answers
    await quiz.connect(player1).submitAnswer(0, 1); // Player 1 answers first question
    await quiz.connect(player2).submitAnswer(0, 2); // Player 2 answers first question

    // Wait for question duration
    await ethers.provider.send("evm_increaseTime", [15]); // 15 seconds
    await ethers.provider.send("evm_mine", []);

    // Continue with more answers...

    // Finish quiz
    const correctAnswerHashes = questionHashes.map((_, i) => 
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`A${i}`))
    );
    await quiz.verifyAndFinishQuiz(correctAnswerHashes);

    // Verify winner received prize
    const winnerBalance = await mockToken.balanceOf(player1.address);
    expect(winnerBalance).to.equal(prizeAmount);
  });
});