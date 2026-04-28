import type {
  DialogueChoice,
  DialogueEffect,
  DialogueGraph,
  DialogueNode,
  GameState,
} from './types';
import { aliveMembers } from './state';

export interface DialogueSession {
  graphId: string;
  nodeId: string | null;
}

export function startDialogue(graph: DialogueGraph): DialogueSession {
  return { graphId: graph.id, nodeId: graph.startNodeId };
}

export function currentNode(graph: DialogueGraph, session: DialogueSession): DialogueNode | null {
  if (!session.nodeId) return null;
  return graph.nodes[session.nodeId] ?? null;
}

export function nodeText(node: DialogueNode, state: GameState): string {
  return typeof node.text === 'function' ? node.text(state) : node.text;
}

export function visibleChoices(node: DialogueNode, state: GameState): DialogueChoice[] {
  return node.choices.filter((c) => !c.visibleIf || c.visibleIf(state));
}

export function chooseDialogueOption(
  graph: DialogueGraph,
  session: DialogueSession,
  state: GameState,
  choiceId: string,
): { ok: boolean; reason?: string; ended?: boolean } {
  const node = currentNode(graph, session);
  if (!node) return { ok: false, reason: 'Dialogue is not active.' };
  const choice = visibleChoices(node, state).find((c) => c.id === choiceId);
  if (!choice) return { ok: false, reason: 'Choice not available.' };
  for (const effect of choice.effects ?? []) applyEffect(state, effect);
  if (choice.next === undefined) {
    session.nodeId = null;
    return { ok: true, ended: true };
  }
  if (!graph.nodes[choice.next]) {
    return { ok: false, reason: `Missing node: ${choice.next}` };
  }
  session.nodeId = choice.next;
  return { ok: true };
}

export function applyEffect(state: GameState, effect: DialogueEffect): void {
  switch (effect.kind) {
    case 'addItem':
      state.inventory[effect.item] += effect.qty;
      break;
    case 'removeItem':
      state.inventory[effect.item] = Math.max(0, state.inventory[effect.item] - effect.qty);
      break;
    case 'addMoney':
      state.money += effect.amount;
      break;
    case 'removeMoney':
      state.money = Math.max(0, state.money - effect.amount);
      break;
    case 'flag':
      state.flags[effect.key] = effect.value;
      break;
    case 'log':
      state.log.push(effect.text);
      break;
    case 'health': {
      const members = aliveMembers(state);
      if (members.length === 0) break;
      if (effect.targetIndex !== undefined) {
        const m = members[effect.targetIndex];
        if (m) m.health = clamp(m.health + effect.delta, 0, 100);
      } else {
        for (const m of members) m.health = clamp(m.health + effect.delta, 0, 100);
      }
      break;
    }
    case 'rumor':
      if (!state.rumors.includes(effect.key)) state.rumors.push(effect.key);
      break;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
