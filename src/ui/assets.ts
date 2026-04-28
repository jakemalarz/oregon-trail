export interface AssetManifest {
  version: number;
  images: Record<string, string>;
  midi: Record<string, string>;
  sfx: Record<string, string>;
}

export interface PreloadProgress {
  loaded: number;
  total: number;
  failed: number;
}

const imageCache = new Map<string, HTMLImageElement | null>();
let manifest: AssetManifest | null = null;

export async function loadManifest(url = 'manifest.json'): Promise<AssetManifest> {
  if (manifest) return manifest;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
  manifest = (await res.json()) as AssetManifest;
  return manifest;
}

export function getManifest(): AssetManifest | null {
  return manifest;
}

export function imagePath(id: string): string | null {
  if (!manifest) return null;
  return manifest.images[id] ?? null;
}

export function getImage(id: string): HTMLImageElement | null {
  return imageCache.get(id) ?? null;
}

function loadImage(id: string, path: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(id, img);
      resolve(img);
    };
    img.onerror = () => {
      imageCache.set(id, null);
      resolve(null);
    };
    img.src = path;
  });
}

export async function preloadImages(
  m: AssetManifest,
  onProgress?: (p: PreloadProgress) => void,
): Promise<PreloadProgress> {
  const entries = Object.entries(m.images);
  const total = entries.length;
  let loaded = 0;
  let failed = 0;
  if (total === 0) {
    onProgress?.({ loaded: 0, total: 0, failed: 0 });
    return { loaded: 0, total: 0, failed: 0 };
  }
  await Promise.all(
    entries.map(async ([id, path]) => {
      const img = await loadImage(id, path);
      loaded += 1;
      if (!img) failed += 1;
      onProgress?.({ loaded, total, failed });
    }),
  );
  return { loaded, total, failed };
}

export function imageIdForLandmark(landmarkId: string): string {
  return `lm-${landmarkId}`;
}

export function resetForTests(): void {
  imageCache.clear();
  manifest = null;
}
