class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
  }

  playTone(freq: number, type: OscillatorType, duration: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
    osc.stop(this.ctx.currentTime + duration);
  }

  playMove() {
    this.playTone(440, 'sine', 0.1);
  }

  playScore() {
    this.playTone(880, 'sine', 0.2);
  }

  playWin() {
    this.playTone(523.25, 'triangle', 0.1);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.1), 100);
    setTimeout(() => this.playTone(783.99, 'triangle', 0.3), 200);
  }
}

export const sound = new SoundManager();
