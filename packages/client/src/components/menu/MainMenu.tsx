import { useState, useEffect } from "react";
import { useGameStore } from "../../store/game-store";
import styles from "./menu.module.css";

const MIN_SIZE = 3;
const MAX_SIZE = 10;

export function MainMenu() {
  const [boardSize, setBoardSize] = useState(5);
  const [joinCode, setJoinCode] = useState("");
  const [activeSection, setActiveSection] = useState<"none" | "play" | "join" | "local">("none");

  const playerName = useGameStore((s) => s.playerName);
  const startLocalGame = useGameStore((s) => s.startLocalGame);
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
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
    startLocalGame(boardId, boardSize, 2);
  };

  const handleCreateRoom = () => {
    createRoom(boardId, boardSize, 2); // strictly 2 players now
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinRoom(joinCode.trim());
  };

  const toggleSection = (section: "play" | "join" | "local") => {
    setActiveSection(activeSection === section ? "none" : section);
  };

  const handleChangeName = () => {
    useGameStore.setState({ phase: "start" });
  };

  return (
    <div className={styles.menu}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <h1 className={styles.title}>THE DOT GAME</h1>
        </div>
        
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <span style={{ fontSize: '18px', fontWeight: 600 }}>{playerName}</span>
          <button 
            onClick={handleChangeName}
            style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'underline', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Change Name
          </button>
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
                {error && <div className={styles.error}>{error}</div>}
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
