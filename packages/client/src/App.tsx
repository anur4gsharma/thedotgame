import { useGameStore } from "./store/game-store";
import { MainMenu } from "./components/menu/MainMenu";
import { BoardRenderer } from "./components/board/BoardRenderer";
import { GameHUD } from "./components/game/GameHUD";
import { GameOverModal } from "./components/game/GameOverModal";
import { Lobby } from "./components/lobby/Lobby";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import styles from "./App.module.css";

export function App() {
  const phase = useGameStore((s) => s.phase);
  const board = useGameStore((s) => s.board);

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
    </div>
  );
}
