class HapticsManager {
  private enabled = true;

  toggle(enabled: boolean) {
    this.enabled = enabled;
  }

  vibrate(pattern: number | number[]) {
    if (!this.enabled || !('vibrate' in navigator)) return;
    navigator.vibrate(pattern);
  }

  playMove() {
    this.vibrate(10);
  }

  playScore() {
    this.vibrate([20, 30, 20]);
  }

  playWin() {
    this.vibrate([50, 50, 50, 50, 100]);
  }
}

export const haptics = new HapticsManager();
