type ToneOpts = { freq: number; ms: number; type?: OscillatorType; volume?: number };

const MUTE_KEY = 'oregon-trail-muted-v1';

let ctx: AudioContext | null = null;
let muted = readMuted();
let masterGain: GainNode | null = null;
let musicDuck = 1;

function readMuted(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(v: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    // ignore
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = muted ? 0 : 1;
  masterGain.connect(ctx.destination);
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
  writeMuted(value);
  if (masterGain && ctx) masterGain.gain.value = value ? 0 : 1;
}

export function isMuted(): boolean {
  return muted;
}

export function setMusicDuck(value: number): void {
  musicDuck = Math.max(0, Math.min(1, value));
}

export function getMusicDuck(): number {
  return musicDuck;
}

export function masterNode(): AudioNode | null {
  if (!ctx) getCtx();
  return masterGain;
}

export function tone({ freq, ms, type = 'square', volume = 0.08 }: ToneOpts): void {
  if (muted) return;
  const c = getCtx();
  if (!c || !masterGain) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(masterGain);
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
