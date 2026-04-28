import type { DialogueGraph, GameState } from '../core/types';
import {
  chooseDialogueOption,
  currentNode,
  nodeText,
  startDialogue,
  visibleChoices,
  type DialogueSession,
} from '../core/dialogue';
import { el } from './dom';
import { beep, blip } from './sound';
import { photoFrame } from './photoFrame';
import { duck, unduck } from './midi';

export interface DialogueScreenDeps {
  state: GameState;
  graph: DialogueGraph;
  onClose: () => void;
}

export function renderDialogueScreen(root: HTMLElement, deps: DialogueScreenDeps): void {
  const { graph, state, onClose } = deps;
  const session: DialogueSession = startDialogue(graph);
  duck(0.4);

  function paint(): void {
    root.innerHTML = '';
    const node = currentNode(graph, session);
    if (!node) {
      unduck();
      onClose();
      return;
    }
    root.appendChild(el('h2', { text: node.speaker }));
    if (graph.portraitId) {
      root.appendChild(photoFrame({ imageId: graph.portraitId, caption: node.speaker }));
    }
    root.appendChild(el('p', { class: 'center', text: nodeText(node, state) }));

    const menu = el('div', { class: 'menu' });
    const choices = visibleChoices(node, state);
    if (choices.length === 0) {
      const close = el('button', { class: 'primary menu-item', text: 'Take your leave' });
      close.setAttribute('data-testid', 'dialogue-leave');
      close.addEventListener('click', () => { unduck(); beep(); onClose(); });
      menu.appendChild(close);
    } else {
      for (const c of choices) {
        const b = el('button', { class: 'menu-item', text: c.text });
        b.setAttribute('data-testid', `dialogue-${c.id}`);
        b.addEventListener('click', () => {
          const r = chooseDialogueOption(graph, session, state, c.id);
          if (!r.ok) { blip(); return; }
          beep();
          if (r.ended) { unduck(); onClose(); return; }
          paint();
        });
        menu.appendChild(b);
      }
    }
    root.appendChild(menu);
  }

  paint();
}
