# Oregon Trail Deluxe (1992) — Refactor Plan

## Context

The repo at `/Users/jakemalarz/cc-dmz/oregon-trail` is a clean, well-tested
TypeScript + Vite + Vanilla DOM/Canvas2D recreation of the 1985 Oregon Trail
(~2000 LOC, 95%+ unit-test coverage on `src/core/`, full Playwright E2E,
seeded deterministic RNG, CGA/Apple II terminal aesthetic).

The goal is **full parity with the 1992 Oregon Trail Deluxe** edition, in
place. 1985 lives only in git history — no era toggle. We layer Deluxe
systems onto the existing pure-core/UI split, preserving the testable
core, deterministic seeding, and 95% gate.

Per user direction:
- **Visuals:** prefer public-domain photos (Library of Congress, National
  Archives, USGS, Wikimedia Commons). Where photos are missing or
  unsuitable, the plan calls out the gap and provides a Gemini prompt;
  the user generates those images themselves on their Gemini Pro plan.
- **Audio:** real MIDI playback via a JS library (Tone.js +
  `@tonejs/midi`).
- **Scope:** full parity (route branching, banking, expanded events &
  animals, NPC dialogue, music, photo backgrounds, journal/guidebook,
  tombstone w/ epitaph).

---

## Assumptions (flag any to flip before we start)

1. **California cutoff** is *not* included. Deluxe shipped it; we focus on
   the Oregon Trail per the project name.
2. **Bank repayment** can happen at *any* fort (more forgiving than 1992,
   which was Independence-only). Trivial to flip.
3. **Tombstone Easter egg** (other players' epitaphs appearing at the
   node where they died) defaults **ON**.
4. **Save/resume** — auto-save to localStorage each step, "Continue your
   journey" button on title. Defaults **ON**.
5. **"Wagons Ho!"** is substituted with **"Sweet Betsy from Pike"** (the
   former is a 1957 TV theme, not PD). All other tunes confirmed PD.
6. **MIDI library**: Tone.js + `@tonejs/midi` (~160 KB gzipped). If you
   want SF2-quality samples instead, we swap to `soundfont-player`.
7. **Final landmark count: 25 nodes** including 3 branch junctions.
8. **Native American depiction**: respectful, named tribes where
   historically appropriate (Cayuse, Nez Perce), Edward S. Curtis
   composition reference for portraits, no stereotype regalia.

---

## 1. Architecture changes

### 1.1 New modules (pure-core, count toward 95% gate)

| File | Responsibility |
|---|---|
| `src/core/route.ts` | Graph nodes, edges, junctions. `currentNode`, `availableExits`, `chooseExit`, `milesToNextNode`. Replaces linear `landmarkIndex`. |
| `src/core/banking.ts` | Loan lifecycle: `applyForLoan`, `accrueInterest`, `repayLoan`, `loanPenalty`. |
| `src/core/dialogue.ts` | Conversation state machine over `DialogueGraph`. `startDialogue`, `chooseDialogueOption`. |
| `src/core/dialogueData.ts` | Authored conversation graphs (6 NPCs at start). |
| `src/core/journal.ts` | Append-only diary entries. |
| `src/core/guidebook.ts` | Pre-authored historical text per landmark for "Learn About the Trail". |
| `src/core/tombstone.ts` | Persist epitaphs; load others'; merge into trail Easter egg. |
| `src/core/animals.ts` | 12 animal defs with environment biome mapping. |
| `src/core/environment.ts` | Derives `Environment` from current node/edge. |
| `src/core/eventsExpanded.ts` | 41 events split into themed packs. Replaces `events.ts`. |
| `src/core/save.ts` | Versioned save/load (v1 schema). |

### 1.2 New UI / asset modules

| File | Responsibility |
|---|---|
| `src/ui/assets.ts` | Image preload + cache; ASCII fallback if missing. |
| `src/ui/midi.ts` | Tone.js MIDI player; `play`, `stop`, `duck` for dialogue. |
| `src/ui/sfx.ts` | Sample-based SFX; replaces synth-only `sound.ts`. |
| `src/ui/photoFrame.ts` | 480×300 photo + cyan caption + CGA frame component. |
| `src/ui/screens/*` | **Split** the 706-line `screens.ts` into one file per screen. |
| `src/ui/dialogueScreen.ts` | Render dialogue tree; dispatches to `core/dialogue.ts`. |
| `src/ui/journalScreen.ts` | Diary view. |
| `src/ui/guidebookScreen.ts` | "Learn About the Trail" gallery. |
| `src/ui/tombstoneScreen.ts` | Death screen with epitaph input. |
| `src/ui/bankScreen.ts` | Bank of Independence. |
| `src/ui/routeChoiceScreen.ts` | Junction decision UI. |
| `src/ui/huntScene.ts` | Extracted hunt minigame, expanded for 12 animals + 3 envs. |

### 1.3 Modules requiring significant refactor

- **`src/core/landmarks.ts`** — converted from `Landmark[]` to a
  `RouteGraph` builder. Existing wrappers (`currentLandmark`,
  `nextLandmark`, `milesToNextLandmark`) become thin adapters over
  `route.ts` and are removed in phase 2 once tests are migrated.
- **`src/core/travel.ts`** — `dailyTravel` advances `milesIntoEdge`
  along the current edge. On edge exhaustion, sets `currentNodeId =
  edge.toNodeId`, clears `currentEdgeId`, and (if junction) raises
  `pendingChoice`.
- **`src/core/events.ts`** → `eventsExpanded.ts`. Each event def gains
  `whereWeight: Partial<Record<Environment, number>>`.
- **`src/core/hunting.ts`** — slimmed; animal data moves to
  `animals.ts`.
