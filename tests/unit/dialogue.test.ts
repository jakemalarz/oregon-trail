import { describe, it, expect } from 'vitest';
import {
  applyEffect,
  chooseDialogueOption,
  currentNode,
  nodeText,
  startDialogue,
  visibleChoices,
} from '../../src/core/dialogue';
import {
  ALL_DIALOGUES,
  CAYUSE_HUNTER,
  dialogueForNode,
  DIALOGUES_BY_NODE,
  MISSIONARY_DALLES,
  MOUNTAIN_MAN_BRIDGER,
  PIONEER_WOMAN,
  STOREKEEPER_INDEPENDENCE,
  TRADER_FORT_HALL,
} from '../../src/core/dialogueData';
import { createInitialState } from '../../src/core/state';
import type { GameState, DialogueGraph } from '../../src/core/types';
import type { NewGameOptions } from '../../src/core/state';

const opts = (): NewGameOptions => ({
  profession: 'banker',
  partyNames: ['A', 'B', 'C', 'D', 'E'],
  departureMonth: 'April',
  seed: 1,
});

function fresh(): GameState {
  return createInitialState(opts());
}

describe('dialogue engine', () => {
  it('startDialogue starts at the graph entry node', () => {
    const session = startDialogue(STOREKEEPER_INDEPENDENCE);
    expect(session.graphId).toBe(STOREKEEPER_INDEPENDENCE.id);
    expect(session.nodeId).toBe(STOREKEEPER_INDEPENDENCE.startNodeId);
  });

  it('currentNode resolves the live node and returns null after end', () => {
    const session = startDialogue(STOREKEEPER_INDEPENDENCE);
    expect(currentNode(STOREKEEPER_INDEPENDENCE, session)?.id).toBe('open');
    session.nodeId = null;
    expect(currentNode(STOREKEEPER_INDEPENDENCE, session)).toBeNull();
  });

  it('nodeText resolves both string and function content', () => {
    const state = fresh();
    const stringNode = STOREKEEPER_INDEPENDENCE.nodes.open;
    expect(typeof nodeText(stringNode, state)).toBe('string');

    const dynamic: DialogueGraph = {
      id: 'dyn',
      startNodeId: 'a',
      nodes: {
        a: {
          id: 'a',
          speaker: 'X',
          text: (s) => `money:${s.money}`,
          choices: [{ id: 'leave', text: 'Bye' }],
        },
      },
    };
    const session = startDialogue(dynamic);
    const node = currentNode(dynamic, session)!;
    expect(nodeText(node, state)).toContain('money:');
  });

  it('visibleChoices filters by predicate', () => {
    const state = fresh();
    const node = TRADER_FORT_HALL.nodes.open;
    state.inventory.food = 0;
    expect(visibleChoices(node, state).some((c) => c.id === 'q-trade-food-ammo')).toBe(false);
    state.inventory.food = 100;
    expect(visibleChoices(node, state).some((c) => c.id === 'q-trade-food-ammo')).toBe(true);
  });

  it('chooseDialogueOption advances to the next node', () => {
    const state = fresh();
    const session = startDialogue(STOREKEEPER_INDEPENDENCE);
    const r = chooseDialogueOption(STOREKEEPER_INDEPENDENCE, session, state, 'q-food');
    expect(r.ok).toBe(true);
    expect(currentNode(STOREKEEPER_INDEPENDENCE, session)?.id).toBe('food');
  });

  it('chooseDialogueOption ends dialogue when next is undefined', () => {
    const state = fresh();
    const session = startDialogue(STOREKEEPER_INDEPENDENCE);
    const r = chooseDialogueOption(STOREKEEPER_INDEPENDENCE, session, state, 'q-leave');
    expect(r.ok).toBe(true);
    expect(r.ended).toBe(true);
    expect(session.nodeId).toBeNull();
  });

  it('chooseDialogueOption rejects invisible or unknown choices', () => {
    const state = fresh();
    state.inventory.food = 0;
    const session = startDialogue(TRADER_FORT_HALL);
    const r = chooseDialogueOption(TRADER_FORT_HALL, session, state, 'q-trade-food-ammo');
    expect(r.ok).toBe(false);

    const session2 = startDialogue(STOREKEEPER_INDEPENDENCE);
    const r2 = chooseDialogueOption(STOREKEEPER_INDEPENDENCE, session2, state, 'no-such-choice');
    expect(r2.ok).toBe(false);
  });

  it('chooseDialogueOption rejects when no active node', () => {
    const state = fresh();
    const session = startDialogue(STOREKEEPER_INDEPENDENCE);
    chooseDialogueOption(STOREKEEPER_INDEPENDENCE, session, state, 'q-leave');
    const r = chooseDialogueOption(STOREKEEPER_INDEPENDENCE, session, state, 'q-food');
    expect(r.ok).toBe(false);
  });

  it('chooseDialogueOption flags missing target nodes', () => {
    const broken: DialogueGraph = {
      id: 'broken',
      startNodeId: 'a',
      nodes: {
        a: {
          id: 'a',
          speaker: 'X',
          text: 'hi',
          choices: [{ id: 'go', text: 'Go', next: 'missing' }],
        },
      },
    };
    const state = fresh();
    const session = startDialogue(broken);
    const r = chooseDialogueOption(broken, session, state, 'go');
    expect(r.ok).toBe(false);
  });
});

