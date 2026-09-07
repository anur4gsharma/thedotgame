import { useEffect, useMemo, useState } from "react";
import { DEFAULT_BOARD_VISUAL, type BoardPreset, type RoomSettings, type TimerMode } from "@dots-game/shared";
import { useGameStore } from "../../store/game-store";
import styles from "./menu.module.css";

const presets: BoardPreset[] = ["classic", "minimal", "neon", "blueprint", "paper", "monochrome", "arcade", "soft", "midnight"];
const timerModes: TimerMode[] = [0, 15, 30, 45, 60, 90, 120];

export function MainMenu() {
  const [width, setWidth] = useState(5); const [height, setHeight] = useState(5); const [players, setPlayers] = useState<2 | 3 | 4>(2); const [timerMode, setTimerMode] = useState<TimerMode>(30); const [preset, setPreset] = useState<BoardPreset>("classic"); const [joinCode, setJoinCode] = useState(""); const [active, setActive] = useState<"play" | "join" | "local" | null>(null);
  const playerName = useGameStore((state) => state.playerName); const error = useGameStore((state) => state.error); const createRoom = useGameStore((state) => state.createRoom); const joinRoom = useGameStore((state) => state.joinRoom); const startLocalGame = useGameStore((state) => state.startLocalGame);
  const visual = useMemo(() => ({ ...DEFAULT_BOARD_VISUAL, preset }), [preset]);
  const board = useMemo(() => ({ width, height, visual }), [width, height, visual]);
  const settings: RoomSettings = { board, maxPlayers: players, timerMode };

  useEffect(() => { const room = new URLSearchParams(window.location.search).get("room"); if (room) { setJoinCode(room.toUpperCase()); setActive("join"); } }, []);
  const timerLabel = timerMode === 0 ? "No timer" : timerMode === 120 ? "2 minutes" : `${timerMode} seconds`;
  const toggle = (section: "play" | "join" | "local") => setActive(active === section ? null : section);
  const changeName = () => { useGameStore.setState({ phase: "start" }); };

  return <div className={styles.menu}><div className={styles.content}>
    <div className={styles.logo}><h1 className={styles.title}>THE DOT GAME</h1><p style={{ opacity: 0.6 }}>Draw lines. Claim squares. Take the turn.</p></div>
    <div style={{ marginBottom: 28, display: "flex", alignItems: "baseline", gap: 14 }}><span style={{ fontWeight: 700 }}>{playerName}</span><button onClick={changeName} style={{ fontSize: 12, textDecoration: "underline" }}>Change name</button></div>
    <div className={styles.nav}>
      <section><button className={styles.navItem} onClick={() => toggle("play")}><div className={styles.navTitle}>Play online</div><div className={styles.navDesc}>Create a room and invite friends</div></button>{active === "play" && <div className={styles.configArea}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><label className={styles.field}><span className={styles.label}>Width · {width}</span><input className={styles.slider} type="range" min="2" max="12" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label><label className={styles.field}><span className={styles.label}>Height · {height}</span><input className={styles.slider} type="range" min="2" max="12" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></label></div>
        <label className={styles.field}><span className={styles.label}>Players</span><select className={styles.input} value={players} onChange={(event) => setPlayers(Number(event.target.value) as 2 | 3 | 4)}><option value="2">2 players</option><option value="3">3 players</option><option value="4">4 players</option></select></label>
        <label className={styles.field}><span className={styles.label}>Turn timer · {timerLabel}</span><select className={styles.input} value={timerMode} onChange={(event) => setTimerMode(Number(event.target.value) as TimerMode)}>{timerModes.map((mode) => <option key={mode} value={mode}>{mode === 0 ? "No timer" : mode === 120 ? "2 minutes" : `${mode} seconds`}</option>)}</select></label>
        <label className={styles.field}><span className={styles.label}>Board style</span><select className={styles.input} value={preset} onChange={(event) => setPreset(event.target.value as BoardPreset)}>{presets.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
        {error && <div className={styles.error}>{error}</div>}<button className={styles.startBtn} onClick={() => createRoom(settings)}>Host room</button>
      </div>}</section>
      <section><button className={styles.navItem} onClick={() => toggle("join")}><div className={styles.navTitle}>Join a room</div><div className={styles.navDesc}>Use a code or invite link</div></button>{active === "join" && <div className={styles.configArea}><label className={styles.field}><span className={styles.label}>Room code</span><input className={styles.input} autoFocus value={joinCode} maxLength={12} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABCD12" /></label>{error && <div className={styles.error}>{error}</div>}<button className={styles.startBtn} disabled={joinCode.length < 4} onClick={() => joinRoom(joinCode)}>Join room</button></div>}</section>
      <section><button className={styles.navItem} onClick={() => toggle("local")}><div className={styles.navTitle}>Play locally</div><div className={styles.navDesc}>Practice with friends on one device</div></button>{active === "local" && <div className={styles.configArea}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><label className={styles.field}><span className={styles.label}>Width · {width}</span><input className={styles.slider} type="range" min="2" max="12" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label><label className={styles.field}><span className={styles.label}>Height · {height}</span><input className={styles.slider} type="range" min="2" max="12" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></label></div><label className={styles.field}><span className={styles.label}>Timer · {timerLabel}</span><select className={styles.input} value={timerMode} onChange={(event) => setTimerMode(Number(event.target.value) as TimerMode)}>{timerModes.map((mode) => <option key={mode} value={mode}>{mode === 0 ? "No timer" : `${mode}s`}</option>)}</select></label><button className={styles.startBtn} onClick={() => startLocalGame(board, players, timerMode)}>Start local match</button></div>}</section>
    </div>
  </div></div>;
}
