import type { GameState } from '../core/types';
import type { Profession, Month } from '../core/types';
import { currentLandmark, nextLandmark, milesToNextLandmark, DEFAULT_ROUTE } from '../core/landmarks';
import { chooseExit } from '../core/route';
import { totalDistance, setPace, setRations, rest, departFromNode, pendingOutgoingEdges } from '../core/travel';
import { aliveCount, aliveMembers, createInitialState, PROFESSION_STARTING_MONEY } from '../core/state';
import { INDEPENDENCE_PRICES, priceListFor, purchase, isReadyToDepart, type Item, type PriceList } from '../core/store';
import { crossRiver, type CrossMethod, FERRY_COST } from '../core/rivers';
import { generateOffer, applyTrade, type TradeOffer } from '../core/trading';
import { computeScore, makeScoreEntry, recordScore, loadTopTen, checkGameOver } from '../core/scoring';
import { canHunt, ANIMAL_MEAT, applyHunt } from '../core/hunting';
import { ANIMALS, pickAnimalForEnvironment, type AnimalDef, type AnimalId } from '../core/animals';
import { currentEnvironment } from '../core/environment';
import { createEngine, type Engine } from '../core/engine';
import { formatDate } from '../core/calendar';
import { el, clear, focusFirstButton } from './dom';
import { beep, blip, shoot, hit, fanfare, dirge, isMuted, setMuted } from './sound';
import { createRng } from '../core/rng';
import { loadManifest, preloadImages, getImage, type PreloadProgress } from './assets';
import { photoFrame } from './photoFrame';
import { imageIdForLandmark } from './assets';
import { setMidiPaths, play as playMusic, stop as stopMusic, startAudio } from './midi';
import { renderBankScreen } from './bankScreen';
import { canRepayHere } from '../core/banking';
import { renderDialogueScreen } from './dialogueScreen';
import { ALL_DIALOGUES, dialogueForNode, PIONEER_WOMAN } from '../core/dialogueData';
import { addJournalEntry } from '../core/journal';
import { allGuidebookEntries, guidebookEntry } from '../core/guidebook';
import {
  EPITAPH_MAX_LEN,
  makeTombstone,
  maybeEncounterTombstone,
  saveTombstone,
  sanitizeEpitaph,
  tombstonesAtNode,
} from '../core/tombstone';

const root = document.getElementById('screen')!;
let engine: Engine | null = null;
let assetsReady = false;

