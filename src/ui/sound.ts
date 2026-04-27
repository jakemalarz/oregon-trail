type ToneOpts = { freq: number; ms: number; type?: OscillatorType; volume?: number };

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

export function tone({ freq, ms, type = 'square', volume = 0.08 }: ToneOpts): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(c.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000);
  osc.stop(c.currentTime + ms / 1000);
}

export function beep(): void { tone({ freq: 880, ms: 60 }); }
export function blip(): void { tone({ freq: 660, ms: 40 }); }
export function shoot(): void { tone({ freq: 110, ms: 100, type: 'sawtooth' }); }
export function hit(): void { tone({ freq: 220, ms: 150, type: 'triangle' }); }
export function fanfare(): void {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => setTimeout(() => tone({ freq: n, ms: 200 }), i * 180));
}
export function dirge(): void {
  const notes = [330, 294, 262, 196];
  notes.forEach((n, i) => setTimeout(() => tone({ freq: n, ms: 350, type: 'triangle' }), i * 320));
}