- **`src/core/store.ts`** — extend `FORT_PRICE_MULTIPLIERS` for new
  forts (Bridger, Vancouver).
- **`src/core/scoring.ts`** — subtract unpaid loan principal+interest
  from final score.
- **`src/ui/screens.ts`** — split into `src/ui/screens/`; becomes a
  barrel re-export.
- **`src/ui/sound.ts`** — re-export shim from `sfx.ts` during
  transition; deleted in final phase.

### 1.4 Type system additions (in `src/core/types.ts`)

```ts
export type Environment = 'plains' | 'forest' | 'mountains'
                        | 'desert' | 'river-valley';

export interface Landmark {
  id: string;
  name: string;
  kind: LandmarkKind;
  riverDepth?: number;
  riverWidth?: number;
  ferry?: boolean;
  environment?: Environment;
  imageId?: string;
  guidebookId?: string;
}

export interface RouteEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  miles: number;
  environment: Environment;
  difficulty?: 'easy' | 'normal' | 'hard';
  description?: string;
}

export interface RouteGraph {
  nodes: Record<string, Landmark>;
  edges: RouteEdge[];
  startNodeId: string;
  destinationNodeId: string;
  outgoing: Record<string, RouteEdge[]>;
}

export interface Loan {
  principal: number;
  interestRate: number;
  takenOn: { month: Month; day: number; year: number };
  daysAccrued: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
}

export interface DialogueChoice {
  id: string;
  text: string;
  next?: string;
  effects?: DialogueEffect[];
  visibleIf?: (state: GameState) => boolean;
}
export interface DialogueNode {
  id: string;
  speaker: string;
  text: string | ((state: GameState) => string);
  choices: DialogueChoice[];
}
export type DialogueEffect =
  | { kind: 'addItem'; item: Item; qty: number }
  | { kind: 'removeItem'; item: Item; qty: number }
  | { kind: 'addMoney'; amount: number }
  | { kind: 'flag'; key: string; value: boolean }
  | { kind: 'log'; text: string }
  | { kind: 'health'; delta: number; targetIndex?: number }
  | { kind: 'rumor'; key: string };
export interface DialogueGraph {
  id: string;
  nodes: Record<string, DialogueNode>;
  startNodeId: string;
}

export interface JournalEntry {
  date: { month: Month; day: number; year: number };
  kind: 'arrived' | 'event' | 'death' | 'choice' | 'note';
  nodeId?: string;
  text: string;
}

export interface AnimalDef {
  id: string;
  meatLbs: number;
  spawnWeight: number;
  hpToKill: number;
  sizePx: number;
  speed: number;
  environments: Environment[];
  color: string;
}

export type ScreenName =
  | 'title' | 'profession' | 'partyNames' | 'departure'
  | 'store' | 'bank' | 'trail' | 'landmark' | 'river' | 'hunt'
  | 'trade' | 'rest' | 'gameOver' | 'victory' | 'topTen'
  | 'routeChoice' | 'dialogue' | 'journal' | 'guidebook'
  | 'tombstone';
```

### 1.5 `GameState` shape changes

```ts
export interface GameState {
  // unchanged
  party: PartyMember[]; profession: Profession; money: number;
  inventory: Inventory; wagon: Wagon; pace: Pace; rations: Rations;
  date: { month: Month; day: number; year: number };
  weather: Weather; log: string[]; rngSeed: number;
  ended: boolean; victory: boolean;

  // CHANGED: linear → graph
  milesTraveled: number;        // now derived
  currentNodeId: string;        // replaces landmarkIndex
  currentEdgeId: string | null; // null when AT a node
  milesIntoEdge: number;

  // NEW
  visitedNodeIds: string[];
  pendingChoice: string | null;
  loan: Loan | null;
  flags: Record<string, boolean>;
  rumors: string[];
  journal: JournalEntry[];
  epitaph: string | null;
  pendingDialogueId: string | null;
  saveVersion: 1;
}
```

### 1.6 Asset loading strategy

- Manifest at `public/manifest.json`: `{ images, midi, sfx }`.
- Preload all assets on title screen behind a progress bar.
- Total budget: <4 MB images, <500 KB MIDI+SFX combined.
- `assets.ts` keeps a `Map<id, HTMLImageElement>`; missing → null →
  ASCII fallback in `photoFrame.ts`.
- Format: **PNG, 480×300**, indexed-color quantized to 64–128 colors,
  ≤80 KB each. (PNG over WebP for one-codepath simplicity.)
- Vite copies `public/img/`, `public/midi/`, `public/sfx/` verbatim.

---

## 2. Visual / asset strategy

### 2.1 Repo layout

```
public/
  manifest.json
  img/{title,landmarks,events,portraits,hunt,misc}/*.png
  midi/*.mid
  sfx/*.wav
```

Naming: kebab-case, `.png` images, `.mid` MIDI, 16-bit mono 22050 Hz
`.wav` for SFX.

### 2.2 CGA + photo integration

Keep monospace cyan-on-black UI as the "TV bezel". Photo lives inside
a 1px cyan-bordered frame, caption in cyan beneath it, action menu in
existing CGA style below that.

```
+----------------------------------------------------------+
|                  CHIMNEY ROCK                  [sound on]|
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |               [ 480x300 photo ]                    |  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|     "An unmistakable spire on the western plains."       |
|                                                          |
|   > Look around                                          |
|     Talk to people                                       |
|     Read guidebook entry                                 |
|     Continue on the trail                                |
|                                                          |
|--------- status bar: date, weather, miles, $, etc. ------|
|   [last 4 log lines]                                     |
+----------------------------------------------------------+
```

### 2.3 Landmark image source recommendations (25 nodes)

