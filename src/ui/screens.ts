import type { GameState } from '../core/types';
import type { Profession, Month } from '../core/types';
import { LANDMARKS, currentLandmark, milesToNextLandmark } from '../core/landmarks';
import { totalDistance, setPace, setRations, rest } from '../core/travel';
import { aliveCount, aliveMembers, createInitialState, PROFESSION_STARTING_MONEY } from '../core/state';
import { INDEPENDENCE_PRICES, priceListFor, purchase, isReadyToDepart, type Item, type PriceList } from '../core/store';
import { crossRiver, type CrossMethod, FERRY_COST } from '../core/rivers';
import { generateOffer, applyTrade, type TradeOffer } from '../core/trading';
import { computeScore, makeScoreEntry, recordScore, loadTopTen, checkGameOver } from '../core/scoring';
import { canHunt, ANIMAL_MEAT, applyHunt, pickAnimal, type Animal } from '../core/hunting';
import { createEngine, type Engine } from '../core/engine';
import { formatDate } from '../core/calendar';
import { el, clear, focusFirstButton } from './dom';
import { beep, blip, shoot, hit, fanfare, dirge, isMuted, setMuted } from './sound';
import { createRng } from '../core/rng';

const root = document.getElementById('screen')!;
let engine: Engine | null = null;

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
  renderWith((r) => {
    r.appendChild(el('h1', { text: 'The Oregon Trail' }));
    r.appendChild(el('div', {
      class: 'title-art',
      text: `      ___________
   __/__|__|__|__\\__
  |  *   *   *   *  |
   \\_O_____________O_/
       Oregon or Bust!`,
    }));
    r.appendChild(el('p', { class: 'center dim', text: '1985 — MECC Edition (web)' }));
    const menu = el('div', { class: 'menu' });
    const start = el('button', { class: 'primary menu-item', text: 'Start a new game' });
    start.setAttribute('data-testid', 'start-game');
    start.addEventListener('click', () => { beep(); showProfession(); });
    const top = el('button', { class: 'menu-item', text: 'View top ten' });
    top.addEventListener('click', () => { blip(); showTopTen(); });
    menu.append(start, top);
    r.appendChild(menu);
  });
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
  showStore();
}

function statusBar(state: GameState): HTMLElement {
  const lm = currentLandmark(state.landmarkIndex);
  const next = LANDMARKS[state.landmarkIndex + 1];
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
  const last = state.log.slice(-8);
  for (const line of last) box.appendChild(el('p', { text: line }));
  box.scrollTop = box.scrollHeight;
  return box;
}

export function showStore(): void {
  if (!engine) return;
  const state = engine.state;
  const lm = currentLandmark(state.landmarkIndex);
  const prices: PriceList = lm.id === 'independence' ? INDEPENDENCE_PRICES : priceListFor(lm.id);
  renderWith((r) => {
    r.appendChild(el('h2', { text: lm.id === 'independence' ? "Matt's General Store — Independence" : `${lm.name} — Trader` }));
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
      const back = el('button', { class: 'primary', text: 'Continue on the trail' });
      back.setAttribute('data-testid', 'leave-store');
      back.addEventListener('click', () => { beep(); showTrail(); });
      r.appendChild(back);
    }

    r.appendChild(statusBar(state));
    r.appendChild(logBox(state));
  });
}

