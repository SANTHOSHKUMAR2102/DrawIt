import { useEffect, useState } from "react";
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

  useEffect(() => {
    const s = io("http://localhost:3001");
    setSocket(s);

    s.on("connect", () => {
      setMyId(s.id || "");
    });

    s.on("game-state", (state: GameState) => {
      setGame(state);
    });

    s.on("secret-word", (word: string) => {
      setSecretWord(word);
    });

    s.on("blocked", msg => {
      alert(msg);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const isDrawer =
    game.players[game.currentTurn]?.id === myId;

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>🎨 Draw & Guess</h1>

      {/* ---------- LOBBY ---------- */}
      {game.phase === "LOBBY" && (
        <section>
          <h2>🏠 Lobby</h2>
          <p>Waiting for players...</p>

          <ul>
            {game.players.map((p, i) => (
              <li key={p.id}>
                Player {i + 1}
                {p.id === myId && " (You)"}
              </li>
            ))}
          </ul>

          <button
            disabled={game.players.length < 2}
            onClick={() => socket?.emit("start-game")}
          >
            Start Game
          </button>
        </section>
      )}

      {/* ---------- GAME ---------- */}
      {game.phase === "PLAYING" && (
        <>
          <section>
            <h2>⏱ Time Left</h2>
            <h1>{game.timeLeft}s</h1>
          </section>

          <section>
            <h2>🧑‍🎨 Your Role</h2>
            <h3>{isDrawer ? "DRAWER" : "GUESSER"}</h3>

            {isDrawer ? (
              <div>
                <h2>🔐 Secret Word</h2>
                <h1>{secretWord}</h1>
              </div>
            ) : (
              <p>🤔 Guess the word...</p>
            )}
          </section>

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
        </>
      )}
    </div>
  );
}

export default App;
