const { Server } = require("socket.io");

const io = new Server(3001, {
  cors: { origin: "*" }
});

console.log("✅ Socket.IO server running on port 3001");

let game = {
  phase: "LOBBY",
  players: [],
  currentTurn: 0,
  timeLeft: 60,
  roundActive: false,
  secretWord: ""
};

let timerInterval = null;

function sendGameState() {
  io.emit("game-state", game);
}

const words = [
  "apple",
  "banana",
  "cat",
  "dog",
  "elephant",
  "flower",
  "guitar",
  "house",
  "ice cream",
  "jungle"
];

function pickWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function startGame() {
  game.phase =  "PLAYING";
  game.currentTurn = 0;
  game.timeLeft = 60;
  game.roundActive = false;
  startTurn();
}

function startTurn() {
  if (game.players.length === 0) return;

  game.roundActive = true;
  game.timeLeft = 5;

  game.secretWord = pickWord();

  sendGameState();

  timerInterval = setInterval(() => {
    game.timeLeft--;

    sendGameState();

    if (game.timeLeft <= 0) {
      endTurn();
      return;
    }
  }, 1000);
}

function endTurn() {
  clearInterval(timerInterval);
  timerInterval = null;

  game.roundActive = false;
  game.currentTurn =
    (game.currentTurn + 1) % game.players.length;

  sendGameState();

  // Start next turn after 2 seconds
  setTimeout(startTurn, 2000);
}

io.on("connection", socket => {

  if (game.phase !== "LOBBY") {
    socket.emit("blocked", "Game already started");
    socket.disconnect();
    return;
  }

  console.log("🎮 Player connected:", socket.id);

  game.players.push({
    id: socket.id,
    score: 0
  });

  // Start game when first player joins
  socket.on("start-game", () => {
    if (game.phase === "LOBBY") {
      startGame();
    }
  });

  socket.on("draw", data => {
    // Broadcast drawing to everyone except drawer
    socket.broadcast.emit("draw", data);
  });

  socket.on("clear-canvas", () => {
    io.emit("clear-canvas");
  });

  sendGameState();

  socket.on("disconnect", () => {
    console.log("❌ Player disconnected:", socket.id);
    game.players = game.players.filter(
      p => p.id !== socket.id
    );

    game.currentTurn = 0;

    if (game.players.length === 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      game.roundActive = false;
    }

    sendGameState();
  });
});