LoC = Library of Congress, NA = National Archives, WC = Wikimedia
Commons (PD), USGS = US Geological Survey (PD), AI = generate via
Gemini using prompts in §2.5.

| # | Node ID | Name | Source | Notes |
|---|---|---|---|---|
| 1 | `independence` | Independence, MO | LoC / WC | 1850s street scenes available |
| 2 | `kansas-river` | Kansas River Crossing | **AI** | No usable period photo of crossing |
| 3 | `big-blue` | Big Blue River | **AI** | Same |
| 4 | `fort-kearney` | Fort Kearney | LoC + WC | 1860s photos exist |
| 5 | `chimney-rock` | Chimney Rock | LoC (W.H. Jackson 1866) | Iconic, plenty of PD photos |
| 6 | `fort-laramie` | Fort Laramie | NA + LoC | Abundant period photos |
| 7 | `register-cliff` | Register Cliff | WC / USGS | Real PD photos |
| 8 | `independence-rock` | Independence Rock | LoC (Jackson) | Real, **AI fallback prompt provided** |
| 9 | `devils-gate` | Devil's Gate | LoC (Jackson 1870) | Real |
| 10 | `south-pass` | South Pass | LoC (Jackson) | Real |
| 11 | `fort-bridger` | Fort Bridger (junction) | LoC sketches + **AI** | Sketches PD; AI to fill gameplay frame |
| 12 | `green-river` | Green River Crossing | WC / USGS | Real |
| 13 | `soda-springs` | Soda Springs | LoC (Jackson 1872) + **AI** | Real PD; AI for atmospheric variant |
| 14 | `fort-hall` | Fort Hall | **AI** (period sketches only; need full scene) | |
| 15 | `snake-river` | Snake River Crossing | WC / USGS | Real |
| 16 | `salmon-falls` | Salmon Falls | **AI** | To evoke 1840s state |
| 17 | `three-island` | Three Island Crossing | **AI** | No good period photo |
| 18 | `fort-boise` | Fort Boise | **AI** | HBC sketches insufficient |
| 19 | `blue-mountains` | Blue Mountains | WC / USGS | Real |
| 20 | `fort-walla-walla` | Fort Walla Walla | LoC | Real (Whitman mission area) |
| 21 | `the-dalles` | The Dalles | LoC (Carleton Watkins 1867) | Abundant PD |
| 22 | `barlow-road` | Barlow Toll Road (junction) | WC (Mt. Hood/Laurel Hill) + **AI** | Real PD landscapes; AI for wagon-on-rope scene |
| 23 | `fort-vancouver` | Fort Vancouver | LoC (1845 Vavasour) | Real (sketches) |
| 24 | `oregon-city` | Oregon City | WC (1857 Watkins-style) | Real |
| 25 | `willamette` | Willamette Valley | WC (Watkins) / USGS | Real |

### 2.4 Other scenes needing images

| Screen | Source |
|---|---|
| Title screen background | **AI** (wagon train at sunset) |
| Game over (tombstone) | **AI** |
| Victory (Willamette farm) | LoC / WC |
| Store (Independence) | LoC (1850s general store interiors) |
| Bank | **AI** |
| Trader at fort | **AI** |
| Hunt env: plains | LoC (W.H. Jackson) |
| Hunt env: forest | WC / USGS Pacific NW |
| Hunt env: mountains | WC Rocky Mountains |
| River scene (generic) | LoC (Jackson) + **AI** |
| Thunderstorm event | **AI** |
| Wagon fire event | **AI** |
| Wolf attack event | **AI** |
| Native American encounter | LoC (Edward S. Curtis, PD post-1928) |
| NPC portraits (5+) | LoC daguerreotypes, mixed with **AI** for variety |

### 2.5 Gemini prompts (user-supplied)

**Style preamble (prepend to every prompt):**

> "Output 480×300 pixels. Style: digital matte painting evoking a
> hand-tinted late-19th-century photograph or a 1992-era VGA game
> asset. Muted, period-accurate palette. No text, no watermarks, no
> logos, no UI elements. Realistic atmospheric perspective, soft focus
> on background. No people unless specified."

Numbered prompts:

1. **Kansas River Crossing.** "Wide low-banked river in eastern
   Kansas, mid-1800s. Tall summer prairie grass on near bank,
   oxen-drawn covered wagon partially submerged mid-river, one wagon
   waiting on the near bank. Late afternoon, low sun. Wagons are
   silhouettes at distance."

2. **Big Blue River Crossing.** "Muddy swollen river in Nebraska
   Territory after rain. Cottonwoods on far bank. Makeshift raft with
   a wagon being poled across by indistinct figures. Overcast sky,
   gray-green palette."

3. **Fort Hall (1840s HBC trading post).** "Adobe-walled Hudson's Bay
   Company fort on the Snake River plain, 1840s. Two-story corner
   bastions, log palisade, smoke from a forge. Dry sage-covered plain
   foreground, distant mountains. Late morning light."

4. **Three Island Crossing.** "The Snake River with three small
   willow-covered islands midstream, deep basalt canyon walls, Idaho
   high desert. A wagon train on the north bank inspecting the
   crossing. Dawn, cool blue palette."

5. **Fort Boise (HBC, 1840s).** "Small whitewashed adobe fort with a
   single bastion on the Boise River bottomlands, surrounded by
   cottonwoods. Flagpole, low palisade. Clear summer day."

6. **Salmon Falls.** "Cascading rapids over basalt steps, Idaho high
   desert canyon, sage and rabbitbrush on rim. Native fishing
   platforms (wooden tripods with drying racks) on the rocks. No
   close-up figures. Golden hour."

