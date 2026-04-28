import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadManifest,
  preloadImages,
  imagePath,
  imageIdForLandmark,
  getImage,
  getManifest,
  resetForTests,
  type AssetManifest,
} from '../../src/ui/assets';

const fakeManifest: AssetManifest = {
  version: 1,
  images: { foo: 'img/foo.png', bar: 'img/bar.png' },
  midi: {},
  sfx: {},
};

describe('assets', () => {
  beforeEach(() => {
    resetForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loadManifest fetches and caches the manifest', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeManifest,
    });
    vi.stubGlobal('fetch', fetchMock);
    const m1 = await loadManifest('manifest.json');
    expect(m1).toEqual(fakeManifest);
    const m2 = await loadManifest('manifest.json');
    expect(m2).toBe(m1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getManifest()).toBe(m1);
  });

  it('loadManifest throws on non-OK fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadManifest('manifest.json')).rejects.toThrow(/404/);
  });

  it('imagePath returns null until manifest loads', () => {
    expect(imagePath('foo')).toBeNull();
  });

  it('imagePath returns the path after manifest loads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => fakeManifest }));
    await loadManifest('manifest.json');
    expect(imagePath('foo')).toBe('img/foo.png');
    expect(imagePath('missing')).toBeNull();
  });

  it('imageIdForLandmark prefixes lm-', () => {
    expect(imageIdForLandmark('fort-laramie')).toBe('lm-fort-laramie');
  });

  it('preloadImages reports progress and caches loaded images', async () => {
    class FakeImg {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';
      get src() {
        return this._src;
      }
      set src(v: string) {
        this._src = v;
        queueMicrotask(() => {
          if (v.endsWith('foo.png')) this.onload?.();
          else this.onerror?.();
        });
      }
    }
    vi.stubGlobal('Image', FakeImg as unknown as typeof Image);
    const events: number[] = [];
    const result = await preloadImages(fakeManifest, (p) => events.push(p.loaded));
    expect(result.total).toBe(2);
    expect(result.loaded).toBe(2);
    expect(result.failed).toBe(1);
    expect(events.at(-1)).toBe(2);
    expect(getImage('foo')).not.toBeNull();
    expect(getImage('bar')).toBeNull();
  });

  it('preloadImages handles empty manifest gracefully', async () => {
    const empty: AssetManifest = { version: 1, images: {}, midi: {}, sfx: {} };
    const result = await preloadImages(empty);
    expect(result).toEqual({ loaded: 0, total: 0, failed: 0 });
  });
});