function urlSeed(): number | null {
  if (typeof window === 'undefined') return null;
  const u = new URL(window.location.href);
  const s = u.searchParams.get('seed');
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

function makeMuteButton(): HTMLButtonElement {
  const btn = el('button', { class: `muted-toggle ${isMuted() ? '' : 'on'}`, text: isMuted() ? 'sound off' : 'sound on' });
  btn.addEventListener('click', () => {
    setMuted(!isMuted());
    if (isMuted()) stopMusic();
    btn.textContent = isMuted() ? 'sound off' : 'sound on';
    btn.classList.toggle('on', !isMuted());
  });
  btn.setAttribute('data-testid', 'sound-toggle');
  return btn;
}

function renderWith(builder: (root: HTMLElement) => void): void {
  clear(root);
  root.appendChild(makeMuteButton());
  builder(root);
  focusFirstButton(root);
}

export function showTitle(): void {
  void playMusic('title', { loop: true });
  renderWith((r) => {
    r.appendChild(el('h1', { text: 'The Oregon Trail' }));
    r.appendChild(photoFrame({ imageId: 'title', caption: '1992 — Deluxe Edition (web)' }));

    const progress = el('p', { class: 'center dim', text: assetsReady ? '' : 'Loading assets…' });
    progress.setAttribute('data-testid', 'asset-progress');
    r.appendChild(progress);

    const menu = el('div', { class: 'menu' });
    const start = el('button', { class: 'primary menu-item', text: 'Start a new game' });
    start.setAttribute('data-testid', 'start-game');
    start.addEventListener('click', () => { beep(); void startAudio(); showProfession(); });
    const top = el('button', { class: 'menu-item', text: 'View top ten' });
    top.addEventListener('click', () => { blip(); showTopTen(); });
    const learn = el('button', { class: 'menu-item', text: 'Learn about the trail' });
    learn.setAttribute('data-testid', 'guidebook');
    learn.addEventListener('click', () => { blip(); showGuidebook(() => showTitle()); });
    menu.append(start, top, learn);
    r.appendChild(menu);

    if (!assetsReady) {
      void ensureAssetsLoaded((p) => {
        progress.textContent = p.total > 0
          ? `Loading assets ${p.loaded}/${p.total}${p.failed > 0 ? ` (${p.failed} missing)` : ''}…`
          : '';
      }).then(() => {
        progress.textContent = '';
        if (progress.isConnected) showTitle();
      });
    }
  });
}

async function ensureAssetsLoaded(onProgress?: (p: PreloadProgress) => void): Promise<void> {
  if (assetsReady) return;
  try {
    const m = await loadManifest();
    setMidiPaths(m.midi);
    await preloadImages(m, onProgress);
  } catch {
    // missing manifest in tests / first run — fall back to ASCII art
  }
  assetsReady = true;
}

interface Setup {
  profession: Profession;
  partyNames: [string, string, string, string, string];
  departureMonth: Month;
}

const setup: Setup = {
  profession: 'banker',
  partyNames: ['Ezra', 'Mary', 'John', 'Sarah', 'Jed'],
  departureMonth: 'April',
};

export function showProfession(): void {
  renderWith((r) => {
    r.appendChild(el('h2', { text: 'Choose Your Profession' }));
    const menu = el('div', { class: 'menu' });
    const opts: Array<{ p: Profession; label: string }> = [
      { p: 'banker', label: `Banker — $${PROFESSION_STARTING_MONEY.banker} (×1 score)` },
      { p: 'carpenter', label: `Carpenter — $${PROFESSION_STARTING_MONEY.carpenter} (×2 score)` },
      { p: 'farmer', label: `Farmer — $${PROFESSION_STARTING_MONEY.farmer} (×3 score)` },
    ];
    for (const o of opts) {
      const b = el('button', { class: 'menu-item', text: o.label });
      b.setAttribute('data-testid', `prof-${o.p}`);
      b.addEventListener('click', () => { setup.profession = o.p; beep(); showPartyNames(); });
      menu.appendChild(b);
    }
    r.appendChild(menu);
  });
}

export function showPartyNames(): void {
  renderWith((r) => {
    r.appendChild(el('h2', { text: 'Name Your Party (5 members)' }));
    const fields = [0, 1, 2, 3, 4].map((i) => {
      const wrap = el('div', { class: 'field' });
      wrap.appendChild(el('label', { text: i === 0 ? 'Leader' : `Member ${i + 1}` }));
      const input = el('input', { type: 'text', value: setup.partyNames[i] });
      input.setAttribute('data-testid', `name-${i}`);
      input.addEventListener('input', () => {
        setup.partyNames[i] = input.value || `Member${i + 1}`;
      });
      wrap.appendChild(input);
      return wrap;
    });
    fields.forEach((f) => r.appendChild(f));
    const next = el('button', { class: 'primary', text: 'Continue' });
    next.setAttribute('data-testid', 'names-continue');
    next.addEventListener('click', () => { beep(); showDeparture(); });
    r.appendChild(next);
  });
}

export function showDeparture(): void {
  renderWith((r) => {
    r.appendChild(el('h2', { text: 'When Do You Set Out?' }));
    r.appendChild(el('p', { class: 'dim center', text: 'Earlier means more grass and easier rivers, but cold weather. Later means heat and dry trails.' }));
    const menu = el('div', { class: 'menu' });
    const months: Month[] = ['March', 'April', 'May', 'June', 'July'];
    for (const m of months) {
      const b = el('button', { class: 'menu-item', text: m });
      b.setAttribute('data-testid', `month-${m}`);
      b.addEventListener('click', () => { setup.departureMonth = m; beep(); startGame(); });
      menu.appendChild(b);
    }
    r.appendChild(menu);
  });
}

function startGame(): void {
  const seed = urlSeed() ?? Math.floor(Math.random() * 0xffffffff);
  const state = createInitialState({
    profession: setup.profession,
    partyNames: setup.partyNames,
    departureMonth: setup.departureMonth,
    seed,
  });
  engine = createEngine(state);
  if (typeof window !== 'undefined') {
    (window as unknown as { __engine?: Engine }).__engine = engine;
  }
  showStore();
}

function statusBar(state: GameState): HTMLElement {
  const lm = currentLandmark(state);
  const next = nextLandmark(state);
  return el('div', {
    class: 'status-bar',
    html: `
      <div><b>Date:</b> ${formatDate(state.date)}</div>
      <div><b>Weather:</b> ${state.weather}</div>
      <div><b>Health:</b> ${avgHealth(state)}</div>
      <div><b>Pace:</b> ${state.pace}</div>
      <div><b>At:</b> ${lm.name}</div>
      <div><b>Next:</b> ${next?.name ?? '—'}</div>
      <div><b>Miles:</b> ${state.milesTraveled}/${totalDistance()}</div>
      <div><b>$:</b> ${state.money.toFixed(2)}</div>
      <div><b>Food:</b> ${state.inventory.food.toFixed(0)} lb</div>
      <div><b>Oxen:</b> ${state.inventory.oxen}</div>
      <div><b>Ammo:</b> ${state.inventory.ammunition}</div>
      <div><b>Party:</b> ${aliveCount(state)}/${state.party.length}</div>
    `,
  });
}

function avgHealth(state: GameState): string {
  const alive = aliveMembers(state);
  if (alive.length === 0) return '—';
  const avg = alive.reduce((s, m) => s + m.health, 0) / alive.length;
  if (avg > 80) return 'good';
  if (avg > 60) return 'fair';
  if (avg > 40) return 'poor';
  return 'very poor';
}

function logBox(state: GameState): HTMLElement {
  const box = el('div', { class: 'log' });
  const header = el('p', { class: 'log-header', text: 'Diary' });
  box.appendChild(header);
  const recent = state.log.slice(-12).reverse();
  if (recent.length === 0) {
    box.appendChild(el('p', { class: 'log-empty', text: 'No entries yet.' }));
  }
  for (const line of recent) box.appendChild(el('p', { text: line }));
  return box;
}

export function showStore(): void {
  if (!engine) return;
  void playMusic('store', { loop: true });
  const state = engine.state;
  const lm = currentLandmark(state);
  const prices: PriceList = lm.id === 'independence' ? INDEPENDENCE_PRICES : priceListFor(lm.id);
  renderWith((r) => {
    r.appendChild(el('h2', { text: lm.id === 'independence' ? "Matt's General Store — Independence" : `${lm.name} — Trader` }));
    r.appendChild(photoFrame({
      imageId: lm.id === 'independence' ? 'store-independence' : 'trader',
      caption: lm.id === 'independence' ? "Matt's General Store" : 'Trader',
      width: 320,
      height: 180,
    }));
    r.appendChild(el('p', { class: 'center dim', text: lm.id === 'independence' ? 'Stock up before you set out.' : 'Trade goods here at higher prices.' }));
    const grid = el('div', { class: 'col' });
    const items: Array<{ key: Item; label: string; unit: string; step: number }> = [
      { key: 'oxen', label: `Oxen (yokes of 2) — $${prices.oxen.toFixed(2)} each`, unit: 'yokes', step: 1 },
      { key: 'food', label: `Food — $${prices.food.toFixed(2)} per lb`, unit: 'lbs', step: 50 },
      { key: 'clothing', label: `Clothing — $${prices.clothing.toFixed(2)} each`, unit: 'sets', step: 1 },
      { key: 'ammunition', label: `Ammunition — $${prices.ammunition.toFixed(2)} per box of 20`, unit: 'rounds', step: 20 },
      { key: 'wheels', label: `Spare wheel — $${prices.wheels.toFixed(2)}`, unit: '', step: 1 },
      { key: 'axles', label: `Spare axle — $${prices.axles.toFixed(2)}`, unit: '', step: 1 },
      { key: 'tongues', label: `Spare tongue — $${prices.tongues.toFixed(2)}`, unit: '', step: 1 },
    ];
    for (const it of items) {
      const row = el('div', { class: 'row' });
      row.appendChild(el('span', { text: it.label, style: { flex: '1' } as CSSStyleDeclaration }));
      const input = el('input', { type: 'number', value: '0' });
      input.setAttribute('data-testid', `buy-${it.key}-qty`);
      (input as HTMLInputElement).min = '0';
      (input as HTMLInputElement).step = String(it.step);
      input.style.width = '80px';
      const btn = el('button', { text: 'Buy' });
      btn.setAttribute('data-testid', `buy-${it.key}`);
      btn.addEventListener('click', () => {
        const qty = parseInt((input as HTMLInputElement).value || '0', 10);
        if (!Number.isFinite(qty) || qty <= 0) return;
        const r2 = purchase(state, prices, { item: it.key, quantity: qty });
        if (r2.ok) {
          state.log.push(`Bought ${qty} ${it.unit || it.key} for $${r2.cost.toFixed(2)}.`);
          beep();
          showStore();
        } else {
          state.log.push(`Could not buy: ${r2.reason}`);
          blip();
          showStore();
        }
      });
      row.append(input, btn);
      grid.appendChild(row);
    }
    r.appendChild(grid);

    if (lm.id === 'independence') {
      const talkMatt = el('button', { text: 'Talk to Matt the storekeeper' });
      talkMatt.setAttribute('data-testid', 'talk-storekeeper');
      talkMatt.addEventListener('click', () => { beep(); showDialogue('storekeeper-independence', () => showStore()); });
      r.appendChild(talkMatt);

      const bankBtn = el('button', { text: state.loan ? 'Visit the bank (loan due)' : 'Visit the bank' });
      bankBtn.setAttribute('data-testid', 'visit-bank');
      bankBtn.addEventListener('click', () => { beep(); showBank(); });
      r.appendChild(bankBtn);

      const ready = isReadyToDepart(state);
      const depart = el('button', { class: 'primary', text: 'Set out on the trail' });
      depart.setAttribute('data-testid', 'depart');
      if (!ready.ready) {
        depart.disabled = true;
        depart.title = ready.reason ?? '';
      }
      depart.addEventListener('click', () => { beep(); showTrail(); });
      r.appendChild(depart);
      if (!ready.ready) r.appendChild(el('p', { class: 'warn center', text: ready.reason ?? '' }));
    } else {
      if (canRepayHere(state)) {
        const bankBtn = el('button', { text: 'Repay loan at this fort' });
        bankBtn.setAttribute('data-testid', 'visit-bank');
        bankBtn.addEventListener('click', () => { beep(); showBank(); });
        r.appendChild(bankBtn);
      }
      const back = el('button', { class: 'primary', text: 'Continue on the trail' });
      back.setAttribute('data-testid', 'leave-store');
      back.addEventListener('click', () => { beep(); showTrail(); });
      r.appendChild(back);
    }

    r.appendChild(statusBar(state));
    r.appendChild(logBox(state));
  });
}

export function showDialogue(graphId: string, onClose: () => void): void {
  if (!engine) return;
  const graph = ALL_DIALOGUES[graphId];
  if (!graph) { onClose(); return; }
  const state = engine.state;
  renderWith((r) => {
    renderDialogueScreen(r, { state, graph, onClose });
    r.appendChild(statusBar(state));
    r.appendChild(logBox(state));
  });
}

export function showBank(): void {
  if (!engine) return;
  void playMusic('store', { loop: true });
  const state = engine.state;
  renderWith((r) => {
    renderBankScreen(r, { state, onClose: () => showStore() });
    r.appendChild(statusBar(state));
    r.appendChild(logBox(state));
  });
}

export function showTrail(): void {
  if (!engine) return;
  void playMusic('travel_a', { loop: true });
  const state = engine.state;
  if (state.ended) return showEndScreen();
  if (state.pendingChoice) return showRouteChoice();

  const lm = currentLandmark(state);
  if (state.currentEdgeId === null) {
    if (lm.kind === 'destination') return showEndScreen();
    if (lm.kind === 'river') return showRiver();
    if (lm.kind === 'fort' || lm.kind === 'natural') return showLandmark();
  }

  renderWith((r) => {
    r.appendChild(el('h2', { text: 'On the Trail' }));
    const env = currentEnvironment(DEFAULT_ROUTE, state);
    r.appendChild(photoFrame({ imageId: `hunt-${env}`, caption: `${env.charAt(0).toUpperCase()}${env.slice(1)}`, width: 360, height: 200 }));
    const next = nextLandmark(state);
    const remaining = milesToNextLandmark(state);
    r.appendChild(el('p', { class: 'center', text: `Next landmark: ${next?.name ?? '—'} (${remaining} miles)` }));

    const menu = el('div', { class: 'menu' });
    const cont = el('button', { class: 'primary menu-item', text: 'Continue (advance one day)' });
    cont.setAttribute('data-testid', 'continue');
    cont.addEventListener('click', () => {
      engine!.step();
      const found = maybeEncounterTombstone(engine!.state, engine!.rng);
      if (found) {
        const msg = `You found a grave: "${found.epitaph}" — ${found.name}, ${found.date.month} ${found.date.day}, ${found.date.year}.`;
        engine!.state.log.push(msg);
        addJournalEntry(engine!.state, 'note', msg, engine!.state.currentNodeId);
      }
      blip();
      showTrail();
    });

    const change = el('button', { class: 'menu-item', text: 'Change pace / rations' });
    change.setAttribute('data-testid', 'change-pace');
    change.addEventListener('click', () => showPaceMenu());

    const restBtn = el('button', { class: 'menu-item', text: 'Rest 3 days' });
    restBtn.setAttribute('data-testid', 'rest');
    restBtn.addEventListener('click', () => {
      rest(state, 3);
      state.log.push('You rested 3 days.');
      blip();
      showTrail();
    });

    const huntBtn = el('button', { class: 'menu-item', text: 'Hunt' });
    huntBtn.setAttribute('data-testid', 'hunt');
    const hunt = canHunt(state);
    if (!hunt.ok) huntBtn.disabled = true;
    huntBtn.addEventListener('click', () => showHunt());

    const tradeBtn = el('button', { class: 'menu-item', text: 'Talk to a passerby' });
    tradeBtn.setAttribute('data-testid', 'trade');
    tradeBtn.addEventListener('click', () => showTrade());

    const journalBtn = el('button', { class: 'menu-item', text: 'Read your diary' });
    journalBtn.setAttribute('data-testid', 'journal');
    journalBtn.addEventListener('click', () => showJournal(() => showTrail()));

    menu.append(cont, change, restBtn, huntBtn, tradeBtn, journalBtn);
    r.appendChild(menu);
    r.appendChild(statusBar(state));
    r.appendChild(logBox(state));
  });
}

function showPaceMenu(): void {
  if (!engine) return;
  const state = engine.state;
  renderWith((r) => {
    r.appendChild(el('h2', { text: 'Pace and Rations' }));
    const paceCol = el('div', { class: 'col' });
    paceCol.appendChild(el('h3', { text: 'Pace' }));
    for (const p of ['steady', 'strenuous', 'grueling'] as const) {
      const b = el('button', { class: 'menu-item', text: p });
      b.setAttribute('data-testid', `pace-${p}`);
      b.addEventListener('click', () => { setPace(state, p); beep(); showTrail(); });
      paceCol.appendChild(b);
    }
    const ratCol = el('div', { class: 'col' });
    ratCol.appendChild(el('h3', { text: 'Rations' }));
    for (const ra of ['filling', 'meager', 'bare'] as const) {
      const b = el('button', { class: 'menu-item', text: ra });
      b.setAttribute('data-testid', `rations-${ra}`);
      b.addEventListener('click', () => { setRations(state, ra); beep(); showTrail(); });
      ratCol.appendChild(b);
    }
    const wrap = el('div', { class: 'row' });
    wrap.append(paceCol, ratCol);
    r.appendChild(wrap);
    const back = el('button', { text: 'Back' });
    back.setAttribute('data-testid', 'pace-back');
    back.addEventListener('click', () => showTrail());
    r.appendChild(back);
  });
}

export function showRouteChoice(): void {
  if (!engine) return;
  void playMusic('landmark', { loop: true });
  const state = engine.state;
  const lm = currentLandmark(state);
  const exits = pendingOutgoingEdges(state);
  renderWith((r) => {
    r.appendChild(el('h2', { text: 'The trail forks' }));
    r.appendChild(photoFrame({ imageId: imageIdForLandmark(lm.id), caption: lm.name }));
    r.appendChild(el('p', { class: 'center', text: `At ${lm.name} you must choose your route:` }));
    const menu = el('div', { class: 'menu' });
    for (const e of exits) {
      const to = DEFAULT_ROUTE.nodes[e.toNodeId];
      const label = `${to.name} — ${e.miles} miles${e.difficulty ? ` (${e.difficulty})` : ''}`;
      const b = el('button', { class: 'menu-item', text: label });
      b.setAttribute('data-testid', `route-${e.id}`);
      if (e.description) {
        const tip = el('p', { class: 'dim', text: e.description });
        const wrap = el('div', { class: 'col' });
        wrap.append(b, tip);
        menu.appendChild(wrap);
      } else {
        menu.appendChild(b);
      }
      b.addEventListener('click', () => {
        chooseExit(state, DEFAULT_ROUTE, e.id);
        state.log.push(`Chose the route to ${to.name}.`);
        addJournalEntry(state, 'choice', `Chose the route to ${to.name}.`, lm.id);
        beep();
        showTrail();
      });
    }
    r.appendChild(menu);
    r.appendChild(statusBar(state));
    r.appendChild(logBox(state));
  });
}

export function showLandmark(): void {
  if (!engine) return;
  void playMusic('landmark', { loop: true });
  const state = engine.state;
  const lm = currentLandmark(state);
  renderWith((r) => {
    r.appendChild(el('h2', { text: lm.name }));
    r.appendChild(photoFrame({ imageId: imageIdForLandmark(lm.id), caption: lm.name }));
    r.appendChild(el('p', { class: 'center dim', text: `${state.milesTraveled} miles from Independence.` }));
    const menu = el('div', { class: 'menu' });
    if (lm.kind === 'fort' || lm.kind === 'town') {
      const trade = el('button', { class: 'menu-item', text: 'Buy supplies (fort prices)' });
      trade.setAttribute('data-testid', 'fort-store');
      trade.addEventListener('click', () => { beep(); showStore(); });
      menu.appendChild(trade);
    }
    const look = el('button', { class: 'menu-item', text: 'Look around' });
    look.addEventListener('click', () => {
      state.log.push(`You take in the sights at ${lm.name}.`);
      blip();
      showLandmark();
    });
    const cont = el('button', { class: 'primary menu-item', text: 'Continue on the trail' });
    cont.setAttribute('data-testid', 'leave-landmark');
    cont.addEventListener('click', () => {
      departFromNode(state);
      beep();
      showTrail();
    });
    menu.appendChild(look);
    const dialogueId = dialogueForNode(lm.id);
    if (dialogueId) {
      const talk = el('button', { class: 'menu-item', text: 'Talk to people' });
      talk.setAttribute('data-testid', 'talk');
      talk.addEventListener('click', () => { beep(); showDialogue(dialogueId, () => showLandmark()); });
      menu.appendChild(talk);
    }
    menu.appendChild(cont);
    r.appendChild(menu);
    r.appendChild(statusBar(state));
    r.appendChild(logBox(state));
  });
}

export function showRiver(): void {
  if (!engine) return;
  void playMusic('landmark', { loop: true });
  const state = engine.state;
  const lm = currentLandmark(state);
  renderWith((r) => {
    r.appendChild(el('h2', { text: lm.name }));
    r.appendChild(photoFrame({ imageId: imageIdForLandmark(lm.id), caption: lm.name }));
    r.appendChild(el('p', { class: 'center', text: `Depth: ${(lm.riverDepth ?? 0).toFixed(1)} ft. Width: ${lm.riverWidth ?? 0} ft.` }));
    const menu = el('div', { class: 'menu' });
    const choices: Array<{ m: CrossMethod; label: string }> = [
      { m: 'ford', label: 'Attempt to ford the river' },
      { m: 'caulk', label: 'Caulk the wagon and float across' },
      ...(lm.ferry ? [{ m: 'ferry' as CrossMethod, label: `Take the ferry ($${FERRY_COST})` }] : []),
      { m: 'wait', label: 'Wait a day' },
    ];
    for (const c of choices) {
      const b = el('button', { class: 'menu-item', text: c.label });
      b.setAttribute('data-testid', `cross-${c.m}`);
      b.addEventListener('click', () => {
        const result = crossRiver(state, lm, c.m, engine!.rng);
        state.log.push(result.message);
        addJournalEntry(state, 'river', result.message, lm.id);
        if (result.success) {
          departFromNode(state);
          beep();
        } else if (result.capsized) {
          dirge();
        } else {
          blip();
        }
        showTrail();
      });
      menu.appendChild(b);
    }
    r.appendChild(menu);
    r.appendChild(statusBar(state));
    r.appendChild(logBox(state));
  });
}

export function showTrade(): void {
  if (!engine) return;
  const state = engine.state;
  const wantsRemedy = state.party.some((m) => m.alive && (m.illness !== 'none' || m.health < 70));
  if (!state.flags['pioneer-remedy-given'] && wantsRemedy && engine.rng.next() < 0.4) {
    showDialogue(PIONEER_WOMAN.id, () => showTrail());
    return;
  }
  const offer: TradeOffer = generateOffer(engine.rng);
  renderWith((r) => {
    r.appendChild(el('h2', { text: 'A Passerby' }));
    r.appendChild(el('p', { class: 'center', text: `They offer ${offer.receive.quantity} ${offer.receive.item} for ${offer.give.quantity} ${offer.give.item}.` }));
    const menu = el('div', { class: 'menu' });
    const accept = el('button', { class: 'primary menu-item', text: 'Accept' });
    accept.setAttribute('data-testid', 'trade-accept');
    accept.addEventListener('click', () => {
      const r2 = applyTrade(state, offer);
      state.log.push(r2.ok ? 'Trade accepted.' : r2.reason);
      r2.ok ? beep() : blip();
      showTrail();
    });
    const decline = el('button', { class: 'menu-item', text: 'Decline' });
    decline.setAttribute('data-testid', 'trade-decline');
    decline.addEventListener('click', () => { state.log.push('You declined the trade.'); blip(); showTrail(); });
    menu.append(accept, decline);
    r.appendChild(menu);
    r.appendChild(statusBar(state));
    r.appendChild(logBox(state));
  });
}

export function showJournal(onClose: () => void): void {
  if (!engine) return;
  const state = engine.state;
  renderWith((r) => {
    r.appendChild(el('h2', { text: 'Trail Diary' }));
    r.appendChild(el('p', { class: 'center dim', text: `${state.journal.length} entries (newest first).` }));
    const list = el('div', { class: 'journal-list' });
    list.setAttribute('data-testid', 'journal-list');
    if (state.journal.length === 0) {
      list.appendChild(el('p', { class: 'center dim', text: 'You have written nothing yet.' }));
    } else {
      const reversed = [...state.journal].reverse();
      for (const e of reversed) {
        const row = el('div', { class: 'journal-entry' });
        row.setAttribute('data-testid', `journal-${e.kind}`);
        const date = `${e.date.month} ${e.date.day}, ${e.date.year}`;
        row.appendChild(el('div', { class: 'journal-date dim', text: date }));
        row.appendChild(el('div', { class: 'journal-text', text: e.text }));
        list.appendChild(row);
      }
    }
    r.appendChild(list);
    const back = el('button', { class: 'primary', text: 'Close diary' });
    back.setAttribute('data-testid', 'journal-back');
    back.addEventListener('click', () => onClose());
    r.appendChild(back);
  });
}

export function showGuidebook(onClose: () => void): void {
  const entries = allGuidebookEntries();
  let activeId: string = entries[0]?.nodeId ?? '';
  function paint(): void {
    renderWith((r) => {
      r.appendChild(el('h2', { text: 'Learn About the Trail' }));
      const wrap = el('div', { class: 'row guidebook-wrap' });
      const left = el('div', { class: 'col guidebook-list' });
      left.setAttribute('data-testid', 'guidebook-list');
      for (const e of entries) {
        const b = el('button', {
          class: `menu-item${e.nodeId === activeId ? ' active' : ''}`,
          text: e.title,
        });
        b.setAttribute('data-testid', `guidebook-${e.nodeId}`);
        b.addEventListener('click', () => { activeId = e.nodeId; blip(); paint(); });
        left.appendChild(b);
      }
      const right = el('div', { class: 'col guidebook-body' });
      const active = guidebookEntry(activeId);
      if (active) {
        right.appendChild(el('h3', { text: active.title }));
        right.appendChild(photoFrame({ imageId: imageIdForLandmark(active.nodeId), caption: active.title }));
        right.appendChild(el('p', { class: 'guidebook-text', text: active.body }));
      }
      wrap.append(left, right);
      r.appendChild(wrap);
      const back = el('button', { class: 'primary', text: 'Back' });
      back.setAttribute('data-testid', 'guidebook-back');
      back.addEventListener('click', () => onClose());
      r.appendChild(back);
    });
  }
  paint();
}

export function showTombstone(onContinue: () => void): void {
  if (!engine) return;
  void playMusic('dirge', { loop: true });
  const state = engine.state;
  renderWith((r) => {
    r.appendChild(el('h1', { text: 'Here Lies…' }));
    r.appendChild(photoFrame({ imageId: 'tombstone', caption: 'A grave on the trail' }));
    const dead = state.party.filter((p) => !p.alive).map((p) => p.name);
    const leader = state.party[0];
    const epitaphOf = leader?.name ?? 'Unknown';
    r.appendChild(el('p', { class: 'center', text: `${epitaphOf} and party perished on the trail.` }));
    if (dead.length > 0) {
      r.appendChild(el('p', { class: 'center dim', text: `Lost: ${dead.join(', ')}` }));
    }
    const fieldWrap = el('div', { class: 'field' });
    fieldWrap.appendChild(el('label', { text: `Carve an epitaph (max ${EPITAPH_MAX_LEN} chars):` }));
    const input = el('input', { type: 'text', value: '' }) as HTMLInputElement;
    input.maxLength = EPITAPH_MAX_LEN;
    input.setAttribute('data-testid', 'epitaph-input');
    input.placeholder = 'Rest in peace.';
    fieldWrap.appendChild(input);
    r.appendChild(fieldWrap);

    const carve = el('button', { class: 'primary', text: 'Carve and continue' });
    carve.setAttribute('data-testid', 'epitaph-carve');
    carve.addEventListener('click', () => {
      const text = sanitizeEpitaph(input.value || 'Rest in peace.');
      state.epitaph = text;
      const rec = makeTombstone(state);
      saveTombstone(rec);
      blip();
      onContinue();
    });
    r.appendChild(carve);

    const here = tombstonesAtNode(state.currentNodeId);
    if (here.length > 0) {
      r.appendChild(el('h3', { text: 'Other graves at this place' }));
      const list = el('div', { class: 'tombstone-list' });
      list.setAttribute('data-testid', 'tombstone-others');
      for (const t of here.slice(0, 5)) {
        const row = el('div', { class: 'tombstone-entry' });
        row.appendChild(el('div', { text: `"${t.epitaph}"` }));
        row.appendChild(el('div', { class: 'dim', text: `— ${t.name}, ${t.date.month} ${t.date.day}, ${t.date.year}` }));
        list.appendChild(row);
      }
      r.appendChild(list);
    }
  });
}

interface HuntAnimal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: AnimalId;
  alive: boolean;
  hp: number;
  hostile: boolean;
  speed: number;
  size: number;
  contactCooldown: number;
}

