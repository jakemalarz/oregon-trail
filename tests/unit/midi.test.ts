import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.mock('tone', () => {
  class FakePart {
    loop = false;
    loopEnd = 0;
    constructor(_cb: unknown, _events: unknown) {}
    start() {}
    stop() {}
    dispose() {}
  }
  class FakePolySynth {
    constructor(_voice?: unknown, _opts?: unknown) {}
    triggerAttackRelease() {}
    connect() { return this; }
    dispose() {}
  }
  class FakeGain {
    gain = { rampTo: vi.fn() };
    constructor(_v: number) {}
    toDestination() { return this; }
    dispose() {}
  }
  return {
    start: vi.fn().mockResolvedValue(undefined),
    Part: FakePart,
    PolySynth: FakePolySynth,
    Synth: class {},
    Gain: FakeGain,
    Transport: { start: vi.fn(), pause: vi.fn() },
  };
});

vi.mock('@tonejs/midi', () => {
  class FakeMidi {
    duration = 8;
    tracks = [{ notes: [{ time: 0, name: 'C4', duration: 0.25, velocity: 0.8 }] }];
    constructor(_buf: ArrayBuffer) {}
  }
  return { Midi: FakeMidi };
});

import { play, stop, setMidiPaths, activeTrack, duck, unduck, resetForTests } from '../../src/ui/midi';
import * as Tone from 'tone';

describe('midi', () => {
  beforeEach(() => {
    resetForTests();
    setMidiPaths({ title: 'midi/title.mid', store: 'midi/store.mid' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }));
    localStorage.removeItem('oregon-trail-muted-v1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('play loads and starts a track', async () => {
    await play('title', { loop: true });
    expect(activeTrack()).toBe('title');
    expect((Tone.start as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('play is a no-op when the same track is already active', async () => {
    await play('title');
    await play('title');
    expect(activeTrack()).toBe('title');
  });

  it('switching tracks stops the previous one', async () => {
    await play('title');
    await play('store');
    expect(activeTrack()).toBe('store');
  });

  it('stop tears down the active track', async () => {
    await play('title');
    stop();
    expect(activeTrack()).toBeNull();
  });

  it('duck and unduck no-op when nothing is playing', () => {
    expect(() => duck(0.2)).not.toThrow();
    expect(() => unduck()).not.toThrow();
  });

  it('play does nothing when muted', async () => {
    localStorage.setItem('oregon-trail-muted-v1', '1');
    await import('../../src/ui/sfx').then((m) => m.setMuted(true));
    await play('title');
    expect(activeTrack()).toBeNull();
  });

  it('play with no manifest path is a silent no-op', async () => {
    setMidiPaths({});
    await play('title');
    expect(activeTrack()).toBeNull();
  });

  it('play tolerates a failed fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await play('title');
    expect(activeTrack()).toBeNull();
  });
});
