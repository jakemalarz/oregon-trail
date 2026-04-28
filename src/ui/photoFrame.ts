import { el } from './dom';
import { getImage } from './assets';

export interface PhotoFrameOptions {
  imageId: string;
  caption?: string;
  fallbackArt?: string;
  width?: number;
  height?: number;
}

export const PHOTO_W = 480;
export const PHOTO_H = 300;

const ASCII_FALLBACK = `+----------------------------------------+
|              [ no photo ]              |
+----------------------------------------+`;

export function photoFrame(opts: PhotoFrameOptions): HTMLElement {
  const w = opts.width ?? PHOTO_W;
  const h = opts.height ?? PHOTO_H;
  const wrap = el('div', { class: 'photo-frame' });
  wrap.setAttribute('data-testid', `photo-${opts.imageId}`);
  wrap.style.width = `${w}px`;

  const img = getImage(opts.imageId);
  if (img) {
    const node = el('img', { src: img.src, alt: opts.caption ?? '' }) as HTMLImageElement;
    node.width = w;
    node.height = h;
    wrap.appendChild(node);
  } else {
    const ascii = el('pre', { class: 'photo-fallback', text: opts.fallbackArt ?? ASCII_FALLBACK });
    ascii.setAttribute('data-testid', `photo-${opts.imageId}-fallback`);
    wrap.appendChild(ascii);
  }

  if (opts.caption) {
    const cap = el('p', { class: 'photo-caption', text: opts.caption });
    wrap.appendChild(cap);
  }
  return wrap;
}