describe('dialogue effects', () => {
  it('addItem and removeItem mutate inventory', () => {
    const s = fresh();
    s.inventory.food = 0;
    applyEffect(s, { kind: 'addItem', item: 'food', qty: 25 });
    expect(s.inventory.food).toBe(25);
    applyEffect(s, { kind: 'removeItem', item: 'food', qty: 10 });
    expect(s.inventory.food).toBe(15);
    applyEffect(s, { kind: 'removeItem', item: 'food', qty: 999 });
    expect(s.inventory.food).toBe(0);
  });

  it('addMoney and removeMoney clamp at zero', () => {
    const s = fresh();
    const before = s.money;
    applyEffect(s, { kind: 'addMoney', amount: 100 });
    expect(s.money).toBe(before + 100);
    applyEffect(s, { kind: 'removeMoney', amount: 1_000_000 });
    expect(s.money).toBe(0);
  });

  it('flag effect writes into state.flags', () => {
    const s = fresh();
    applyEffect(s, { kind: 'flag', key: 'met-trader', value: true });
    expect(s.flags['met-trader']).toBe(true);
  });

  it('log effect appends to state.log', () => {
    const s = fresh();
    const before = s.log.length;
    applyEffect(s, { kind: 'log', text: 'A new line.' });
    expect(s.log.length).toBe(before + 1);
  });

  it('health applies to all alive members or a target', () => {
    const s = fresh();
    s.party.forEach((m) => (m.health = 50));
    applyEffect(s, { kind: 'health', delta: 10 });
    expect(s.party.every((m) => m.health === 60)).toBe(true);
    applyEffect(s, { kind: 'health', delta: -5, targetIndex: 0 });
    expect(s.party[0].health).toBe(55);
    expect(s.party[1].health).toBe(60);
  });

  it('health caps at 100 and floors at 0', () => {
    const s = fresh();
    applyEffect(s, { kind: 'health', delta: 999 });
    expect(s.party.every((m) => m.health === 100)).toBe(true);
    applyEffect(s, { kind: 'health', delta: -999 });
    expect(s.party.every((m) => m.health === 0)).toBe(true);
  });

  it('rumor adds unique entries', () => {
    const s = fresh();
    applyEffect(s, { kind: 'rumor', key: 'columbia-rapids' });
    applyEffect(s, { kind: 'rumor', key: 'columbia-rapids' });
    expect(s.rumors.filter((r) => r === 'columbia-rapids')).toHaveLength(1);
  });

  it('health is a no-op when no one is alive', () => {
    const s = fresh();
    s.party.forEach((m) => (m.alive = false));
    expect(() => applyEffect(s, { kind: 'health', delta: 10 })).not.toThrow();
  });

  it('health with a bad targetIndex is a safe no-op', () => {
    const s = fresh();
    s.party.forEach((m) => (m.health = 50));
    applyEffect(s, { kind: 'health', delta: 5, targetIndex: 99 });
    expect(s.party.every((m) => m.health === 50)).toBe(true);
  });
});