7. **Title screen.** "Wide horizon: covered wagon train of five
   wagons at sunset, silhouetted on a prairie ridge, Oregon-bound.
   Dramatic orange-purple sky, single planet visible. Cinematic,
   romantic. 4:3 letterboxed feel."

8. **Game Over / tombstone.** "Single weathered wooden tombstone
   planted in shortgrass prairie, rough-cut, no inscription visible.
   Storm clouds gathering on horizon. Gray-green palette, melancholic,
   late evening light. Camera angle low, looking slightly up."

9. **Bank of Independence interior.** "Interior of an 1840s Missouri
   frontier bank: dark wood counter, brass scales, ledgers, oil lamp,
   iron-grilled teller window. No people. Warm amber light from
   window."

10. **Wagon fire event.** "A covered wagon engulfed in flames on a
    moonlit prairie, sparks rising. Two oxen pulling away, panicked.
    A second wagon silhouette in distance. Orange-red palette."

11. **Thunderstorm event.** "Black thunderhead sweeping across an
    open prairie at midday turned dusk, single fork of lightning
    striking distant ground, wagon train running for cover. Greenish
    storm light."

12. **Wolf attack.** "A pack of grey wolves circling a wagon at dusk
    on a Wyoming sage flat, men with rifles silhouetted on the wagon.
    Cold blue twilight palette, tense."

13. **Native American encounter (Plains, friendly).** "An 1840s
    wagon train meeting Plains Native Americans on horseback in
    friendly exchange, both groups dismounted and gesturing.
    Dignified, respectful framing. Distant mountain range. Mid-morning
    warm light. Reference Edward S. Curtis composition. Avoid
    stereotype regalia."

14. **Trader at fort (interior).** "Interior of a frontier trading
    post: a bearded white trader in waistcoat and shirtsleeves behind
    a counter stacked with bolts of cloth, blankets, tin cups, beaver
    pelts. Lamp on counter, dim warm light. Half-length view, looking
    slightly toward camera."

15. **Hunt environment: plains.** "Top-down-tilted view of summer
    Nebraska prairie: shortgrass, scattered cottonwoods, low rolling
    hills, a small creek bed. Empty middle distance for animals to
    move through. Bright daylight."

16. **Hunt environment: forest.** "Top-down-tilted view of Pacific
    Northwest old-growth pine forest understory: ferns, dappled
    light, fallen logs. Open enough for movement. Cool green palette."

17. **Hunt environment: mountains.** "Top-down-tilted view of
    subalpine meadow in Wyoming Rockies, scattered pines, granite
    outcrops, alpine flowers. Cold morning light."

18. **Wagon at river crossing (generic).** "A covered wagon
    mid-ford in a swift shallow river, ox team straining, water
    splashing the wheels, far bank with willows. Dramatic angle,
    late summer."

19. **Independence Rock (fallback if no usable LoC photo).**
    "Granite dome rising from sage flats in central Wyoming,
    gray-pink rock, midday sun. Faint emigrant initials carved on
    the base just visible. Empty, vast, quiet."

20. **Soda Springs (atmospheric variant).** "Bubbling mineral
    springs in Idaho lava country, steam rising, rust-stained
    travertine deposits, sage and lodgepole pines, gray-blue sky.
    Mid-afternoon."

21. **Devil's Gate.** "Narrow rock cleft of the Sweetwater River
    cutting through a granite ridge in Wyoming, low summer flow,
    sunlight on far cliff. Vertical composition adapted to landscape
    framing."

22. **Register Cliff.** "Sandstone bluff face covered in faintly
    visible 1840s emigrant signatures and dates, soft afternoon
    side-lighting bringing out carvings. Prairie grass at base, big
    sky."

23. **Barlow Toll Road / Laurel Hill descent.** "Steep wooded
    slope on south flank of Mount Hood, dense Douglas fir, a wagon
    being lowered by ropes down impossibly steep grade. Mist, autumn
    light, mossy understory."

24. **Fort Vancouver (1845, supplemental to PD sketches).**
    "Hudson's Bay Company Fort Vancouver at the Columbia: large
    palisade, white-washed buildings, Mt. Hood snow-capped on far
    horizon, river in foreground with HBC bateaux."

25. **Oregon City.** "Tiny 1850s settlement at Willamette Falls:
    log and clapboard buildings perched above falls, wooden mill,
    dirt street, low forested hills. Late afternoon golden light."

26. **Victory / Willamette farmstead.** "Single homestead at edge
    of Willamette Valley: log cabin, split-rail fence, fruit trees,
    plowed field. Gentle hills, soft warm sunset, smoke from chimney.
    Hopeful."

27. **NPC: settler woman.** "Half-length portrait of a 1840s
    pioneer woman in calico bonnet and apron, weather-worn but
    composed. Plain background. Daguerreotype tonality."

28. **NPC: missionary.** "Half-length portrait of a 1840s
    Methodist missionary in dark coat and tie, holding a Bible.
    Plain background. Daguerreotype tonality."

29. **NPC: mountain man / trapper.** "Half-length portrait of a
    bearded 1840s mountain man in fringed buckskin, wide-brimmed
    hat, holding a long rifle. Plain background."

30. **NPC: Native American (Cayuse or Nez Perce, generic).**
    "Respectful half-length portrait of a Plateau Native American
    man in 1840s, traditional dress without dramatic stereotyping,
    neutral expression. Reference Edward S. Curtis composition."

Total: ~30 AI images, of which ~15 are required and the rest are
nice-to-have / fallbacks if PD photos disappoint.

#### 2.5.1 Phase-11 fill prompts (11 missing landmark images)

These eleven landmarks currently render the ASCII fallback because
their JPEGs are not yet on disk under `public/img/landmarks/`. Generate
each at 480×300, save with the file name shown, and drop into
`public/img/landmarks/`. Use the same style preamble as §2.5.

