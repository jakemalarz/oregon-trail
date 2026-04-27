export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Partial<HTMLElementTagNameMap[K]> & { class?: string; html?: string; text?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v as string;
    else if (k === 'html') node.innerHTML = v as string;
    else if (k === 'text') node.textContent = v as string;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else (node as unknown as Record<string, unknown>)[k] = v;
  }
  for (const c of children) {
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function focusFirstButton(root: HTMLElement): void {
  const btn = root.querySelector('button, [tabindex]') as HTMLElement | null;
  if (btn) btn.focus();
}