describe('NPC dialogue graphs', () => {
  it('every node referenced by a choice exists in the graph', () => {
    for (const graph of Object.values(ALL_DIALOGUES)) {
      for (const node of Object.values(graph.nodes)) {
        for (const choice of node.choices) {
          if (choice.next !== undefined) {
            expect(graph.nodes[choice.next], `${graph.id}:${node.id}->${choice.next}`).toBeDefined();
          }
        }
      }
      expect(graph.nodes[graph.startNodeId]).toBeDefined();
    }
  });

  it('all six NPCs are exported and indexed by node where applicable', () => {
    expect(Object.keys(ALL_DIALOGUES)).toHaveLength(6);
    expect(dialogueForNode('independence')).toBe(STOREKEEPER_INDEPENDENCE.id);
    expect(dialogueForNode('fort-hall')).toBe(TRADER_FORT_HALL.id);
    expect(dialogueForNode('fort-bridger')).toBe(MOUNTAIN_MAN_BRIDGER.id);
    expect(dialogueForNode('salmon-falls')).toBe(CAYUSE_HUNTER.id);
    expect(dialogueForNode('the-dalles')).toBe(MISSIONARY_DALLES.id);
    expect(dialogueForNode('willamette')).toBeNull();
    expect(Object.keys(DIALOGUES_BY_NODE)).toContain('fort-hall');
  });

  it('Fort Hall food→ammo trade swaps inventory', () => {
    const s = fresh();
    s.inventory.food = 100;
    s.inventory.ammunition = 0;
    const session = startDialogue(TRADER_FORT_HALL);
    const r = chooseDialogueOption(TRADER_FORT_HALL, session, s, 'q-trade-food-ammo');
    expect(r.ok).toBe(true);
    expect(s.inventory.food).toBe(50);
    expect(s.inventory.ammunition).toBe(30);
  });

  it('Pioneer Woman remedy gates on flag', () => {
    const s = fresh();
    s.party[0].health = 50;
    s.party[0].illness = 'fever';
    const session = startDialogue(PIONEER_WOMAN);
    const open = currentNode(PIONEER_WOMAN, session)!;
    expect(visibleChoices(open, s).some((c) => c.id === 'q-remedy')).toBe(true);
    chooseDialogueOption(PIONEER_WOMAN, session, s, 'q-remedy');
    expect(s.flags['pioneer-remedy-given']).toBe(true);
    chooseDialogueOption(PIONEER_WOMAN, session, s, 'back');
    const open2 = currentNode(PIONEER_WOMAN, session)!;
    expect(visibleChoices(open2, s).some((c) => c.id === 'q-remedy')).toBe(false);
  });

  it('Cayuse Hunter fish gift is a one-time +30 lb food', () => {
    const s = fresh();
    s.inventory.food = 0;
    const session = startDialogue(CAYUSE_HUNTER);
    chooseDialogueOption(CAYUSE_HUNTER, session, s, 'q-fish');
    expect(s.inventory.food).toBe(30);
    expect(s.flags['cayuse-fish-gift']).toBe(true);
    chooseDialogueOption(CAYUSE_HUNTER, session, s, 'back');
    const open = currentNode(CAYUSE_HUNTER, session)!;
    expect(visibleChoices(open, s).some((c) => c.id === 'q-fish')).toBe(false);
  });
});