interface HuntState {
  hunterX: number;
  hunterY: number;
  animals: HuntAnimal[];
  bullets: Array<{ x: number; y: number; vx: number; vy: number }>;
  killed: AnimalId[];
  shotsFired: number;
  partyDamage: number;
  remainingMs: number;
  done: boolean;
  facing: { x: number; y: number };
}

const HUNT_W = 480;
const HUNT_H = 280;
const HOSTILE_HIT_DAMAGE = 8;

function huntBgForEnv(env: 'plains' | 'forest' | 'mountains' | 'desert' | 'river-valley'): string {
  if (env === 'forest') return '#021';
  if (env === 'mountains') return '#112';
  if (env === 'desert') return '#210';
  if (env === 'river-valley') return '#012';
  return '#021';
}

function huntStippleForEnv(env: 'plains' | 'forest' | 'mountains' | 'desert' | 'river-valley'): string {
  if (env === 'forest') return '#163';
  if (env === 'mountains') return '#445';
  if (env === 'desert') return '#642';
  if (env === 'river-valley') return '#246';
  return '#243';
}

export function showHunt(): void {
  if (!engine) return;
  void playMusic('hunt', { loop: true });
  const state = engine.state;
  if (!canHunt(state).ok) return showTrail();

  renderWith((r) => {
    r.appendChild(el('h2', { text: 'Hunt' }));
    r.appendChild(el('p', {
      class: 'center dim',
      html: 'Move with <span class="kbd">arrow keys</span>. Aim with last direction. Fire with <span class="kbd">space</span>. <span class="kbd">esc</span> to leave.',
    }));
    const env = currentEnvironment(DEFAULT_ROUTE, state);
    const envLabel = el('p', { class: 'center dim', text: `Terrain: ${env}` });
    envLabel.setAttribute('data-testid', 'hunt-env');
    r.appendChild(envLabel);
    const wrap = el('div', { class: 'canvas-wrap' });
    const canvas = el('canvas');
    canvas.setAttribute('data-testid', 'hunt-canvas');
    (canvas as HTMLCanvasElement).width = HUNT_W;
    (canvas as HTMLCanvasElement).height = HUNT_H;
    wrap.appendChild(canvas);
    r.appendChild(wrap);
    const status = el('p', { class: 'center', text: 'Time: 30s' });
    status.setAttribute('data-testid', 'hunt-status');
    r.appendChild(status);

    const ctx = (canvas as HTMLCanvasElement).getContext('2d')!;
    const rng = createRng(engine!.state.rngSeed ^ 0xa5a5a5);
    const huntState: HuntState = {
      hunterX: HUNT_W / 2,
      hunterY: HUNT_H / 2,
      animals: [],
      bullets: [],
      killed: [],
      shotsFired: 0,
      partyDamage: 0,
      remainingMs: 30_000,
      done: false,
      facing: { x: 1, y: 0 },
    };
    for (let i = 0; i < 5; i++) {
      const def: AnimalDef = pickAnimalForEnvironment(rng, env);
      huntState.animals.push({
        x: rng.range(20, HUNT_W - 20),
        y: rng.range(20, HUNT_H - 20),
        vx: rng.range(-1, 1),
        vy: rng.range(-1, 1),
        kind: def.id,
        alive: true,
        hp: def.hpToKill,
        hostile: !!def.hostile,
        speed: def.speed,
        size: def.sizePx,
        contactCooldown: 0,
      });
    }

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (huntState.done) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Escape'].includes(e.key)) e.preventDefault();
      if (e.key === 'Escape') { finish(); return; }
      keys.add(e.key);
      if (e.key === ' ') {
        const speed = 4;
        huntState.bullets.push({
          x: huntState.hunterX,
          y: huntState.hunterY,
          vx: huntState.facing.x * speed,
          vy: huntState.facing.y * speed,
        });
        huntState.shotsFired += 1;
        shoot();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let last = performance.now();
    let raf = 0;
    function loop(now: number): void {
      const dt = now - last;
      last = now;
      if (huntState.done) return;
      tick(dt);
      draw();
      huntState.remainingMs -= dt;
      status.textContent = `Time: ${Math.max(0, Math.ceil(huntState.remainingMs / 1000))}s | Killed: ${huntState.killed.length}`;
      if (huntState.remainingMs <= 0) { finish(); return; }
      raf = requestAnimationFrame(loop);
    }

    function tick(dt: number): void {
      const speed = dt * 0.12;
      let dx = 0, dy = 0;
      if (keys.has('ArrowUp')) dy -= 1;
      if (keys.has('ArrowDown')) dy += 1;
      if (keys.has('ArrowLeft')) dx -= 1;
      if (keys.has('ArrowRight')) dx += 1;
      if (dx !== 0 || dy !== 0) huntState.facing = { x: Math.sign(dx), y: Math.sign(dy) };
      huntState.hunterX = clampN(huntState.hunterX + dx * speed, 8, HUNT_W - 8);
      huntState.hunterY = clampN(huntState.hunterY + dy * speed, 8, HUNT_H - 8);

      for (const a of huntState.animals) {
        if (!a.alive) continue;
        if (a.hostile) {
          const hdx = huntState.hunterX - a.x;
          const hdy = huntState.hunterY - a.y;
          const dist = Math.hypot(hdx, hdy) || 1;
          a.vx = (hdx / dist) * a.speed;
          a.vy = (hdy / dist) * a.speed;
        }
        a.x += a.vx * dt * 0.04;
        a.y += a.vy * dt * 0.04;
        if (!a.hostile) {
          if (a.x < 8 || a.x > HUNT_W - 8) a.vx *= -1;
          if (a.y < 8 || a.y > HUNT_H - 8) a.vy *= -1;
        } else {
          a.x = clampN(a.x, 8, HUNT_W - 8);
          a.y = clampN(a.y, 8, HUNT_H - 8);
        }
        if (a.contactCooldown > 0) a.contactCooldown -= dt;

        if (a.hostile && a.contactCooldown <= 0) {
          const ddx = a.x - huntState.hunterX;
          const ddy = a.y - huntState.hunterY;
          const reach = a.size / 2 + 8;
          if (ddx * ddx + ddy * ddy < reach * reach) {
            huntState.partyDamage += HOSTILE_HIT_DAMAGE;
            a.contactCooldown = 800;
            const knock = 20;
            a.x = clampN(a.x + (ddx > 0 ? knock : -knock), 8, HUNT_W - 8);
            a.y = clampN(a.y + (ddy > 0 ? knock : -knock), 8, HUNT_H - 8);
          }
        }
      }

      for (const b of huntState.bullets) {
        b.x += b.vx * dt * 0.3;
        b.y += b.vy * dt * 0.3;
      }
      huntState.bullets = huntState.bullets.filter((b) => b.x > 0 && b.x < HUNT_W && b.y > 0 && b.y < HUNT_H);

      const consumed = new Set<number>();
      for (let bi = 0; bi < huntState.bullets.length; bi++) {
        if (consumed.has(bi)) continue;
        const b = huntState.bullets[bi];
        for (const a of huntState.animals) {
          if (!a.alive) continue;
          const r = a.size / 2 + 4;
          const dx2 = a.x - b.x;
          const dy2 = a.y - b.y;
          if (dx2 * dx2 + dy2 * dy2 < r * r) {
            a.hp -= 1;
            consumed.add(bi);
            if (a.hp <= 0) {
              a.alive = false;
              huntState.killed.push(a.kind);
            }
            hit();
            break;
          }
        }
      }
      if (consumed.size > 0) {
        huntState.bullets = huntState.bullets.filter((_b, i) => !consumed.has(i));
      }
    }

    function draw(): void {
      const bgImg = getImage(`hunt-${env}`);
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, HUNT_W, HUNT_H);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, 0, HUNT_W, HUNT_H);
      } else {
        ctx.fillStyle = huntBgForEnv(env);
        ctx.fillRect(0, 0, HUNT_W, HUNT_H);
        ctx.fillStyle = huntStippleForEnv(env);
        for (let i = 0; i < 60; i++) {
          const px = (i * 37) % HUNT_W;
          const py = (i * 53) % HUNT_H;
          ctx.fillRect(px, py, 2, 2);
        }
      }
      // hunter
      ctx.fillStyle = '#ff5';
      ctx.fillRect(huntState.hunterX - 6, huntState.hunterY - 8, 12, 16);
      ctx.fillStyle = '#0a0';
      ctx.fillRect(huntState.hunterX - 4 + huntState.facing.x * 8, huntState.hunterY - 2 + huntState.facing.y * 8, 8, 4);
      // animals
      for (const a of huntState.animals) {
        if (!a.alive) continue;
        ctx.fillStyle = ANIMALS[a.kind].color;
        const size = a.size;
        ctx.fillRect(a.x - size / 2, a.y - size / 2, size, size);
        if (a.hp < ANIMALS[a.kind].hpToKill) {
          ctx.fillStyle = '#f33';
          ctx.fillRect(a.x - size / 2, a.y - size / 2 - 3, size, 1);
        }
      }
      // bullets
      ctx.fillStyle = '#fff';
      for (const b of huntState.bullets) ctx.fillRect(b.x - 1, b.y - 1, 3, 3);
    }

    function finish(): void {
      huntState.done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      const result = applyHunt(state, huntState.killed, huntState.shotsFired, huntState.partyDamage);
      const meatList = huntState.killed.map((k) => `${k} (${ANIMAL_MEAT[k]} lbs)`).join(', ') || 'nothing';
      const dmg = huntState.partyDamage > 0 ? ` Took ${huntState.partyDamage} damage from hostile beasts.` : '';
      const huntMsg = `Hunt: shot ${result.ammoUsed} bullets, killed ${meatList}, brought back ${result.meatGained} lbs.${dmg}`;
      state.log.push(huntMsg);
      addJournalEntry(state, 'hunt', huntMsg, state.currentNodeId);
      showTrail();
    }

    raf = requestAnimationFrame(loop);

    // Auto-finish hook for tests via URL param ?autohunt=meat-amount
    if (typeof window !== 'undefined') {
      const u = new URL(window.location.href);
      const auto = u.searchParams.get('autohunt');
      if (auto) {
        const n = parseInt(auto, 10);
        if (Number.isFinite(n) && n > 0) {
          // simulate killing one buffalo
          huntState.killed.push('buffalo');
          huntState.shotsFired = 1;
          setTimeout(() => finish(), 50);
        }
      }
    }
  });
}

