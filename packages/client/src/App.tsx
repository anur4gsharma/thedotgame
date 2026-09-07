import { useEffect } from "react";
import { useGameStore } from "./store/game-store";
import { MainMenu } from "./components/menu/MainMenu";
import { StartMenu } from "./components/menu/StartMenu";
import { BoardRenderer } from "./components/board/BoardRenderer";
import { GameHUD } from "./components/game/GameHUD";
import { GameOverModal } from "./components/game/GameOverModal";
import { Lobby } from "./components/lobby/Lobby";
import { Toast } from "./components/ui/Toast";
import { Cursor } from "./components/ui/Cursor";
import { PageTransition } from "./components/ui/PageTransition";
import styles from "./App.module.css";

export function App() {
  useEffect(() => { useGameStore.getState().restoreSession(); }, []);
  const phase = useGameStore((s) => s.phase);
  const board = useGameStore((s) => s.board);
  const error = useGameStore((s) => s.error);

  return (
    <div className={styles.app}>
      <Cursor />
      <PageTransition pageKey={phase}>
      {phase === "start" && <StartMenu />}

      {phase === "menu" && <MainMenu />}

      {phase === "lobby" && <Lobby />}

      {(phase === "playing" || phase === "gameover") && board && (
        <div className={styles.gameContainer}>
          <div className={styles.boardSection}>
            <BoardRenderer board={board} />
          </div>
          <div className={styles.railSection}>
            <GameHUD />
            {phase === "gameover" && <GameOverModal />}
          </div>
        </div>
      )}

      </PageTransition>
      {error && <Toast message={error} onClose={() => useGameStore.setState({ error: null })} />}
    </div>
  );
}
