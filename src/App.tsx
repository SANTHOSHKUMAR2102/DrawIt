import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

/* ---------- Types ---------- */
type Player = {
  id: string;
  score: number;
};

type GameState = {
  phase: "LOBBY" | "PLAYING";
  players: Player[];
  currentTurn: number;
  timeLeft: number;
  roundActive: boolean;
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [myId, setMyId] = useState("");
  const [secretWord, setSecretWord] = useState("");

  const [game, setGame] = useState<GameState>({
    phase: "LOBBY",
    players: [],
    currentTurn: 0,
    timeLeft: 0,
    roundActive: false
  });

  const isDrawer = game.players[game.currentTurn]?.id === myId;

  /* ---------- Canvas ---------- */
  function getCtx() {
    return canvasRef.current?.getContext("2d");
  }

  function startDraw(e: React.MouseEvent) {
    if (!isDrawer) return;

    const ctx = getCtx();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    isDrawing.current = true;

    socket?.emit("draw", {
      type: "begin",
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    });
  }

  function draw(e: React.MouseEvent) {
    if (!isDrawer || !isDrawing.current) return;

    const ctx = getCtx();
    if (!ctx) return;

    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();

    socket?.emit("draw", {
      type: "draw",
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    });
  }

  function stopDraw() {
    isDrawing.current = false;
  }

  /* ---------- Socket ---------- */
  useEffect(() => {
    const s = io("http://localhost:3001");
    setSocket(s);

    s.on("connect", () => setMyId(s.id || ""));

    s.on("game-state", (state: GameState) => {
      setGame(state);
    });

    s.on("secret-word", (word: string) => {
      setSecretWord(word);
    });

    s.on("draw", data => {
      const ctx = getCtx();
      if (!ctx) return;

      if (data.type === "begin") {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
      } else {
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      }
    });

    s.on("clear-canvas", () => {
      getCtx()?.clearRect(0, 0, 600, 400);
    });

    s.on("blocked", alert);

    return () => {
      s.disconnect();
    };
  }, []);
  

  /* 🔐 Ask secret word when YOU become drawer */
  useEffect(() => {
    if (!socket) return;

    if (isDrawer && game.roundActive) {
      socket.emit("secret-word");
    } else {
      setSecretWord("");
    }
  }, [isDrawer, game.roundActive, socket]);

  /* ---------- UI ---------- */
  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>🎨 Draw & Guess</h1>

      {game.phase === "LOBBY" && (
        <>
          <h2>🏠 Lobby</h2>
          <button
            disabled={game.players.length < 2}
            onClick={() => socket?.emit("start-game")}
          >
            Start Game
          </button>
        </>
      )}

      {game.phase === "PLAYING" && (
        <>
          <h2>⏱ {game.timeLeft}s</h2>

          <h3>
            Role: {isDrawer ? "🧑‍🎨 DRAWER" : "🤔 GUESSER"}
          </h3>

          {isDrawer && (
            <>
              <h2>🔐 Secret Word</h2>
              <h1>{secretWord}</h1>
            </>
          )}

          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            style={{
              border: "2px solid black",
              cursor: isDrawer ? "crosshair" : "not-allowed"
            }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
          />

          {isDrawer && (
            <button onClick={() => socket?.emit("clear-canvas")}>
              Clear
            </button>
          )}

        </>

        
      )}
      <section>
          <h2>👥 Players</h2>
          {game.players.map((p, i) => (
            <div key={p.id}>
              Player {i + 1}
              {i === game.currentTurn && " 🎨"}
              {p.id === myId && " (You)"}
              {" — Score: "}
              {p.score}
            </div>
          ))}
        </section>
    </div>
  );
}

export default App;