function clampN(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function showEndScreen(): void {
  if (!engine) return;
  const state = engine.state;
  if (!state.victory && state.epitaph === null) {
    return showTombstone(() => showEndScreen());
  }
  const over = checkGameOver(state);
  const score = computeScore(state);
  if (state.victory) { fanfare(); void playMusic('victory'); }
  else { dirge(); void playMusic('dirge'); }

  if (state.victory) {
    const entry = makeScoreEntry(state);
    recordScore(entry);
  }

  renderWith((r) => {
    r.appendChild(el('h1', { text: state.victory ? 'You made it to Oregon!' : 'Game Over' }));
    r.appendChild(el('p', { class: 'center', text: over.reason ?? '' }));
    const survivors = aliveCount(state);
    r.appendChild(el('p', { class: 'center', text: `Survivors: ${survivors}/${state.party.length}` }));
    if (state.victory && state.loan) {
      const bal = state.loan.outstandingPrincipal + state.loan.outstandingInterest;
      r.appendChild(el('p', { class: 'warn center', text: `Unpaid loan: $${bal.toFixed(2)} — score penalty $${(bal * 2).toFixed(0)}.` }));
    }
    r.appendChild(el('p', { class: 'center', text: `Final score: ${score}` }));
    const t = el('table');
    t.appendChild(el('tr', { html: '<th>Name</th><th>Status</th><th>Health</th>' }));
    for (const m of state.party) {
      const tr = el('tr');
      tr.appendChild(el('td', { text: m.name }));
      tr.appendChild(el('td', { text: m.alive ? 'alive' : 'deceased' }));
      tr.appendChild(el('td', { text: String(m.health) }));
      t.appendChild(tr);
    }
    r.appendChild(t);
    const back = el('button', { class: 'primary', text: 'Back to title' });
    back.setAttribute('data-testid', 'back-to-title');
    back.addEventListener('click', () => { engine = null; stopMusic(); showTitle(); });
    r.appendChild(back);
    const top = el('button', { text: 'View top ten' });
    top.setAttribute('data-testid', 'view-top');
    top.addEventListener('click', () => showTopTen());
    r.appendChild(top);
  });
}

export function showTopTen(): void {
  renderWith((r) => {
    r.appendChild(el('h2', { text: 'Top Ten Trail Bosses' }));
    const list = loadTopTen();
    if (list.length === 0) {
      r.appendChild(el('p', { class: 'center dim', text: 'No scores yet.' }));
    } else {
      const t = el('table');
      t.appendChild(el('tr', { html: '<th>#</th><th>Name</th><th>Score</th><th>Profession</th><th>Date</th>' }));
      list.forEach((s, i) => {
        const tr = el('tr');
        tr.appendChild(el('td', { text: String(i + 1) }));
        tr.appendChild(el('td', { text: s.name }));
        tr.appendChild(el('td', { text: String(s.score) }));
        tr.appendChild(el('td', { text: s.profession }));
        tr.appendChild(el('td', { text: s.date }));
        t.appendChild(tr);
      });
      r.appendChild(t);
    }
    const back = el('button', { class: 'primary', text: 'Back' });
    back.setAttribute('data-testid', 'top-back');
    back.addEventListener('click', () => showTitle());
    r.appendChild(back);
  });
}
