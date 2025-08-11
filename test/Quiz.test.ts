import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// This import is needed for the 'it' and 'describe' functions
import "mocha";

describe("Quiz System", function () {
  let quizFactory: Contract;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let player3: SignerWithAddress;

  beforeEach(async function () {
    // Get signers
    [owner, player1, player2, player3] = await ethers.getSigners();

    // Deploy QuizFactory
    const QuizFactory = await ethers.getContractFactory("QuizFactory");
    quizFactory = await QuizFactory.deploy();
    await quizFactory.deployed();
  });

  it("Should create a new quiz", async function () {
    const questionCount = 3;
    const answersString = "1,2,3"; // Example answers
    const answersHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(answersString));

    // Create quiz
    const tx = await quizFactory.createQuiz(
      questionCount,
      answersHash
    );

    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === "QuizCreated");
    expect(event).to.not.be.undefined;
    expect(event.args.quizAddress).to.be.properAddress;
  });

  it("Should allow starting a quiz with players", async function () {
    // Create quiz first
    const questionCount = 3;
    const answersString = "1,2,3"; // Example answers
    const answersHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(answersString));

    const tx = await quizFactory.createQuiz(
      questionCount,
      answersHash
    );

    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === "QuizCreated");
    const quizAddress = event.args.quizAddress;

    // Get quiz contract instance
    const Quiz = await ethers.getContractFactory("Quiz");
    const quiz = Quiz.attach(quizAddress);

    // Prepare player addresses for the quiz
    const playerAddresses = [player1.address, player2.address, player3.address];
    
    // Start quiz with players
    await quiz.startQuiz(playerAddresses);
    
    // Verify quiz started
    const startEvent = receipt.events?.find((e: any) => e.event === "QuizStarted");
    expect(startEvent).to.not.be.undefined;
    
    // Try to verify the quiz has started by checking if we can end it
    // This is an indirect way to check the state since isStarted is private
    await expect(quiz.startQuiz(playerAddresses)).to.be.revertedWith("Quiz already started");
  });

  it("Should handle full quiz lifecycle", async function () {
    // Create quiz
    const questionCount = 3;
    const answersString = "1,2,3"; // Example answers
    const answersHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(answersString));
    
    const tx = await quizFactory.createQuiz(questionCount, answersHash);
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === "QuizCreated");
    const quizAddress = event.args.quizAddress;
    
    // Get quiz contract instance
    const Quiz = await ethers.getContractFactory("Quiz");
    const quiz = Quiz.attach(quizAddress);
    
    // Start quiz with players
    const playerAddresses = [player1.address, player2.address];
    await quiz.startQuiz(playerAddresses);
    
    // Simulate time passing for the quiz duration
    // QUESTION_DURATION is 20 seconds per question
    const quizDuration = 20 * questionCount;
    await ethers.provider.send("evm_increaseTime", [quizDuration + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // End the quiz with winner information
    const winner = player1.address;
    const score = 3; // Perfect score
    await quiz.endQuiz(answersString, winner, score);
    
    // Verify quiz finished
    const finishEvent = receipt.events?.find((e: any) => e.event === "QuizFinished");
    expect(finishEvent).to.not.be.undefined;
    
    // Get quiz results
    const [winnerAddress, winnerScore] = await quiz.getFinishedQuizData();
    expect(winnerAddress).to.equal(winner);
    expect(winnerScore).to.equal(score);
  });

  it("Should not allow non-creator to start or end quiz", async function () {
    // Create quiz
    const questionCount = 3;
    const answersString = "1,2,3";
    const answersHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(answersString));
    
    const tx = await quizFactory.createQuiz(questionCount, answersHash);
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === "QuizCreated");
    const quizAddress = event.args.quizAddress;
    
    // Get quiz contract instance
    const Quiz = await ethers.getContractFactory("Quiz");
    const quiz = Quiz.attach(quizAddress);
    
    // Try to start quiz as non-creator
    const playerAddresses = [player1.address, player2.address];
    await expect(quiz.connect(player1).startQuiz(playerAddresses))
      .to.be.revertedWith("Only creator can call this");
    
    // Start quiz properly
    await quiz.startQuiz(playerAddresses);
    
    // Simulate time passing
    const quizDuration = 20 * questionCount;
    await ethers.provider.send("evm_increaseTime", [quizDuration + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to end quiz as non-creator
    await expect(quiz.connect(player1).endQuiz(answersString, player1.address, 3))
      .to.be.revertedWith("Only creator can call this");
  });
  
  it("Should validate answers hash when ending quiz", async function () {
    // Create quiz
    const questionCount = 3;
    const answersString = "1,2,3";
    const answersHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(answersString));
    
    const tx = await quizFactory.createQuiz(questionCount, answersHash);
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === "QuizCreated");
    const quizAddress = event.args.quizAddress;
    
    // Get quiz contract instance
    const Quiz = await ethers.getContractFactory("Quiz");
    const quiz = Quiz.attach(quizAddress);
    
    // Start quiz
    const playerAddresses = [player1.address, player2.address];
    await quiz.startQuiz(playerAddresses);
    
    // Simulate time passing
    const quizDuration = 20 * questionCount;
    await ethers.provider.send("evm_increaseTime", [quizDuration + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to end quiz with incorrect answers
    const wrongAnswers = "3,2,1";
    await expect(quiz.endQuiz(wrongAnswers, player1.address, 3))
      .to.be.revertedWith("Invalid answers hash");
    
    // End quiz with correct answers
    await quiz.endQuiz(answersString, player1.address, 3);
  });
  
  it("Should not allow ending quiz before time is up", async function () {
    // Create quiz
    const questionCount = 3;
    const answersString = "1,2,3";
    const answersHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(answersString));
    
    const tx = await quizFactory.createQuiz(questionCount, answersHash);
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === "QuizCreated");
    const quizAddress = event.args.quizAddress;
    
    // Get quiz contract instance
    const Quiz = await ethers.getContractFactory("Quiz");
    const quiz = Quiz.attach(quizAddress);
    
    // Start quiz
    const playerAddresses = [player1.address, player2.address];
    await quiz.startQuiz(playerAddresses);
    
    // Try to end quiz immediately (before time is up)
    await expect(quiz.endQuiz(answersString, player1.address, 3))
      .to.be.revertedWith("Quiz still in progress");
    
    // Simulate time passing but not enough
    await ethers.provider.send("evm_increaseTime", [10]);
    await ethers.provider.send("evm_mine", []);
    
    // Try again, should still fail
    await expect(quiz.endQuiz(answersString, player1.address, 3))
      .to.be.revertedWith("Quiz still in progress");
    
    // Simulate enough time passing
    const quizDuration = 20 * questionCount;
    await ethers.provider.send("evm_increaseTime", [quizDuration]);
    await ethers.provider.send("evm_mine", []);
    
    // Now it should work
    await quiz.endQuiz(answersString, player1.address, 3);
  });
});