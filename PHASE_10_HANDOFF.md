# Oregon Trail Deluxe Refactor — Phase 10 Handoff

**Date:** 2026-04-28
**Status:** Phases 0–9 complete. Ready to start Phase 10 (Polish + content fill + bundle audit).
**Plan source of truth:** `/Users/jakemalarz/cc-dmz/oregon-trail/DELUXE_REFACTOR_PLAN.md`

---

## Where the project stands

### Completed phases (0–9)

| # | Phase | Outcome |
|---|---|---|
| 0 | Inventory & cleanup | `tone` + `@tonejs/midi` installed |
| 1 | Route graph foundation | `route.ts`, types refactored to graph form |
| 2 | +8 nodes, +3 junctions, route-choice | 26-node graph, 2 active junctions (south-pass, the-dalles); fort-hall is a pass-through pending the California cutoff scope decision |
| 3 | Asset pipeline + photoFrame | `assets.ts`, `photoFrame.ts`, `manifest.json`, ASCII fallback |
| 4 | Audio: MIDI + SFX | Tone.js + sample SFX, mute persists |
| 5 | Banking | `banking.ts`, daily compound interest, `loanPenalty` in scoring, `bankScreen.ts` |
| 6 | Dialogue + 6 NPCs | `dialogue.ts`, `dialogueData.ts`, `dialogueScreen.ts` |
| 7 | Expanded events (41) | `whereWeight` env-weighted roll, `environment.ts` |
| 8 | Hunting expansion | 12 animals, env-aware spawns, hp + hostile chase, env tinted backgrounds |
| 9 | Journal + Guidebook + Tombstone | `journal.ts`, `guidebook.ts`, `tombstone.ts` + 3 screens; epitaph persists in `localStorage['oregon-trail-tombstones-v1']` |

### Test / build green
- `npx tsc --noEmit` — clean
- `npm test` — **240 passed** across 24 unit suites; coverage on `src/core/` **99.35% stmts / 95.30% branch** (gate ≥ 95%)
- `npm run build` — **96 KB gzipped JS**, 1.27 KB CSS
- `npm run e2e` — **22 passed** (Playwright)

### Test hook in place
`window.__engine` is set in `screens.ts` after `createEngine`. Used by `tests/e2e/tombstone.spec.ts` to force-kill the party. Keep it.

---

## Phase 10 — Polish + content fill + bundle audit

The plan calls for:
1. **All photos in.** Confirm the user's `generated-images/` are wired into `public/img/` via `manifest.json`. The plan's image map is in `DELUXE_REFACTOR_PLAN.md` §2.3 (25 landmark nodes; tombstone image id = `tombstone`). User said pre-compaction: "I created the 30 images saved under @generated-images/. You may need to resize them" — verify resize/format pass before shipping.
2. **MIDI + SFX in.** Confirm 9 MIDI tracks (`title`, `travel_a`, `travel_b`, `hunt`, `victory`, `dirge`, `store`, `landmark`, `dialogue`) and 10 SFX files (`gunshot`, `wagon-creak`, `river-splash`, `thunder`, `ox-low`, `coin`, `death-thud`, `arrival-bell`, `wind-loop`, `firewood-crackle`) exist in `public/midi/` and `public/sfx/`, and that the manifest references them. `setMidiPaths(m.midi)` is already wired on title-screen preload.
3. **Bundle audit.** Target: total assets < 5 MB, JS gzipped < 300 KB. Currently JS is 96 KB gzipped — well under. Check asset weight after photos drop in.
4. **Lighthouse cold-load** — aim < 5 s first-paint on broadband.
5. **Manual full Deluxe playthrough** — banker, take a $500 loan, choose Bridger detour at South Pass, choose Barlow Toll Road at The Dalles, arrive Willamette, score reflects loan penalty.
6. **Music sanity check** — title plays Oh! Susanna, trail loops, hunt plays Camptown Races, death plays dirge, mute persists across reload.

### Open question to flag at review (assumption #5 in the plan)
"Wagons Ho!" was substituted with **Sweet Betsy from Pike** because the former is 1957 (not PD). Confirm with user that's still fine when polishing audio.

### Known small items worth doing in Phase 10
- `tombstone.ts` lines 21–22 (`defaultStorage` localStorage check) cannot easily be covered both ways under jsdom — currently 91% branch on that file. Acceptable; do not chase.
- `dialogueData.ts` line 152 — one branch in a `visibleIf` predicate. Not load-bearing.
- The fort-hall junction is **deliberately a single edge** (Oregon-only scope). If user wants California cutoff, this is the place to add it.
- `huntScene` background currently uses solid env tint + stipple; if `hunt-plains` / `hunt-forest` / `hunt-mountains` images land via the manifest, swap the canvas fill for a drawn image — code already has `currentEnvironment` at the top of `showHunt()`.

---

## Important file locations

### Core (pure, tested)
- `src/core/route.ts`, `landmarks.ts`, `travel.ts`, `engine.ts`, `state.ts`, `types.ts`
- `src/core/banking.ts`, `dialogue.ts`, `dialogueData.ts`
- `src/core/journal.ts`, `guidebook.ts`, `tombstone.ts`
- `src/core/animals.ts`, `hunting.ts`, `environment.ts`
- `src/core/events.ts` (41 events with `whereWeight`)
- `src/core/scoring.ts` (subtracts `loanPenalty`)

### UI
- `src/ui/screens.ts` — single big file (~1000 lines). Split into `screens/*.ts` is **deferred**; the plan called for it but Phase 10 may want to keep it monolithic since splits add merge risk during content fill. **Decide with the user before splitting.**
- `src/ui/photoFrame.ts`, `assets.ts`, `midi.ts`, `sfx.ts` (shim from `sound.ts`)
- `src/ui/bankScreen.ts`, `dialogueScreen.ts`

### Tests
- 24 unit suites in `tests/unit/*.test.ts`
- 9 E2E specs in `tests/e2e/*.spec.ts` (banking, branching, dialogue, guidebook, happy-path, journal, scenarios, title, tombstone)

### Plan + reference
- `DELUXE_REFACTOR_PLAN.md` — the canonical plan
- `generated-images/` — user-supplied AI images (need wiring/resizing in Phase 10)

---

## How to verify before shipping Phase 10

```bash
cd /Users/jakemalarz/cc-dmz/oregon-trail
npm install
npm test            # vitest, must hit 95% gate
npm run e2e         # 22+ playwright tests
npm run dev         # manual sanity at http://localhost:5173
npm run build       # tsc + vite, check bundle size
```

Final acceptance per the plan:
- Manual full Deluxe playthrough as described above.
- All branching, dialogue, banking, journal, tombstone E2E green.
- Bundle: total assets <5 MB, JS gzipped <300 KB.
- Audio: title/trail/hunt/death music plays; mute persists across reload.

---

## Key conventions to keep

- 95% branch-coverage gate on `src/core/*.ts` — every new core module ships with tests in same change.
- Determinism via seeded RNG — never call `Math.random()` in core.
- Pure-core / UI split — DOM and `window` only inside `src/ui/`.
- Test hook `window.__engine` is intentional — leave it for E2E.
- Don't add backwards-compat shims for the old 1985 era — 1985 lives only in git history.
