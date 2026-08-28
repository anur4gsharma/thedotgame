import { useGameStore } from "./store/game-store";
import { MainMenu } from "./components/menu/MainMenu";
import { BoardRenderer } from "./components/board/BoardRenderer";
import { GameHUD } from "./components/game/GameHUD";
import { GameOverModal } from "./components/game/GameOverModal";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import styles from "./App.module.css";

export function App() {
  const phase = useGameStore((s) => s.phase);
  const board = useGameStore((s) => s.board);

  return (
    <div className={styles.app}>
      <ThemeToggle />

      {phase === "menu" && <MainMenu />}

      {phase === "playing" && board && (
        <div className={styles.gameContainer}>
          <BoardRenderer board={board} />
          <GameHUD />
        </div>
      )}

      {phase === "gameover" && board && (
        <div className={styles.gameContainer}>
          <BoardRenderer board={board} />
          <GameHUD />
          <GameOverModal />
        </div>
      )}
    </div>
  );
}
