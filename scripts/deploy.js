import { ethers } from "hardhat";

async function main() {
  // Deploy QuizFactory
  const QuizFactory = await ethers.getContractFactory("QuizFactory");
  const quizFactory = await QuizFactory.deploy();
  await quizFactory.deployed();

  console.log("QuizFactory deployed to:", quizFactory.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