31. **Independence, Missouri (`independence.jpg`).** "1840s street
    scene in Independence, Missouri at the edge of the western
    frontier: muddy main street lined with two-story brick and
    clapboard buildings — a general store, a wagon outfitter, a
    livery — with covered wagons parked along the wood-plank
    sidewalk. A few oxen and pioneers visible at distance. Bright
    morning light, hopeful mood. Reference: Currier and Ives prints
    of frontier towns."

32. **Fort Kearney (`fort-kearney.jpg`).** "1860s U.S. Army post on
    the central Nebraska prairie: low whitewashed adobe and wood
    barracks arranged around a parade ground, single flagpole flying
    a 33-star flag, a stable and parade rifle stack visible, broad
    shortgrass plain stretching to the horizon. Late-summer afternoon
    haze. No close-up figures."

33. **Chimney Rock (`chimney-rock.jpg`).** "The unmistakable
    spire of Chimney Rock rising 300 feet above the western Nebraska
    prairie, slim sandstone column on a conical base, sage and
    bunchgrass in foreground, a single covered wagon dwarfed at
    middle distance for scale. Golden hour, warm sky, period-photo
    tonality after William Henry Jackson 1866."

34. **Fort Laramie (`fort-laramie.jpg`).** "1850s Fort Laramie in
    eastern Wyoming: stone and adobe walls of the trading post and
    parade ground, two-story sutler's store, U.S. flag, distant
    wagon train approaching across cottonwood-lined Laramie River
    bottoms. Clear sky, midday, saturated period palette."

35. **South Pass (`south-pass.jpg`).** "The broad gentle saddle of
    South Pass in central Wyoming — the continental divide that
    barely looks like a divide — sweeping high sagebrush plain
    framed by the Wind River Range to the north. A wagon train in
    middle distance pausing at the marker. Early autumn, cold blue
    sky, crisp light, pale yellow grass. A trail fork visible
    diverging to the south."

36. **Fort Bridger (`fort-bridger.jpg`).** "1840s Fort Bridger in
    southwestern Wyoming: small log-walled trading post built by Jim
    Bridger, low cottonwood corral, a forge with a wisp of smoke,
    horses tied at the rail, mountain backdrop with patches of late
    snow. Warm afternoon light, weathered timber tones."

37. **Snake River crossing (`snake-river.jpg`).** "Wide silver-blue
    Snake River cutting through Idaho high desert, dark basalt cliffs
    on the far bank, a covered wagon partially submerged mid-current
    with oxen straining, men with guide-ropes on the near bank. Dust
    haze, hard summer sun, deep contrast."

38. **Blue Mountains (`blue-mountains.jpg`).** "Forested ridges of
    the Blue Mountains in northeast Oregon: dense ponderosa pine and
    Douglas fir on steep slopes, a narrow wagon track switchbacking
    through timber, distant valley shrouded in early autumn haze.
    Cool blue-green palette, late afternoon light."

39. **Fort Walla Walla (`fort-walla-walla.jpg`).** "1840s Fort Walla
    Walla in eastern Washington: Hudson's Bay Company adobe and
    timber compound on the Columbia River bottoms, low palisade,
    bastion at the corner, drying salmon racks visible at distance,
    river glinting beyond. Soft overcast light, muted earthen
    palette."

40. **The Dalles (`the-dalles.jpg`).** "The Dalles of the Columbia
    River, 1850s: violent stretch of basalt rapids and chutes where
    the great river narrows between black rock cliffs, white water
    boiling, a beached wagon awaiting decision on the near shore.
    Dramatic side light, tense composition. Reference: Carleton
    Watkins 1867 plates."

41. **Rafting the Columbia (`raft-columbia.jpg`).** "A makeshift log
    raft loaded with a single dismantled covered wagon and three
    barrels, drifting down the Columbia River below The Dalles, two
    pioneers poling, dark Cascade forest crowding the banks, fog on
    the water, late autumn. Ominous, beautiful, cold gray-green
    palette. No people in close-up."

---

## 3. Audio strategy

### 3.1 Library: **Tone.js + `@tonejs/midi`**

- ~120 KB gzipped Tone.js + 40 KB parser. Bundle stays modest.
- Drives a `Tone.PolySynth` configured per-track (square voice for
  travel; triangle for landmarks; FM banjo-like for hunt).
- Master gain split into music + sfx; music ducks to 0.2 during
  dialogue.
- `setMuted` already exists; extends to cover music and persists to
  `localStorage`.
