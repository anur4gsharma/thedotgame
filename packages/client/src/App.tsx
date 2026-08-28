import { useGameStore } from "./store/game-store";
import { MainMenu } from "./components/menu/MainMenu";
import { BoardRenderer } from "./components/board/BoardRenderer";
import { GameHUD } from "./components/game/GameHUD";
import { GameOverModal } from "./components/game/GameOverModal";
import { Lobby } from "./components/lobby/Lobby";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { Toast } from "./components/ui/Toast";
import styles from "./App.module.css";

export function App() {
  const phase = useGameStore((s) => s.phase);
  const board = useGameStore((s) => s.board);
  const error = useGameStore((s) => s.error);

  return (
    <div className={styles.app}>
      <ThemeToggle />

      {phase === "menu" && <MainMenu />}

      {phase === "lobby" && <Lobby />}

      {(phase === "playing" || phase === "gameover") && board && (
        <div className={styles.gameContainer}>
          <BoardRenderer board={board} />
          <GameHUD />
          {phase === "gameover" && <GameOverModal />}
        </div>
      )}

      {error && <Toast message={error} onClose={() => useGameStore.setState({ error: null })} />}
    </div>
  );
}
