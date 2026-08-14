# BlueprintBook – Shapez Industries Blueprint Cost Compatibility

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. `superpowers:test-driven-development` is mandatory — write the failing test before the implementation in every task below.

**Goal:** Blueprint cost renders correctly whether `Blueprint.getCost()` returns vanilla's single number or `shapez-industries`' three-element array. No visual or behavioural change in a vanilla install.

**Architecture:** Introduce a normalization boundary in `src/preview.js`. `getBlueprintCost()` stops returning the raw engine value and instead returns a canonical `Array<{shapeKey: string|null, amount: number}>` (or `null` when cost is undeterminable). `renderBlueprintCostElement()` renders one `.requirement` row per entry. Both call sites switch from a `!== null` guard to a length guard. Nothing outside `src/preview.js` learns that Industries exists.

**Tech Stack:** JavaScript (ESM), esbuild bundle, Vitest + jsdom, existing `shapez` global.

**Baseline:** all line references below are against `c5c4f9a` with a clean working tree. Verify with `git status` before starting; if the tree is dirty, re-derive the line numbers rather than trusting them.

---

## Background — verified root cause

`shapez-industries@1.1.6` extends `Blueprint` and replaces `getCost()`:

```js
getCost() {
    let A = [0, 0, 0];
    for (...) { S.includes(buildingId) ? A[0] += 10 : A[1] += 10 }
    return A;
}
```

Vanilla returns a single number (`shapez_source/src/js/game/blueprint.js:64`). Blueprint Book passes the raw value straight through:

| Location | Problem |
|---|---|
| `src/preview.js:34` | returns `bp.getCost()` verbatim — an array under Industries |
| `src/preview.js:306` | guard is `cost === null \|\| cost === undefined`; an array passes |
| `src/preview.js:333` | `` `${cost}` `` stringifies the array → renders **`30,20,0`** |
| `src/ui.js:747` | same guard, so every library card shows the mangled string |

Display corruption only — no crash. `getLockedEntitiesInBlueprint` and equip are unaffected.

**Constraints discovered while tracing the Industries bundle:**

- Its three cost shape keys are a **module-private const**. The only public accessor is `gameMode.getBlueprintShapeKey()`, which returns *just the first of the three*. Keys 2 and 3 must be mirrored in our source or left unresolved.
- `getCost()` only ever increments indices 0 and 1 — **index 2 is always 0** in 1.1.6, despite the array being length 3 and Industries' own HUD rendering three slots. Do not hardcode "two entries"; filter by value.
- Mod id for detection is `"shapez-industries"`.

**Decision recorded:** this plan mirrors all three shape keys so each cost row gets its correct icon, with graceful degradation (an unresolvable key renders an amount-only row, no crash). The alternative — render every row with the single key from `getBlueprintShapeKey()` — is more future-proof but shows two visually identical icons with different amounts. To switch to it, truncate `INDUSTRIES_COST_SHAPE_KEYS` to its first element; no other change is needed. Flag to the user if Industries ships new cost shapes.

---

## Global Constraints

- Normalization lives **only** in `src/preview.js`. Do not add Industries awareness to `src/ui.js`, `src/store.js`, or `src/styles.js` beyond the multi-row CSS in Task 4.
- Preserve current vanilla behaviour exactly, including the free-copy-paste case, which today returns `0` and renders an icon with the text `0`. It must keep rendering `0`, not disappear.
- `null` remains the "cannot determine cost" signal. Unrecognized return shapes normalize to `null`, never pass through.
- Never guard a normalized cost with `!== null` alone — arrays pass a null check. Use `cost && cost.length`.
- 100% Vitest pass required (`npx vitest run --reporter=dot`) before commit.
- Commit after each task.

**Non-goals — do not fix these here, even though you will see them:**

- The `_cardCache` in `src/ui.js:729` does not key on game-mode state, so a mid-session free-copy-paste toggle serves stale costs. Pre-existing.
- `getLockedEntitiesInBlueprint` is **duplicated** at `src/ui.js:29` and `src/preview.js:488` with different signatures (`(root, entities)` vs `(root, blueprintInput)`). Consolidating it is real work but belongs in its own plan — an unplanned attempt at it was reverted on 2026-08-11 and sits in `git stash` as `stash@{0}`. Leave both copies alone.
- The flip.js `mirrored` data-loss issue (blueprint strings drop mirroring in BP-string pack mode). Separate plan.

