# The Oregon Trail (1985 Web Edition)

A faithful web recreation of the 1985 MECC release of *The Oregon Trail*.
Pure static site. Deployable to any S3 bucket.

## Stack

- **TypeScript** + **Vite** for build
- **Vanilla DOM + Canvas2D** for rendering
- **Vitest** for unit tests (≥95% coverage on `src/core`)
- **Playwright** for headless E2E tests
- **Web Audio** for PC-speaker-style sound effects

## Scripts

| Command            | What it does                                        |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Vite dev server at http://localhost:5173            |
| `npm run build`    | Type-check and build to `dist/`                     |
| `npm run preview`  | Serve `dist/` at http://localhost:4173              |
| `npm test`         | Vitest run with v8 coverage (95% gate on `core/`)   |
| `npm run e2e`      | Playwright tests (Chromium headless)                |
| `npm run lint`     | ESLint + tsc                                        |
| `npm run package`  | Build and produce `oregon-trail-dist.zip`           |

## Deploying

See [DEPLOY.md](./DEPLOY.md).

## Architecture

```
src/
├── core/         pure game logic — fully unit-tested
├── ui/           DOM/Canvas rendering, screens, sound
├── main.ts       entry point
└── styles.css

tests/
├── unit/         Vitest unit tests for core/
└── e2e/          Playwright end-to-end tests
```

Game state is held in plain objects (`GameState`). The core module is
side-effect-free apart from RNG state — all randomness flows through a
seeded PRNG (`createRng`), so any run can be replayed by passing
`?seed=<int>` in the URL.

## Game features (1985 fidelity)

- Three professions: Banker (×1), Carpenter (×2), Farmer (×3)
- Departure month March–July
- Matt's General Store at Independence + fort prices along the way
- 17 trail landmarks from Independence to Willamette Valley
- Daily travel tick with pace, rations, food consumption, weather
- 21 random events (illness, broken parts, theft, weather, etc.)
- River crossings: ford / caulk / ferry / wait
- Hunting minigame (keyboard, Canvas2D)
- Trading at trail and forts
- Death, illness, and scoring with top-ten via `localStorage`

## Coverage

Latest run: 99.2% statements / 96.31% branches / 100% functions / 99.2% lines
on `src/core/`. The 95% threshold is enforced in `vitest.config.ts`.