export function showTrail(): void {
  if (!engine) return;
  const state = engine.state;
  if (state.ended) return showEndScreen();

  const lm = LANDMARKS[state.landmarkIndex];
  if (lm.kind === 'river' && state.milesTraveled === lm.milesFromStart) return showRiver();
  if (lm.kind === 'fort' && state.milesTraveled === lm.milesFromStart) return showLandmark();
  if (lm.kind === 'natural' && state.milesTraveled === lm.milesFromStart) return showLandmark();
  if (lm.kind === 'destination') return showEndScreen();

  renderWith((r) => {
    r.appendChild(el('h2', { text: 'On the Trail' }));
    const next = LANDMARKS[state.landmarkIndex + 1];
    const remaining = milesToNextLandmark(state.landmarkIndex, state.milesTraveled);
    r.appendChild(el('p', { class: 'center', text: `Next landmark: ${next?.name ?? '—'} (${remaining} miles)` }));

    const menu = el('div', { class: 'menu' });
    const cont = el('button', { class: 'primary menu-item', text: 'Continue (advance one day)' });
    cont.setAttribute('data-testid', 'continue');
    cont.addEventListener('click', () => { engine!.step(); blip(); showTrail(); });

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

    menu.append(cont, change, restBtn, huntBtn, tradeBtn);
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

export function showLandmark(): void {
  if (!engine) return;
  const state = engine.state;
  const lm = currentLandmark(state.landmarkIndex);
  renderWith((r) => {
    r.appendChild(el('h2', { text: lm.name }));
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
      // bump miles so we don't re-enter on every check
      state.milesTraveled += 1;
      beep();
      showTrail();
    });
    menu.append(look, cont);
    r.appendChild(menu);
    r.appendChild(statusBar(state));
    r.appendChild(logBox(state));
  });
}

export function showRiver(): void {
  if (!engine) return;
  const state = engine.state;
  const lm = currentLandmark(state.landmarkIndex);
  renderWith((r) => {
    r.appendChild(el('h2', { text: lm.name }));
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
        if (result.success) {
          state.milesTraveled += 1;
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

interface HuntState {
  hunterX: number;
  hunterY: number;
  animals: Array<{ x: number; y: number; vx: number; vy: number; kind: Animal; alive: boolean; ttl: number }>;
  bullets: Array<{ x: number; y: number; vx: number; vy: number }>;
  killed: Animal[];
  shotsFired: number;
  remainingMs: number;
  done: boolean;
  facing: { x: number; y: number };
}

const HUNT_W = 480;
const HUNT_H = 280;

export function showHunt(): void {
  if (!engine) return;
  const state = engine.state;
  if (!canHunt(state).ok) return showTrail();

  renderWith((r) => {
    r.appendChild(el('h2', { text: 'Hunt' }));
    r.appendChild(el('p', {
      class: 'center dim',
      html: 'Move with <span class="kbd">arrow keys</span>. Aim with last direction. Fire with <span class="kbd">space</span>. <span class="kbd">esc</span> to leave.',
    }));
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
      remainingMs: 30_000,
      done: false,
      facing: { x: 1, y: 0 },
    };
    for (let i = 0; i < 5; i++) {
      huntState.animals.push({
        x: rng.range(20, HUNT_W - 20),
        y: rng.range(20, HUNT_H - 20),
        vx: rng.range(-1, 1),
        vy: rng.range(-1, 1),
        kind: pickAnimal(rng),
        alive: true,
        ttl: 30_000,
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
        a.x += a.vx * dt * 0.04;
        a.y += a.vy * dt * 0.04;
        if (a.x < 8 || a.x > HUNT_W - 8) a.vx *= -1;
        if (a.y < 8 || a.y > HUNT_H - 8) a.vy *= -1;
      }

      for (const b of huntState.bullets) {
        b.x += b.vx * dt * 0.3;
        b.y += b.vy * dt * 0.3;
      }
      huntState.bullets = huntState.bullets.filter((b) => b.x > 0 && b.x < HUNT_W && b.y > 0 && b.y < HUNT_H);

      for (const b of huntState.bullets) {
        for (const a of huntState.animals) {
          if (!a.alive) continue;
          const dx2 = a.x - b.x;
          const dy2 = a.y - b.y;
          if (dx2 * dx2 + dy2 * dy2 < 14 * 14) {
            a.alive = false;
            huntState.killed.push(a.kind);
            hit();
          }
        }
      }
    }

    function draw(): void {
      ctx.fillStyle = '#001';
      ctx.fillRect(0, 0, HUNT_W, HUNT_H);
      ctx.fillStyle = '#243';
      for (let i = 0; i < 60; i++) {
        const px = (i * 37) % HUNT_W;
        const py = (i * 53) % HUNT_H;
        ctx.fillRect(px, py, 2, 2);
      }
      // hunter
      ctx.fillStyle = '#ff5';
      ctx.fillRect(huntState.hunterX - 6, huntState.hunterY - 8, 12, 16);
      ctx.fillStyle = '#0a0';
      ctx.fillRect(huntState.hunterX - 4 + huntState.facing.x * 8, huntState.hunterY - 2 + huntState.facing.y * 8, 8, 4);
      // animals
      for (const a of huntState.animals) {
        if (!a.alive) continue;
        ctx.fillStyle = a.kind === 'rabbit' ? '#fff' : a.kind === 'deer' ? '#fa5' : a.kind === 'buffalo' ? '#a64' : '#852';
        const size = a.kind === 'rabbit' ? 6 : a.kind === 'deer' ? 10 : a.kind === 'buffalo' ? 16 : 12;
        ctx.fillRect(a.x - size / 2, a.y - size / 2, size, size);
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
      const result = applyHunt(state, huntState.killed, huntState.shotsFired);
      const meatList = huntState.killed.map((k) => `${k} (${ANIMAL_MEAT[k]} lbs)`).join(', ') || 'nothing';
      state.log.push(`Hunt: shot ${result.ammoUsed} bullets, killed ${meatList}, brought back ${result.meatGained} lbs.`);
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
  const over = checkGameOver(state);
  const score = computeScore(state);
  if (state.victory) fanfare(); else dirge();

  if (state.victory) {
    const entry = makeScoreEntry(state);
    recordScore(entry);
  }

  renderWith((r) => {
    r.appendChild(el('h1', { text: state.victory ? 'You made it to Oregon!' : 'Game Over' }));
    r.appendChild(el('p', { class: 'center', text: over.reason ?? '' }));
    const survivors = aliveCount(state);
    r.appendChild(el('p', { class: 'center', text: `Survivors: ${survivors}/${state.party.length}` }));
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
    back.addEventListener('click', () => { engine = null; showTitle(); });
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