---

## Task 1: Generalize mod lookup and resolve cost shape keys

**Files:** Modify `src/preview.js`, `tests/preview.test.js`

**Interfaces:**
- Produces: `findModById(id)`, `resolveCostShapeKeys(root)` (module-private unless a test needs them exported).
- Consumes: `shapez.BlueprintLibraryModLoader.mods`, `root.gameMode.getBlueprintShapeKey()`.

### Step 1.1: Write failing tests

- [ ] Test: `resolveCostShapeKeys` returns a single-element array containing `gameMode.getBlueprintShapeKey()` when no Industries mod is loaded.
- [ ] Test: falls back to `"CuCuCuCu"` when `getBlueprintShapeKey` is absent or throws.
- [ ] Test: returns all three Industries keys when a mod with `metadata.id === "shapez-industries"` is in the loader list.
- [ ] Test: returns the single-element array when `shapez.BlueprintLibraryModLoader` is undefined (no crash).

### Step 1.2: Implement

- [ ] Extract the loader-list lookup out of `resolveBpStringMod` (`src/preview.js:1`) into `findModById(id)`; have `resolveBpStringMod` delegate to it. Its only caller is `src/preview.js:11`, but it is an exported symbol — keep the signature unchanged rather than inlining it away.
- [ ] Add the constants near the top of the file:

```javascript
const INDUSTRIES_MOD_ID = "shapez-industries";
// Cost shape keys for shapez-industries, in getCost() index order. Only index 0 is
// reachable at runtime (gameMode.getBlueprintShapeKey()); 1 and 2 are module-private
// in that mod's bundle, so they are mirrored here. An unresolvable key renders as an
// amount-only row rather than failing.
const INDUSTRIES_COST_SHAPE_KEYS = [
    "Sb----Sb:CbCbCbCb:--CwCw--",
    "Sb----Sb:3b3b3b3b:--3w3w--",
    "SbSbSbSb:1b1b1b1b:--CwCw--",
];
```

- [ ] Implement `resolveCostShapeKeys(root)`: return `INDUSTRIES_COST_SHAPE_KEYS` when `findModById(INDUSTRIES_MOD_ID)` is truthy, otherwise `[<getBlueprintShapeKey() or "CuCuCuCu">]`. Wrap the `getBlueprintShapeKey()` call in try/catch — it is a patched method under Industries.

---

## Task 2: Normalize `getBlueprintCost` return shape

**Files:** Modify `src/preview.js`, `tests/preview.test.js`

**Interfaces:**
- Produces: `getBlueprintCost(root, blueprintInput) → Array<{shapeKey: string|null, amount: number}> | null`.
- Consumes: `resolveCostShapeKeys`, `deserializeBlueprintEntities`, `shapez.Blueprint`.

### Step 2.1: Write failing tests

