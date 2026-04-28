import { describe, it, expect, beforeEach } from 'vitest';
import { photoFrame } from '../../src/ui/photoFrame';
import { resetForTests } from '../../src/ui/assets';

describe('photoFrame', () => {
  beforeEach(() => {
    resetForTests();
    document.body.innerHTML = '';
  });

  it('renders ASCII fallback when no image is cached', () => {
    const node = photoFrame({ imageId: 'lm-fort-laramie', caption: 'Fort Laramie' });
    document.body.appendChild(node);
    const fallback = document.querySelector('[data-testid="photo-lm-fort-laramie-fallback"]');
    expect(fallback).not.toBeNull();
    expect(node.querySelector('img')).toBeNull();
    expect(node.querySelector('.photo-caption')?.textContent).toBe('Fort Laramie');
  });

  it('uses the provided fallback art when supplied', () => {
    const art = '~~~ desert ~~~';
    const node = photoFrame({ imageId: 'lm-x', fallbackArt: art });
    expect(node.textContent).toContain(art);
  });

  it('omits caption when not provided', () => {
    const node = photoFrame({ imageId: 'lm-y' });
    expect(node.querySelector('.photo-caption')).toBeNull();
  });
});
