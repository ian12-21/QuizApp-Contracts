// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Quiz {
    address public creator;
    uint256 public questionCount;
    bytes32 public answersHash; // hash svih točnih odgovora
    uint256 public startTime;
    bool public isStarted;
    bool public isFinished;

    address[] public players;
    mapping(address => bytes32) public commitments; // commit faza
    mapping(address => uint256) public scores;

    address public winner;
    uint256 public winnerScore;

    uint256 private constant QUESTION_DURATION = 30 seconds;
    uint256 private constant COMMIT_PHASE_DURATION = 5 minutes; // za testiranje, može biti dulje

    event PlayerJoined(address player);
    event QuizStarted(uint256 startTime);
    event QuizFinished(address winner, uint256 score);

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }

    modifier quizActive() {
        require(isStarted && !isFinished, "Quiz not active");
        _;
    }

    constructor(
        address _creator,
        uint256 _questionCount,
        bytes32 _answersHash
    ) {
        require(_questionCount > 0, "Invalid question count");
        require(_answersHash != keccak256(""), "Invalid answers hash");

        creator = _creator;
        questionCount = _questionCount;
        answersHash = _answersHash;
    }

    // Prijava igrača prije starta
    function joinQuiz() external {
        require(!isStarted, "Quiz already started");
        require(commitments[msg.sender] == bytes32(0), "Already joined");
        players.push(msg.sender);
        emit PlayerJoined(msg.sender);
    }

    // Igrač šalje commit (hash svojih odgovora) prije završetka commit faze
    function commitAnswers(bytes32 commitHash) external quizActive {
        require(block.timestamp <= startTime + (questionCount * QUESTION_DURATION), "Quiz time over");
        commitments[msg.sender] = commitHash;
    }

    // Početak kviza
    function startQuiz() external onlyCreator {
        require(!isStarted, "Quiz already started");
        require(players.length > 0, "No players joined");
        isStarted = true;
        startTime = block.timestamp;
        emit QuizStarted(startTime);
    }

    // Creator unosi točne odgovore i otkriva rezultate
    function endQuizAndReveal(
        string calldata correctAnswers,
        address[] calldata revealedPlayers,
        string[] calldata revealedAnswers
    ) external onlyCreator {
        require(isStarted && !isFinished, "Invalid state");
        require(
            block.timestamp > startTime + (questionCount * QUESTION_DURATION),
            "Quiz still in progress"
        );
        require(
            keccak256(abi.encodePacked(correctAnswers)) == answersHash,
            "Invalid correct answers"
        );
        require(revealedPlayers.length == revealedAnswers.length, "Mismatched arrays");

        // Računanje rezultata
        for (uint256 i = 0; i < revealedPlayers.length; i++) {
            address player = revealedPlayers[i];
            if (commitments[player] == keccak256(abi.encodePacked(revealedAnswers[i]))) {
                // ovdje bi išla off-chain provjera točnosti pojedinih odgovora
                // simulacija: svi koji su prošli commit dobiju full score
                scores[player] = questionCount;
                if (scores[player] > winnerScore) {
                    winnerScore = scores[player];
                    winner = player;
                }
            }
        }

        isFinished = true;
        emit QuizFinished(winner, winnerScore);
    }

    // Dohvat podataka završenog kviza
    function getWinner() external view returns (address, uint256) {
        require(isFinished, "Quiz not finished");
        return (winner, winnerScore);
    }

    function getPlayers() external view returns (address[] memory) {
        return players;
    }
}
