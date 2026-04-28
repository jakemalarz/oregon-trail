import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { isMuted, getMusicDuck } from './sfx';

export type TrackId =
  | 'title'
  | 'travel_a'
  | 'travel_b'
  | 'hunt'
  | 'victory'
  | 'dirge'
  | 'store'
  | 'landmark';

interface ActiveTrack {
  id: TrackId;
  parts: Tone.Part[];
  synth: Tone.PolySynth;
  gain: Tone.Gain;
  loop: boolean;
}

let manifestPaths: Partial<Record<TrackId, string>> = {};
let started = false;
let active: ActiveTrack | null = null;
const midiCache = new Map<TrackId, Midi>();

export function setMidiPaths(paths: Record<string, string>): void {
  manifestPaths = paths as Partial<Record<TrackId, string>>;
}

export async function startAudio(): Promise<void> {
  if (started) return;
  await Tone.start();
  started = true;
}

async function loadMidi(id: TrackId): Promise<Midi | null> {
  if (midiCache.has(id)) return midiCache.get(id)!;
  const path = manifestPaths[id];
  if (!path) return null;
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const midi = new Midi(buf);
    midiCache.set(id, midi);
    return midi;
  } catch {
    return null;
  }
}

function stopActive(): void {
  if (!active) return;
  for (const p of active.parts) {
    p.stop();
    p.dispose();
  }
  active.synth.dispose();
  active.gain.dispose();
  active = null;
}

function makeSynth(id: TrackId): Tone.PolySynth {
  const oscType = id === 'travel_a' || id === 'travel_b' ? 'square'
    : id === 'hunt' ? 'sawtooth'
    : 'triangle';
  return new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: oscType },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.4 },
  });
}

export async function play(id: TrackId, opts: { loop?: boolean } = {}): Promise<void> {
  if (isMuted()) return;
  if (active?.id === id) return;
  await startAudio();
  const midi = await loadMidi(id);
  if (!midi) return;
  stopActive();

  const synth = makeSynth(id);
  const gain = new Tone.Gain(0.4 * getMusicDuck()).toDestination();
  synth.connect(gain);

  const parts: Tone.Part[] = midi.tracks
    .filter((t) => t.notes.length > 0)
    .map((track) => {
      const events = track.notes.map((n) => ({
        time: n.time,
        note: n.name,
        duration: n.duration,
        velocity: n.velocity,
      }));
      const part = new Tone.Part((time, ev) => {
        synth.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
      }, events);
      part.loop = !!opts.loop;
      if (opts.loop) part.loopEnd = midi.duration;
      part.start(0);
      return part;
    });

  active = { id, parts, synth, gain, loop: !!opts.loop };
  Tone.Transport.start();
}

export function stop(): void {
  stopActive();
  Tone.Transport.pause();
}

export function duck(value: number): void {
  if (!active) return;
  active.gain.gain.rampTo(0.4 * Math.max(0, Math.min(1, value)), 0.2);
}

export function unduck(): void {
  if (!active) return;
  active.gain.gain.rampTo(0.4, 0.2);
}

export function activeTrack(): TrackId | null {
  return active?.id ?? null;
}

export function resetForTests(): void {
  stopActive();
  midiCache.clear();
  manifestPaths = {};
  started = false;
}
