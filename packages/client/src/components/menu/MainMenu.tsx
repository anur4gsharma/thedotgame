import { useState, useEffect } from "react";
import { useGameStore } from "../../store/game-store";
import styles from "./menu.module.css";

const MIN_SIZE = 3;
const MAX_SIZE = 10;

export function MainMenu() {
  const [playerName, setPlayerName] = useState("Player");
  const [boardSize, setBoardSize] = useState(5);
  const [joinCode, setJoinCode] = useState("");
  const [activeSection, setActiveSection] = useState<"none" | "play" | "join" | "local">("none");

  const startLocalGame = useGameStore((s) => s.startLocalGame);
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const setStoreName = useGameStore((s) => s.setPlayerName);
  const error = useGameStore((s) => s.error);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      setJoinCode(room.toUpperCase());
      setActiveSection("join");
    }
  }, []);

  const boardId = `square-${boardSize}x${boardSize}`;

  const handleLocalPlay = () => {
    setStoreName(playerName);
    startLocalGame(boardId, boardSize, 2);
  };

  const handleCreateRoom = () => {
    setStoreName(playerName);
    createRoom(boardId, boardSize, 2); // strictly 2 players now
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    setStoreName(playerName);
    joinRoom(joinCode.trim());
  };

  const toggleSection = (section: "play" | "join" | "local") => {
    setActiveSection(activeSection === section ? "none" : section);
  };

  return (
    <div className={styles.menu}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <h1 className={styles.title}>THE DOT GAME</h1>
        </div>

        <div className={styles.nav}>
          {/* PLAY ONLINE */}
          <div>
            <button className={styles.navItem} onClick={() => toggleSection("play")}>
              <div className={styles.navTitle}>Play</div>
              <div className={styles.navDesc}>Find an opponent</div>
            </button>
            {activeSection === "play" && (
              <div className={styles.configArea}>
                <div className={styles.field}>
                  <label className={styles.label}>Your Call Sign</label>
                  <input
                    className={styles.input}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                    placeholder="Enter name..."
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Grid Size: {boardSize} × {boardSize}</label>
                  <input
                    className={styles.slider}
                    type="range"
                    min={MIN_SIZE}
                    max={MAX_SIZE}
                    value={boardSize}
                    onChange={(e) => setBoardSize(Number(e.target.value))}
                  />
                </div>
                <button className={styles.startBtn} onClick={handleCreateRoom}>
                  Host Match
                </button>
              </div>
            )}
          </div>

          {/* JOIN */}
          <div>
            <button className={styles.navItem} onClick={() => toggleSection("join")}>
              <div className={styles.navTitle}>Join</div>
              <div className={styles.navDesc}>Enter a match code</div>
            </button>
            {activeSection === "join" && (
              <div className={styles.configArea}>
                <div className={styles.field}>
                  <label className={styles.label}>Your Call Sign</label>
                  <input
                    className={styles.input}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Match Code</label>
                  <input
                    className={styles.input}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="XXXXXX"
                    autoFocus
                  />
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <button 
                  className={styles.startBtn} 
                  onClick={handleJoin}
                  disabled={joinCode.length < 4}
                >
                  Connect
                </button>
              </div>
            )}
          </div>

          {/* LOCAL */}
          <div>
            <button className={styles.navItem} onClick={() => toggleSection("local")}>
              <div className={styles.navTitle}>Local</div>
              <div className={styles.navDesc}>Play on this device</div>
            </button>
            {activeSection === "local" && (
              <div className={styles.configArea}>
                <div className={styles.field}>
                  <label className={styles.label}>Grid Size: {boardSize} × {boardSize}</label>
                  <input
                    className={styles.slider}
                    type="range"
                    min={MIN_SIZE}
                    max={MAX_SIZE}
                    value={boardSize}
                    onChange={(e) => setBoardSize(Number(e.target.value))}
                  />
                </div>
                <button className={styles.startBtn} onClick={handleLocalPlay}>
                  Start Local Match
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