- AudioContext starts on first user gesture (clicking "Start a new
  game") to satisfy browser autoplay policy.

### 3.2 MIDI track plan

All listed tunes are public domain (composed before 1928). The
`Download URL` column points to a free MIDI source verified during
Phase 11 research; alternates exist on Mutopia, CPDL, and IMSLP if
the primary source is unavailable. After downloading, rename to the
filename shown in `manifest.json` (e.g. `oh-susanna.mid`) and place
under `public/midi/`. Audit each file briefly in a MIDI player before
committing — some sources upload re-arrangements rather than the
canonical melody.

| Track ID | Tune | When | Download URL |
|---|---|---|---|
| `title` | Oh! Susanna (Foster, 1848) | Title screen | https://www.8notes.com/scores/18884.asp?ftype=midi (8notes piano) |
| `travel_a` | Sweet Betsy from Pike (c. 1858) | Trail loop A | https://www.8notes.com/school/midi/guitar/SweetBetsy.mid (direct .mid; 8notes guitar arrangement) — alt song if unsuitable: **The Old Chisholm Trail** at https://www.traditionalmusic.co.uk/song-midis/Old_Chizzum_(Chisholm)_Trail.htm |
| `travel_b` | Buffalo Gals (1844) | Trail loop B | https://www.8notes.com/school/midi/recorder/BuffaloGalsREC.mid (direct .mid; 8notes recorder) — alt: https://freemidi.org/download3-25689-buffalo-gals-4th-of-july — alt song: **Oh My Darling, Clementine** (1884, PD) at https://bitmidi.com/clementine-mid |
| `hunt` | Camptown Races (Foster, 1850) | Hunt minigame | https://imslp.org/wiki/De_Camptown_Races_(Foster,_Stephen) (alt: https://en.wikipedia.org/wiki/File:Camptown_Races.mid) |
| `victory` | Yankee Doodle (c. 1767) | Willamette arrival | https://bitmidi.com/yankee-doodle-mid |
| `dirge` | Shall We Gather at the River (Lowry, 1864) | Tombstone | https://library.timelesstruths.org/music/Shall_We_Gather_at_the_River/midi/ (alt: https://www.mfiles.co.uk/scores/shall-we-gather-at-the-river.htm) |
| `store` | Skip to My Lou (trad.) | Store / bank | https://www.flutetunes.com/tunes/skip-to-my-lou.mid (direct .mid; flutetunes) — alt: https://www.8notes.com/scores/ (search "Skip to My Lou") |
| `landmark` | Red River Valley (trad.) | Landmark BG (ducks for dialogue) | https://bitmidi.com/b-taylor-red-river-valley-mid |
| `dialogue` | (silence + soft pad) | NPC conversations | n/a — synthesized inline |

> Note: MuseScore links require clicking "Download" → "MIDI" and may
> need a free account. BitMidi and 8notes deliver `.mid` directly.
> IMSLP has direct `.mid` attachments under each piece's page. If
> "Wagons Ho!" feels missing, see assumption #5 — Sweet Betsy is the
> PD substitute confirmed 2026-04-28.

### 3.3 SFX (CC0 from Freesound.org)

`gunshot`, `wagon-creak`, `river-splash`, `thunder`, `ox-low`, `coin`,
`death-thud`, `arrival-bell`, `wind-loop`, `firewood-crackle`. ~10
files, ~30 KB each.

---

## 4. Route graph

### 4.1 Nodes & edges (25 nodes, 3 junctions)

```
independence -> kansas-river [102, plains]
kansas-river -> big-blue [83, plains]
big-blue -> fort-kearney [119, plains]
fort-kearney -> chimney-rock [250, plains]
chimney-rock -> fort-laramie [86, plains]
fort-laramie -> register-cliff [42, plains]
register-cliff -> independence-rock [148, plains]
independence-rock -> devils-gate [55, plains]
devils-gate -> south-pass [102, mountains]
south-pass         ** JUNCTION 1 **
  -> green-river [57, mountains]      (Greenwood Cutoff — fast, harder)
  -> fort-bridger [85, mountains]     (Fort Bridger detour — slow, supplies)
green-river -> soda-springs [111, mountains]
fort-bridger -> soda-springs [125, mountains]   (re-merge)
soda-springs -> fort-hall [117, mountains]
fort-hall          ** JUNCTION 2 **  (kept simple per Oregon-only scope)
  -> snake-river [178, river-valley]
snake-river -> salmon-falls [70, desert]
salmon-falls -> three-island [55, desert]
three-island -> fort-boise [75, desert]
fort-boise -> blue-mountains [165, mountains]
blue-mountains -> fort-walla-walla [80, forest]
fort-walla-walla -> the-dalles [130, forest]
the-dalles         ** JUNCTION 3 **
  -> raft-columbia [110, river-valley]    (raft Columbia — fast, dangerous)
  -> barlow-road [100, mountains]         (Barlow Toll Road — slow, $5 toll, safer)
raft-columbia -> fort-vancouver [50, river-valley]
barlow-road -> oregon-city [80, forest]
fort-vancouver -> oregon-city [40, river-valley]
oregon-city -> willamette [25, forest]   (DESTINATION)
```

Total miles via main route ≈ **2030**, deliberately close to the 1985
2040 so existing scoring math stays calibrated.

> Note: Fort Hall is currently a single-edge node — kept simple given
> Oregon-only scope. If we later add the California cutoff, this is
> where it forks.

### 4.2 Decision UX

When `pendingChoice` is non-null, the trail screen redirects to
`routeChoiceScreen.ts`:

```
+--------------------------------------------------+
|              THE TRAIL FORKS HERE                |
|  +--------------------------------------------+  |
|  |       [photo: trail fork landscape]        |  |
|  +--------------------------------------------+  |
|  At South Pass you must choose your route:       |
|                                                  |
|   > Greenwood Cutoff (57 mi, harder, faster)     |
|     "Cuts straight across desert. Risky water."  |
|                                                  |
|     Detour to Fort Bridger (85 mi, safer)        |
|     "Trading post, fresh supplies, longer."      |
+--------------------------------------------------+
```

Selecting clears `pendingChoice`, sets `currentEdgeId`, appends a
journal entry "Chose the Greenwood Cutoff at South Pass."

### 4.3 Save / determinism

- Seed governs RNG (events, illness, weather perturbations).
- Route choices are player input, not RNG — restored from
  `currentNodeId`/`currentEdgeId` in save.
- `localStorage['oregon-trail-save-v1']` auto-saved each step.
- E2E determinism asserts compare
  `(currentNodeId, milesIntoEdge, food, party.health)` rather than
  raw miles.

---

## 5. New systems detail

### 5.1 Banking

- Available at Independence (pre-departure) only for taking a loan.
- Repay at any fort (assumption #2).
- Amounts: $100, $250, $500, $1000.
- Interest: 10% APR, compounded daily (~0.0274%/day).
- Status bar shows "Loan: $X (+$Y interest)".
- On victory: outstanding `(principal + interest) × 2` subtracted
  from final score before profession multiplier.
- On death: irrelevant.

### 5.2 Dialogue (6 starter NPCs)

Authored in `dialogueData.ts` (TS, not JSON, so `visibleIf`
predicates are fully typed). Sample shape:

```ts
export const TRADER_FORT_HALL: DialogueGraph = {
  id: 'trader-fort-hall',
  startNodeId: 'open',
  nodes: {
    open: {
      id: 'open',
      speaker: 'Mr. Grant, Trader',
      text: "Welcome to Fort Hall. What brings you out west?",
      choices: [
        { id: 'q-trail', text: 'Ask about the trail ahead.', next: 'trail' },
        { id: 'q-trade', text: 'Trade 50 lb food for 30 rounds ammo.',
          next: 'open',
          effects: [
            { kind: 'removeItem', item: 'food', qty: 50 },
            { kind: 'addItem', item: 'ammunition', qty: 30 },
            { kind: 'log', text: 'Traded 50 lb of food for 30 rounds.' },
          ],
          visibleIf: (s) => s.inventory.food >= 50,
        },
        { id: 'q-leave', text: 'Leave.', next: undefined },
      ],
    },
    trail: { /* ... */ },
  },
};
```

NPCs:
1. Matt the Storekeeper (Independence) — outfitting tips.
2. Mr. Grant, Trader (Fort Hall) — trail tips, food↔ammo trade.
3. Mountain Man Bridger (Fort Bridger) — branch advice, ox health hint.
4. Pioneer Woman (random trail encounter) — health remedy if anyone sick.
5. Cayuse Hunter (Salmon Falls) — fishing tip giving free 30 lb food once.
6. Methodist Missionary (The Dalles) — branch advice on Barlow vs. raft.

### 5.3 Journal & Guidebook

- `Journal` is in-game (events that happened to *you*); scrollable
  list of `JournalEntry`, newest first. "Diary" button on trail screen.
- `Guidebook` (`src/core/guidebook.ts`) is pre-authored historical
  text per landmark. "Learn About the Trail" mode off the title screen
  uses the same renderer to show an indexed gallery.

### 5.4 Hunting expansion

| Animal | meatLbs | spawnWeight | hpToKill | environments |
|---|---|---|---|---|
| rabbit | 2 | 8 | 1 | plains, forest |
| squirrel | 1 | 9 | 1 | forest |
| goose | 4 | 5 | 1 | river-valley |
| duck | 3 | 5 | 1 | river-valley |
| fox | 6 | 3 | 1 | forest, plains |
| antelope | 60 | 4 | 1 | plains |
| deer | 50 | 5 | 1 | forest, plains |
| elk | 200 | 3 | 2 | mountains, forest |
| bear | 100 | 1 | 3 | forest, mountains |
| buffalo | 350 | 2 | 2 | plains |
| wolf (hostile) | 0 | 1 | 1 | plains, mountains |
| moose | 250 | 1 | 2 | mountains, river-valley |

- Spawn picks 5 from the current edge's environment, weighted.
- Wolves are hostile — damage player if too close.
- Same controls (arrow keys + space). Add 3-second reload between
  shots; `hpToKill` for big animals.
- `HUNT_CARRY_CAP` raised 100 → 200 lbs.
- Background = environment art (plains/forest/mountains).

### 5.5 Tombstone screen

- On party-kill or out-of-oxen: capture epitaph (max 60 chars).
- Persist in `localStorage['oregon-trail-tombstones-v1']`, capped
  at 50 most recent: `{name, epitaph, nodeId, date, seed}`.
- 5%/day chance during travel, when at a node where another player
  died, of "You found a grave: '<epitaph>' — <name>, <date>." Log
  entry only; no gameplay effect.

---

## 6. Phased implementation order

Each phase is PR-shaped: green tests at the end, playable game at
the end of phase 2 onward.

| Phase | Goal | Days |
|---|---|---|
| **0. Inventory & cleanup** | `pnpm install tone @tonejs/midi`. Existing tests stay green. | 1 |
| **1. Route graph foundation** | `route.ts`, types, refactor `travel.ts`/`landmarks.ts` to graph form on existing 17 nodes. `landmarkIndex` removed. All affected unit tests rewritten. | 2–3 |
| **2. +8 nodes, +3 junctions, route-choice screen** | Deluxe topology in place. New `routeChoiceScreen.ts`. New unit + E2E for branching. | 2–3 |
| **3. Asset pipeline + photo frame** | `assets.ts`, `photoFrame.ts`, manifest, preload progress on title. ASCII fallback when missing. | 1–2 |
| **4. Audio engine: MIDI + SFX** | `midi.ts`, `sfx.ts`, `sound.ts` becomes shim. All 9 tracks + 10 SFX wired. Mute persists. | 2 |
| **5. Banking** | `banking.ts`, `bankScreen.ts`, scoring penalty. | 1 |
| **6. Dialogue + 6 NPCs** | `dialogue.ts`, `dialogueData.ts`, `dialogueScreen.ts`. "Talk to people" plumbed at landmarks. | 2 |
| **7. Expanded events (41) + environment weighting** | `eventsExpanded.ts`, `environment.ts`. +20 new events. | 1–2 |
| **8. Hunting expansion** | `animals.ts`, env-aware `huntScene.ts`. 12 animals, 3 env backgrounds. | 2 |
| **9. Journal + Guidebook + Tombstone** | All three side-screens shipped. Diary on trail menu, Learn About the Trail on title, epitaph on death. | 2 |
| **10. Polish + content fill + bundle audit** | All photos in, MIDI in, SFX in. Bundle <5 MB assets / <300 KB JS gzipped. Manual full-Deluxe parity playthrough + E2E. | 2 |

**Total: ~17–20 working days.**

---

## 7. Testing strategy

### Survives mostly intact
`rng.test.ts`, `calendar.test.ts`, `illness.test.ts`,
`store.test.ts` (small fort-multiplier addition), `trading.test.ts`,
`scoring.test.ts` (+ loan-penalty cases).

### Rewritten
- `landmarks.test.ts` → `route.test.ts`: 25 nodes, 3 junctions, no
  cycles, destination reachable from every branch combo, mileage
  ≈2030.
- `travel.test.ts`: `currentNodeId` + `pendingChoice` semantics.
- `engine.test.ts`: determinism asserts on tuple
  `(currentNodeId, milesIntoEdge, party.health)`.
- `events.test.ts` → `eventsExpanded.test.ts`: 41 events, env
  weighting (statistical with seeded RNG).
- `hunting.test.ts`: 12 animals, env filter.

### New
`route.test.ts`, `banking.test.ts`, `dialogue.test.ts`,
`journal.test.ts`, `tombstone.test.ts`, `assets.test.ts`,
`midi.test.ts` (Tone mocked), `save.test.ts`, `eventsExpanded.test.ts`,
`animals.test.ts`, `environment.test.ts`.

### E2E
- `happy-path.spec.ts` — adapted to assert on status-bar testid.
- `branching.spec.ts` — three full playthroughs (Greenwood+raft,
  Bridger+raft, Bridger+Barlow) under one seed each.
- `banking.spec.ts` — take a loan; victory shows score penalty.
- `dialogue.spec.ts` — Fort Hall food↔ammo trade; assert inventory
  delta.
- `journal.spec.ts` — assert N entries mid-trail.
- `tombstone.spec.ts` — kill party (low-supply seed), write epitaph,
  reload, see tombstone preserved on a new run at same node.

### Coverage gate
Stays at 95% for `src/core/*.ts`. Exclude only the pure-data files
(`dialogueData.ts`, `guidebook.ts`) where there's nothing to test
beyond schema. Each new core module ships with tests in same PR.

---

## 8. Risks & open questions

### Risks
- **Bundle size:** ~200 KB JS + ~2.5 MB assets. Acceptable for
  desktop; if mobile matters, lazy-load env art per edge.
- **Image decode time:** preloading 25 PNGs serially = ~3 s on first
  load. Mitigate with `Promise.all` + `Image.decode()`. Show progress
  bar.
- **MIDI scheduling on slow CPUs:** keep voicing simple (≤4-voice
  polyphony, no mass arpeggios).
- **Heap growth:** cap journal at 200 rolling entries, log at 50.
- **AudioContext autoplay policy:** init Tone on first user click.

### Open questions worth flagging at review time
1. California cutoff at Fort Hall — currently excluded.
2. Bank repayment — any fort vs. Independence-only.
3. Tombstone Easter egg — default ON. OK?
4. Save/resume button on title — default ON. OK?
5. Final landmark count — 25; trim to 21 if you want exact 1992
   parity (drop Register Cliff, Devil's Gate, Three Island, Salmon
   Falls, Fort Vancouver).
6. MIDI library — Tone synth voices vs. SF2 samples (heavier).

---

## 9. Critical files (priority order)

The keystone files — review these first:

1. `src/core/route.ts` (new) — graph data model & traversal API.
2. `src/core/landmarks.ts` (rewritten) — 25-node `RouteGraph` builder.
3. `src/core/types.ts` (heavy additions) — underpins everything else.
4. `src/core/state.ts` (heavy additions) — new state fields, migration glue.
5. `src/core/travel.ts` (rewritten) — daily movement against graph.
6. `src/ui/screens.ts` → `src/ui/screens/` (split) — unblocks parallel work.
7. `src/ui/midi.ts` (new) — Tone.js wrapper.
8. `src/ui/assets.ts` (new) — preload + cache.
9. `src/core/dialogue.ts` + `dialogueData.ts` (new) — conversation engine + 6 NPCs.
10. `src/core/banking.ts` (new) — loans + scoring penalty.

Also touched: `eventsExpanded.ts`, `animals.ts`, `journal.ts`,
`guidebook.ts`, `tombstone.ts`, `save.ts`, `environment.ts`,
`photoFrame.ts`, `sfx.ts`, `dialogueScreen.ts`, `routeChoiceScreen.ts`,
`journalScreen.ts`, `guidebookScreen.ts`, `tombstoneScreen.ts`,
`bankScreen.ts`, `huntScene.ts`, `index.html`, `styles.css`,
`package.json`, `vitest.config.ts`, `playwright.config.ts`.

---

## 10. Verification

After each phase merges, run end-to-end:

```bash
cd /Users/jakemalarz/cc-dmz/oregon-trail
npm install
npm test                  # vitest, must hit 95% gate
npm run test:e2e          # playwright
npm run dev               # manual sanity at http://localhost:5173
npm run build             # tsc + vite; checks bundle size
```

Phase 10 (final) acceptance:
- Manual full Deluxe playthrough — banker profession, take a $500
  loan, choose Bridger detour at South Pass, choose Barlow Toll Road
  at The Dalles, arrive Willamette, score reflects loan penalty.
- E2E: all branching, dialogue, banking, journal, tombstone specs
  green.
- Bundle: total assets <5 MB, JS gzipped <300 KB.
- Lighthouse: "OK" on cold load (<5 s first-paint on broadband).
- Manual sanity on the audio: title plays "Oh! Susanna", trail loops
  travel music, hunt plays "Camptown Races", death plays dirge,
  mute persists across reload.