- [ ] Test: numeric `getCost()` → `[{ shapeKey: <blueprint shape key>, amount: <n> }]`.
- [ ] Test: array `getCost()` returning `[30, 20, 0]` → two entries with amounts `30` and `20`, carrying Industries keys index 0 and 1. The zero entry is dropped.
- [ ] Test: array `[0, 0, 0]` (empty blueprint) → single entry, amount `0`, so a zero still renders.
- [ ] Test: free copy/paste → single entry, amount `0` (parity with today's `return 0`).
- [ ] Test: `getCost()` throws → `null`.
- [ ] Test: entities fail to deserialize → `null`.
- [ ] Test: `getCost()` returns a non-numeric, non-array value (e.g. an object or `NaN`) → `null`.
- [ ] Test: array longer than the known key list → surplus entries get `shapeKey: null`, not an out-of-bounds crash.

### Step 2.2: Implement

- [ ] Add module-private `normalizeBlueprintCost(root, raw)`:
  - finite number → `[{ shapeKey: resolveCostShapeKeys(root)[0], amount: raw }]`
  - array → map each index to `{ shapeKey: keys[i] ?? null, amount }`, keeping only finite non-zero amounts; if nothing survives, return a single `amount: 0` entry using `keys[0]`
  - anything else → `null`
- [ ] Rewrite `getBlueprintCost` (`src/preview.js:25`) to run its existing free-copy-paste and deserialize guards, call `getCost()` inside the existing try/catch, then return `normalizeBlueprintCost(...)`. Free copy/paste returns the single zero entry rather than `0`.
- [ ] Update the JSDoc `@returns` on both `getBlueprintCost` and `renderBlueprintCostElement`.

---

## Task 3: Render one requirement row per cost entry

**Files:** Modify `src/preview.js`, `tests/preview.test.js`

**Interfaces:**
- Produces: `renderBlueprintCostElement(root, costEntries, iconSize = 30) → HTMLElement`.

### Step 3.1: Write failing tests

- [ ] Test: two entries → container has two `.requirement` children, with amounts in order.
- [ ] Test: each entry with a resolvable key renders a `.shape` child containing the canvas from `generateAsCanvas`.
- [ ] Test: entry with `shapeKey: null` renders `.amount` but **no** `.shape` child.
- [ ] Test: entry whose key fails `getShapeFromShortKey` renders amount-only, no throw.
- [ ] Test: `null`, `undefined`, and `[]` all return an empty `.requirements` container.

### Step 3.2: Implement

- [ ] Replace the single-requirement body of `renderBlueprintCostElement` (`src/preview.js:302`) with a loop over the entries array.
- [ ] Change the early return guard from `cost === null || cost === undefined` to `!Array.isArray(costEntries) || costEntries.length === 0`.
- [ ] Keep the existing try/catch around shape-canvas generation; on failure or a `null` key, append the `.amount` div without a `.shape` div.

---

## Task 4: Update call sites and multi-row CSS

**Files:** Modify `src/preview.js`, `src/ui.js`, `src/styles.js`, `tests/preview.test.js`, `tests/ui.test.js`

### Step 4.1: Call sites

- [ ] `src/ui.js:747` — change `if (cost !== null && cost !== undefined)` to `if (cost && cost.length)`.
- [ ] `src/preview.js:420` — change `if (costSlot && cost !== null)` to `if (costSlot && cost && cost.length)`.
- [ ] Confirm the `_cardCache` entry at `src/ui.js:738` still stores the normalized array unchanged. No cache-key change.

### Step 4.2: CSS

- [ ] `src/styles.js:347` — `.bplib-preview-cost-slot .requirements` and the card `.requirements` now hold up to three rows. Add horizontal spacing between sibling `.requirement` elements. Per project rules, use `calc(PX * var(--ui-scale))` and `content-box` sizing.
- [ ] Verify a two-row cost does not change library card height in the detailed view, and does not overflow the preview dialog's bottom button row (`src/preview.js:416` moves stats into `.buttons`).

### Step 4.3: Regression tests

- [ ] Test: a vanilla-numeric cost still renders exactly one `.requirement` with the same amount text as before this change.
- [ ] Test: `_createBlueprintCard` in `tests/ui.test.js` appends a cost element for an array cost and skips it for `null`.
- [ ] The two existing `_createBlueprintCard` cache tests (`tests/ui.test.js:907` and `:925`) assert on cached `cost`. Confirm they still pass with an array-valued cost, and update their fixtures only if the assertion is on the cost's *type*, not its caching behaviour.

---

## Task 5: Verification and handoff

- [ ] Run `npx vitest run --reporter=dot` — 100% pass.
- [ ] Run `npx eslint .` — clean.
- [ ] Self-review the diff per `superpowers:subagent-driven-development`. Specifically confirm no defensive guard was added around a load-time-guaranteed condition (project rule), and that `shapez.Blueprint` is still constructed exactly once per cost lookup.
- [ ] **Real-runtime verification is required — mocked tests are not sufficient** (project rule). Load the mod in-game from `AppData/Roaming/shapez.io/Test/` alongside `shapez-industries@1.1.6.js` and confirm: card cost rows, preview dialog cost rows, correct icons per row, and that a vanilla profile with Industries disabled is visually unchanged.
- [ ] Changelog entry in `src/changelog.js` — leave to the user to write by hand (project rule: no AI-drafted changelog prose). The existing "Blueprint Cost" entry at `src/changelog.js:23` is the precedent for placement.
