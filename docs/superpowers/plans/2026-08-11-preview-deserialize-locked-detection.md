# Preview Deserialize Locked-Detection Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `src/preview.js`'s `deserializeBlueprintEntities` from swallowing a
locked/unresearched-content deserialize failure into an indistinguishable `null`,
so library cards and the preview dialog stop lying about locked blueprints as
empty/costless/unlocked.

**Architecture:** `deserializeBlueprintEntities` returns a structured
`{ entities: Array|null, failedDueToUnlock: boolean }` instead of a bare
`Array|null`. `failedDueToUnlock` is `true` for any exception caught from the
`bp-string` mod's `deserialize` call — no message-pattern matching. The two UI
entry points (`_createBlueprintCard` in `ui.js`, `openBlueprintPreviewDialog` in
`preview.js`) consume the flag directly to render "unknown"/"?" placeholder text.
`getLockedEntitiesInBlueprint` is consolidated to a single copy in `preview.js`
(the `ui.js` duplicate is deleted), gains a sentinel-locked entry for the
`failedDueToUnlock` case so existing `.length > 0` checks keep working, plus a
verified `shapez.gBuildingVariants` fallback and a fail-open per-entity error
policy.

**Tech Stack:** Vanilla JS (ES modules), Vitest + jsdom for tests, esbuild for
bundling. No new dependencies.

## Global Constraints

- Never call `e.stopPropagation()` inside custom UI components (project-wide
  rule; not touched by this plan, but do not introduce it while editing
  `ui.js`/`preview.js`).
- Classification of a caught deserialize exception must NOT use message-pattern
  matching — any exception means `failedDueToUnlock: true`, full stop.
- Per-entity unlock/variant inspection errors are fail-open (entity treated as
  unlocked), matching the approved design.
- `equipBlueprint` (`ui.js:565-610`) — its own inline try/catch around
  `bpMod.constructor.deserialize` is NOT touched by this plan. Its downstream
  call to `getLockedEntitiesInBlueprint` (`ui.js:606`) legitimately changes
  behavior as a side effect of the Task 3 consolidation — that's in scope.
- Run `npx vitest run --reporter=dot` (not the default reporter) for all test
  runs in this plan, per this project's tool-call-efficiency rule against log
  dumps.
- Full design rationale, including the `shapez_source/` verification of
  `shapez.gBuildingVariants`, lives in
  [`../specs/2026-08-11-preview-deserialize-locked-detection-design.md`](../specs/2026-08-11-preview-deserialize-locked-detection-design.md) —
  consult it for the "why" behind any task below.

---

### Task 1: `deserializeBlueprintEntities` structured return shape

**Files:**
- Modify: `src/preview.js:51-61`
- Test: `tests/preview.test.js`

**Interfaces:**
- Produces: `deserializeBlueprintEntities(root, blueprintInput): { entities: Array|null, failedDueToUnlock: boolean }`. Every later task that calls this function depends on this exact shape — no bare `Array|null` return survives anywhere in the codebase after this task.

- [ ] **Step 1: Add `deserializeBlueprintEntities` to the test file's import list**

In `tests/preview.test.js`, change the import block at the top from:

```javascript
import {
    getBlueprintEntityCount,
    getBlueprintCost,
    getLockedEntitiesInBlueprint,
    InteractiveBlueprintViewer,
    openBlueprintPreviewDialog,
    renderBlueprintCostElement,
    resolveCostShapeKeys,
    findModById
} from '../src/preview.js';
```

to:

```javascript
import {
    deserializeBlueprintEntities,
    getBlueprintEntityCount,
    getBlueprintCost,
    getLockedEntitiesInBlueprint,
    InteractiveBlueprintViewer,
    openBlueprintPreviewDialog,
    renderBlueprintCostElement,
    resolveCostShapeKeys,
    findModById
} from '../src/preview.js';
```

- [ ] **Step 2: Write the failing tests**

Add this new `describe` block in `tests/preview.test.js`, immediately after the
`describe('openBlueprintPreviewDialog - recenter tracking', ...)` block (after
line 565, before `describe('renderBlueprintCostElement', ...)`):

```javascript
    describe('deserializeBlueprintEntities', () => {
        it('returns {entities: null, failedDueToUnlock: false} for null or undefined input', () => {
            expect(deserializeBlueprintEntities(mockRoot, null)).toEqual({ entities: null, failedDueToUnlock: false });
            expect(deserializeBlueprintEntities(mockRoot, undefined)).toEqual({ entities: null, failedDueToUnlock: false });
        });

        it('returns the array unchanged with failedDueToUnlock false when given an already-deserialized array', () => {
            const result = deserializeBlueprintEntities(mockRoot, mockEntities);
            expect(result).toEqual({ entities: mockEntities, failedDueToUnlock: false });
        });

        it('returns {entities: null, failedDueToUnlock: false} when the bp-string mod is not loaded', () => {
            global.shapez.BlueprintLibraryModLoader = { mods: [] };
            const result = deserializeBlueprintEntities(mockRoot, 'BP_STRING');
            expect(result).toEqual({ entities: null, failedDueToUnlock: false });
        });

        it('returns the deserialized entities with failedDueToUnlock false on success', () => {
            const result = deserializeBlueprintEntities(mockRoot, 'VALID_BP_STRING');
            expect(result).toEqual({ entities: mockEntities, failedDueToUnlock: false });
        });

        it('returns {entities: null, failedDueToUnlock: false} when deserialize itself returns a falsy value', () => {
            mockBpMod.constructor.deserialize.mockReturnValueOnce(null);
            const result = deserializeBlueprintEntities(mockRoot, 'EMPTY_RESULT_BP_STRING');
            expect(result).toEqual({ entities: null, failedDueToUnlock: false });
        });

        it('returns {entities: null, failedDueToUnlock: true} when deserialize throws, without leaking the exception', () => {
            mockBpMod.constructor.deserialize.mockImplementationOnce(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            let result;
            expect(() => { result = deserializeBlueprintEntities(mockRoot, 'RESEARCH_GATED_BP_STRING'); }).not.toThrow();
            expect(result).toEqual({ entities: null, failedDueToUnlock: true });
        });
    });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/preview.test.js --reporter=dot`
Expected: FAIL — `deserializeBlueprintEntities` is not exported/defined as an
import (or the existing implementation returns a bare array/null, not the
structured object), so the new assertions fail.

- [ ] **Step 4: Implement the structured return shape**

In `src/preview.js`, replace the existing `deserializeBlueprintEntities`
(lines 51-61):

```javascript
export function deserializeBlueprintEntities(root, blueprintInput) {
    if (!blueprintInput) return null;
    if (Array.isArray(blueprintInput)) return blueprintInput;
    const bpMod = resolveBpStringMod(root);
    if (!bpMod) return null;
    try {
        return bpMod.constructor.deserialize(root, blueprintInput) || null;
    } catch {
        return null;
    }
}
```

with:

```javascript
export function deserializeBlueprintEntities(root, blueprintInput) {
    if (!blueprintInput) return { entities: null, failedDueToUnlock: false };
    if (Array.isArray(blueprintInput)) return { entities: blueprintInput, failedDueToUnlock: false };
    const bpMod = resolveBpStringMod(root);
    if (!bpMod) return { entities: null, failedDueToUnlock: false };
    try {
        const entities = bpMod.constructor.deserialize(root, blueprintInput) || null;
        return { entities, failedDueToUnlock: false };
    } catch {
        // Any exception here means the string parsed to content the game can't
        // currently construct (e.g. an unresearched shapez-industries variant) —
        // or, less commonly, the string is corrupt. We can't robustly tell those
        // apart without coupling to a specific mod's error wording, so both are
        // surfaced identically as "may be locked," not silently as "no entities."
        return { entities: null, failedDueToUnlock: true };
    }
}
```

This is the ONLY change in this step. Do not touch any caller yet — they are
fixed in later tasks and will be visibly broken (wrong shape) until then. That
breakage is expected and addressed in Task 2.

- [ ] **Step 5: Run the new tests to verify they pass**

Run: `npx vitest run tests/preview.test.js -t "deserializeBlueprintEntities" --reporter=dot`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/preview.js tests/preview.test.js
git commit -m "preview: return structured {entities, failedDueToUnlock} from deserializeBlueprintEntities"
```

---

### Task 2: Update internal consumers of the new shape

**Files:**
- Modify: `src/preview.js:63-66` (`getBlueprintEntityCount`), `src/preview.js:105-119` (`getBlueprintCost`), `src/preview.js:161-189` (`InteractiveBlueprintViewer.initEntities`)
- Test: `tests/preview.test.js`

**Interfaces:**
- Consumes: `deserializeBlueprintEntities(root, blueprintInput): { entities, failedDueToUnlock }` from Task 1.
- Produces: `getBlueprintEntityCount(root, blueprintInput): number` (unchanged external type), `getBlueprintCost(root, blueprintInput): Array<{shapeKey, amount}>|null` (unchanged external type). Task 4 and Task 5 call both of these expecting these exact unchanged signatures.

Every existing test in `tests/preview.test.js` for `getBlueprintCost` (lines
726-828) currently fails at this point, because Task 1 changed
`deserializeBlueprintEntities`'s return shape but these functions still treat
it as a bare array. This task fixes that.

- [ ] **Step 1: Run the full preview test suite to confirm the expected breakage**

Run: `npx vitest run tests/preview.test.js --reporter=dot`
Expected: FAIL — multiple failures in the `getBlueprintCost` describe block
(e.g. `Cannot read properties of undefined (reading 'length')` or similar),
because `entities` is now the `{entities, failedDueToUnlock}` object itself,
not an array.

- [ ] **Step 2: Add new throw-case tests (still failing) alongside the existing ones**

In `tests/preview.test.js`, inside `describe('getBlueprintCost', ...)` (ends
at line 828), add this test right before the closing `});` of that describe
block:

```javascript
        it('returns null when deserialize throws due to locked/unresearched content', () => {
            mockBpMod.constructor.deserialize.mockImplementationOnce(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            const result = getBlueprintCost(mockRoot, 'RESEARCH_GATED_BP_STRING');
            expect(result).toBeNull();
        });
```

Then add a new `describe('getBlueprintEntityCount', ...)` block right after
the `getBlueprintCost` describe block closes (this function currently has zero
direct test coverage):

```javascript
    describe('getBlueprintEntityCount', () => {
        it('returns the entity count on successful deserialize', () => {
            const result = getBlueprintEntityCount(mockRoot, 'VALID_BP_STRING');
            expect(result).toBe(mockEntities.length);
        });

        it('returns 0 when entities fail to deserialize', () => {
            mockBpMod.constructor.deserialize.mockReturnValueOnce(null);
            const result = getBlueprintEntityCount(mockRoot, 'INVALID_BP_STRING');
            expect(result).toBe(0);
        });

        it('returns 0 when deserialize throws due to locked/unresearched content', () => {
            mockBpMod.constructor.deserialize.mockImplementationOnce(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            const result = getBlueprintEntityCount(mockRoot, 'RESEARCH_GATED_BP_STRING');
            expect(result).toBe(0);
        });
    });
```

- [ ] **Step 3: Run tests to verify the new ones fail too**

Run: `npx vitest run tests/preview.test.js -t "getBlueprintCost|getBlueprintEntityCount" --reporter=dot`
Expected: FAIL (new tests fail alongside the now-broken existing ones)

- [ ] **Step 4: Fix `getBlueprintEntityCount`**

In `src/preview.js`, replace (lines 63-66):

```javascript
export function getBlueprintEntityCount(root, blueprintInput) {
    const entities = deserializeBlueprintEntities(root, blueprintInput);
    return entities ? entities.length : 0;
}
```

with:

```javascript
export function getBlueprintEntityCount(root, blueprintInput) {
    const { entities } = deserializeBlueprintEntities(root, blueprintInput);
    return entities ? entities.length : 0;
}
```

- [ ] **Step 5: Fix `getBlueprintCost`**

In `src/preview.js`, replace (lines 105-119):

```javascript
export function getBlueprintCost(root, blueprintInput) {
    if (!root) return null;
    if (root.gameMode && typeof root.gameMode.getHasFreeCopyPaste === "function" && root.gameMode.getHasFreeCopyPaste()) {
        return normalizeBlueprintCost(root, 0);
    }
    const entities = deserializeBlueprintEntities(root, blueprintInput);
    if (!entities) return null;
    try {
        const bp = new shapez.Blueprint(entities);
        const raw = typeof bp.getCost === "function" ? bp.getCost() : null;
        return normalizeBlueprintCost(root, raw);
    } catch {
        return null;
    }
}
```

with:

```javascript
export function getBlueprintCost(root, blueprintInput) {
    if (!root) return null;
    if (root.gameMode && typeof root.gameMode.getHasFreeCopyPaste === "function" && root.gameMode.getHasFreeCopyPaste()) {
        return normalizeBlueprintCost(root, 0);
    }
    const { entities } = deserializeBlueprintEntities(root, blueprintInput);
    if (!entities) return null;
    try {
        const bp = new shapez.Blueprint(entities);
        const raw = typeof bp.getCost === "function" ? bp.getCost() : null;
        return normalizeBlueprintCost(root, raw);
    } catch {
        return null;
    }
}
```

- [ ] **Step 6: Fix `InteractiveBlueprintViewer.initEntities`**

In `src/preview.js`, inside `initEntities()` (around line 164), replace:

```javascript
            this.entities = deserializeBlueprintEntities(this.root, this.blueprintInput) || [];
```

with:

```javascript
            this.entities = deserializeBlueprintEntities(this.root, this.blueprintInput).entities || [];
```

- [ ] **Step 7: Run the full preview test suite to verify everything passes**

Run: `npx vitest run tests/preview.test.js --reporter=dot`
Expected: PASS (all tests, including every pre-existing test in the file —
this confirms the shape change didn't regress any consumer)

- [ ] **Step 8: Commit**

```bash
git add src/preview.js tests/preview.test.js
git commit -m "preview: consume structured deserialize shape in cost/count/viewer"
```

---

### Task 3: Consolidate `getLockedEntitiesInBlueprint`

**Files:**
- Modify: `src/preview.js:567-604` (rewrite), `src/ui.js:6` (import), `src/ui.js:29-49` (delete duplicate), `src/ui.js:606` (call site, no code change — behavior changes as a side effect of the import swap), `src/ui.js:761` (call site — needs the `|| bp?.value` fallback described below)
- Test: `tests/preview.test.js`, `tests/ui.test.js`

**Interfaces:**
- Consumes: `deserializeBlueprintEntities` from Task 1/2.
- Produces: `getLockedEntitiesInBlueprint(root, blueprintInput): Array` — same external return type as before (an array of locked entities, `.length` gates equip-disable/warning logic everywhere), but now returns a single sentinel entry `{ __unresolvable: true }` when the underlying deserialize failed due to lock/unresearched content, instead of `[]`. Task 4 relies on this sentinel behavior indirectly (it disables the equip button via this function's `.length`).

`ui.js`'s duplicate `getLockedEntitiesInBlueprint` (lines 29-49) checks
`root.hubGoals.isBuildingUnlocked(meta)` — a check `preview.js`'s version does
NOT have (it only checks `metaBuilding.getIsUnlocked(root)`). Three existing
tests in `tests/ui.test.js` mock entities WITHOUT a `getIsUnlocked` method and
instead mock `mockRoot.hubGoals.isBuildingUnlocked`. Deleting the duplicate and
switching `ui.js` to import `preview.js`'s version breaks those three tests
unless they're updated to mock `getIsUnlocked` on the entity's `metaBuilding`
instead — this step is included below, it is not optional.

- [ ] **Step 1: Write the failing tests for the sentinel, `gBuildingVariants` fallback, and fail-open cases**

In `tests/preview.test.js`, inside `describe('getLockedEntitiesInBlueprint', ...)`
(currently ends at line 319), add these tests right before the closing `});`:

```javascript
        it('returns a non-empty sentinel result when deserialize fails due to locked/unresearched content', () => {
            mockBpMod.constructor.deserialize.mockImplementationOnce(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            const locked = getLockedEntitiesInBlueprint(mockRoot, 'RESEARCH_GATED_BP_STRING');
            expect(locked.length).toBeGreaterThan(0);
        });

        it('treats a variant filtered from getAvailableVariants as unlocked when its building code is registered in shapez.gBuildingVariants', () => {
            global.shapez.gBuildingVariants = {
                123: { variant: 'mirrored' }
            };

            const toolbarHiddenEntity = {
                components: {
                    StaticMapEntity: {
                        code: 123,
                        getVariant: () => 'mirrored',
                        getMetaBuilding: () => ({
                            getIsUnlocked: vi.fn().mockReturnValue(true),
                            // Some other mod (e.g. a toolbar mod) filtered 'mirrored' out of
                            // getAvailableVariants without actually locking it:
                            getAvailableVariants: vi.fn().mockReturnValue(['default'])
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([toolbarHiddenEntity]);

            const locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING');
            expect(locked).toEqual([]);

            delete global.shapez.gBuildingVariants;
        });

        it('still treats a filtered variant as locked when its code is not in shapez.gBuildingVariants', () => {
            global.shapez.gBuildingVariants = {};

            const filteredEntity = {
                components: {
                    StaticMapEntity: {
                        code: 999,
                        getVariant: () => 'mirrored',
                        getMetaBuilding: () => ({
                            getIsUnlocked: vi.fn().mockReturnValue(true),
                            getAvailableVariants: vi.fn().mockReturnValue(['default'])
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([filteredEntity]);

            const locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING');
            expect(locked).toHaveLength(1);

            delete global.shapez.gBuildingVariants;
        });

        it('fails open (treats as unlocked) and logs a warning when getIsUnlocked throws', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const throwingEntity = {
                components: {
                    StaticMapEntity: {
                        code: 1,
                        getVariant: () => 'default',
                        getMetaBuilding: () => ({
                            getIsUnlocked: () => { throw new Error('Mod unlock check error'); },
                            getAvailableVariants: () => ['default']
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([throwingEntity]);

            let locked;
            expect(() => { locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING'); }).not.toThrow();
            expect(locked).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith(
                '[BlueprintBook] Unlock check threw exception, failing open (unlocked):',
                expect.any(Error)
            );

            warnSpy.mockRestore();
        });

        it('fails open and logs a warning when a single entity throws during inspection', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const brokenEntity = {
                components: {
                    StaticMapEntity: {
                        get code() { throw new Error('boom'); }
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([brokenEntity]);

            let locked;
            expect(() => { locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING'); }).not.toThrow();
            expect(locked).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith(
                '[BlueprintBook] Entity inspection error, failing open:',
                expect.any(Error)
            );

            warnSpy.mockRestore();
        });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/preview.test.js -t "getLockedEntitiesInBlueprint" --reporter=dot`
Expected: FAIL — sentinel/fallback/fail-open behavior doesn't exist yet.

- [ ] **Step 3: Rewrite `getLockedEntitiesInBlueprint` in `src/preview.js`**

Replace the existing function (lines 567-604):

```javascript
export function getLockedEntitiesInBlueprint(root, blueprintInput) {
    const input = (blueprintInput && typeof blueprintInput === "object" && !Array.isArray(blueprintInput) && blueprintInput.value)
        ? blueprintInput.value
        : blueprintInput;
    const entities = deserializeBlueprintEntities(root, input);
    if (!entities || !Array.isArray(entities)) return [];

    const locked = [];
    for (let i = 0; i < entities.length; ++i) {
        const entity = entities[i];
        const staticComp = entity?.components?.StaticMapEntity;
        if (!staticComp) continue;

        const metaBuilding = typeof staticComp.getMetaBuilding === "function"
            ? staticComp.getMetaBuilding()
            : null;
        if (!metaBuilding) continue;

        const isUnlocked = typeof metaBuilding.getIsUnlocked === "function"
            ? metaBuilding.getIsUnlocked(root)
            : true;

        const variant = typeof staticComp.getVariant === "function"
            ? staticComp.getVariant()
            : (staticComp.variant || "default");

        const availableVariants = typeof metaBuilding.getAvailableVariants === "function"
            ? metaBuilding.getAvailableVariants(root)
            : [variant];

        const isVariantUnlocked = Array.isArray(availableVariants) && availableVariants.includes(variant);

        if (!isUnlocked || !isVariantUnlocked) {
            locked.push(entity);
        }
    }
    return locked;
}
```

with:

```javascript
/**
 * Inspects blueprint entities and returns an array of locked building entities.
 * When the underlying deserialize failed because it references locked/unresearched
 * content (see deserializeBlueprintEntities), returns a single opaque sentinel entry
 * so callers that gate on `.length > 0` (equip-disable, locked-warning badge) still
 * behave correctly without needing to special-case this result.
 * @param {object} root
 * @param {any} blueprintInput
 * @returns {Array}
 */
export function getLockedEntitiesInBlueprint(root, blueprintInput) {
    const input = (blueprintInput && typeof blueprintInput === "object" && !Array.isArray(blueprintInput) && blueprintInput.value)
        ? blueprintInput.value
        : blueprintInput;
    const { entities, failedDueToUnlock } = deserializeBlueprintEntities(root, input);
    if (failedDueToUnlock) return [{ __unresolvable: true }];
    if (!entities || !Array.isArray(entities)) return [];

    const locked = [];
    for (let i = 0; i < entities.length; ++i) {
        try {
            const entity = entities[i];
            const staticComp = entity?.components?.StaticMapEntity;
            if (!staticComp) continue;

            const metaBuilding = typeof staticComp.getMetaBuilding === "function"
                ? staticComp.getMetaBuilding()
                : null;
            if (!metaBuilding) continue;

            let isUnlocked = true;
            try {
                isUnlocked = typeof metaBuilding.getIsUnlocked === "function"
                    ? metaBuilding.getIsUnlocked(root)
                    : true;
            } catch (err) {
                console.warn("[BlueprintBook] Unlock check threw exception, failing open (unlocked):", err);
                isUnlocked = true;
            }

            const variant = typeof staticComp.getVariant === "function"
                ? staticComp.getVariant()
                : (staticComp.variant || "default");

            const availableVariants = typeof metaBuilding.getAvailableVariants === "function"
                ? metaBuilding.getAvailableVariants(root)
                : [variant];

            let isVariantUnlocked = Array.isArray(availableVariants) && availableVariants.includes(variant);

            if (!isVariantUnlocked) {
                // A variant can be registered (staticComp.code is valid) but filtered out of
                // getAvailableVariants by a third mod (e.g. a toolbar mod hiding "mirrored")
                // without actually being locked. shapez.gBuildingVariants is the live building-
                // codes registry (verified against shapez_source/src/js/game/building_codes.js
                // and mods/modloader.js's exposeExports()); a code is registered per-variant, so
                // existence alone confirms this code corresponds to the entity's actual variant.
                try {
                    const code = staticComp.code;
                    const gVariants = (typeof shapez !== "undefined" && shapez.gBuildingVariants) || null;
                    if (code !== undefined && code !== null && gVariants && gVariants[code]) {
                        isVariantUnlocked = true;
                    }
                } catch {
                    // shapez.gBuildingVariants unavailable or lookup failed — leave locked.
                }
            }

            if (!isUnlocked || !isVariantUnlocked) {
                locked.push(entity);
            }
        } catch (err) {
            console.warn("[BlueprintBook] Entity inspection error, failing open:", err);
        }
    }
    return locked;
}
```

- [ ] **Step 4: Run the preview test suite to verify the new tests pass and nothing regressed**

Run: `npx vitest run tests/preview.test.js --reporter=dot`
Expected: PASS (all tests — including the pre-existing "identifies entities
locked by building status" and "identifies entities locked by variant status"
tests from before this task, unchanged)

- [ ] **Step 5: Switch `ui.js` to import the consolidated function and delete its duplicate**

In `src/ui.js`, change the import (line 6) from:

```javascript
import { openBlueprintPreviewDialog, getBlueprintCost, getBlueprintEntityCount, renderBlueprintCostElement, deserializeBlueprintEntities } from "./preview.js";
```

to:

```javascript
import { openBlueprintPreviewDialog, getBlueprintCost, getBlueprintEntityCount, renderBlueprintCostElement, deserializeBlueprintEntities, getLockedEntitiesInBlueprint } from "./preview.js";
```

Then delete the local `getLockedEntitiesInBlueprint` function entirely
(lines 29-49):

```javascript
export function getLockedEntitiesInBlueprint(root, entities) {
    if (!entities || !Array.isArray(entities) || !root) return [];
    const locked = [];
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const staticComp = entity.components?.StaticMapEntity;
        const meta = staticComp?.getMetaBuilding ? staticComp.getMetaBuilding() : null;
        if (meta) {
            let unlocked = true;
            if (root.hubGoals && typeof root.hubGoals.isBuildingUnlocked === "function") {
                unlocked = root.hubGoals.isBuildingUnlocked(meta);
            } else if (typeof meta.getIsUnlocked === "function") {
                unlocked = meta.getIsUnlocked(root);
            }
            if (!unlocked) {
                locked.push(entity);
            }
        }
    }
    return locked;
}

```

(Delete the whole block including the blank line that follows it, so
`export function isBlueprintsUnlocked(root) {` becomes the next line after the
imports/changelog function.)

- [ ] **Step 6: Update the three `tests/ui.test.js` tests that relied on the deleted `hubGoals.isBuildingUnlocked` check**

These three tests currently mock entities with no `getIsUnlocked` method and
instead flip `mockRoot.hubGoals.isBuildingUnlocked`. The consolidated function
only checks `metaBuilding.getIsUnlocked(root)`, so each needs its mock entity
updated to expose that method instead.

In `tests/ui.test.js`, find (around line 877, inside `describe('async equipBlueprint', ...)`):

```javascript
        const lockedEntity = {
            components: {
                StaticMapEntity: {
                    getMetaBuilding: () => ({ id: 'locked_building' })
                }
            }
        };
        global.shapez.BlueprintLibraryModLoader.mods[0].constructor.deserialize.mockReturnValue([lockedEntity]);
        mockRoot.hubGoals.isBuildingUnlocked.mockReturnValue(false);

        await hudLibrary.equipBlueprint('LOCKED_BP_STRING');
```

Replace with:

```javascript
        const lockedEntity = {
            components: {
                StaticMapEntity: {
                    getMetaBuilding: () => ({
                        id: 'locked_building',
                        getIsUnlocked: vi.fn().mockReturnValue(false)
                    })
                }
            }
        };
        global.shapez.BlueprintLibraryModLoader.mods[0].constructor.deserialize.mockReturnValue([lockedEntity]);

        await hudLibrary.equipBlueprint('LOCKED_BP_STRING');
```

Find (around line 953, `it('_createBlueprintCard reflects newly-unlocked buildings on re-render even though entities/cost are cached', ...)`):

```javascript
        const bp = { id: 'bp_progression', name: 'Progression BP', value: 'PROGRESSION_BP_VALUE', tags: [] };
        const gatedEntity = {
            components: {
                StaticMapEntity: {
                    getMetaBuilding: () => ({ id: 'gated_building' })
                }
            }
        };
        global.shapez.BlueprintLibraryModLoader.mods[0].constructor.deserialize.mockReturnValue([gatedEntity]);
        mockRoot.hubGoals.isBuildingUnlocked.mockReturnValue(false);

        let card = hudLibrary._createBlueprintCard(bp, () => {});
        expect(card.querySelector('.bplib-btn-equip').disabled).toBe(true);

        // Player levels up and unlocks the building; the blueprint's id/value haven't changed.
        mockRoot.hubGoals.isBuildingUnlocked.mockReturnValue(true);

        card = hudLibrary._createBlueprintCard(bp, () => {});
        expect(card.querySelector('.bplib-btn-equip').disabled).toBe(false);
```

Replace with:

```javascript
        const bp = { id: 'bp_progression', name: 'Progression BP', value: 'PROGRESSION_BP_VALUE', tags: [] };
        const isUnlockedMock = vi.fn().mockReturnValue(false);
        const gatedEntity = {
            components: {
                StaticMapEntity: {
                    getMetaBuilding: () => ({
                        id: 'gated_building',
                        getIsUnlocked: isUnlockedMock
                    })
                }
            }
        };
        global.shapez.BlueprintLibraryModLoader.mods[0].constructor.deserialize.mockReturnValue([gatedEntity]);

        let card = hudLibrary._createBlueprintCard(bp, () => {});
        expect(card.querySelector('.bplib-btn-equip').disabled).toBe(true);

        // Player levels up and unlocks the building; the blueprint's id/value haven't changed.
        isUnlockedMock.mockReturnValue(true);

        card = hudLibrary._createBlueprintCard(bp, () => {});
        expect(card.querySelector('.bplib-btn-equip').disabled).toBe(false);
```

Find (around line 977, `it('_createBlueprintCard disables equip button and sets title tooltip when blueprint contains locked entities', ...)`):

```javascript
        const lockedEntity = {
            components: {
                StaticMapEntity: {
                    getMetaBuilding: () => ({ id: 'locked_building' })
                }
            }
        };
        global.shapez.BlueprintLibraryModLoader.mods[0].constructor.deserialize.mockReturnValue([lockedEntity]);
        mockRoot.hubGoals.isBuildingUnlocked.mockReturnValue(false);

        const bp = { id: 'bp_locked', name: 'Locked BP', value: 'LOCKED_BP_STRING', tags: [] };
        const card = hudLibrary._createBlueprintCard(bp, () => {});
```

Replace with:

```javascript
        const lockedEntity = {
            components: {
                StaticMapEntity: {
                    getMetaBuilding: () => ({
                        id: 'locked_building',
                        getIsUnlocked: vi.fn().mockReturnValue(false)
                    })
                }
            }
        };
        global.shapez.BlueprintLibraryModLoader.mods[0].constructor.deserialize.mockReturnValue([lockedEntity]);

        const bp = { id: 'bp_locked', name: 'Locked BP', value: 'LOCKED_BP_STRING', tags: [] };
        const card = hudLibrary._createBlueprintCard(bp, () => {});
```

- [ ] **Step 7: Update `_createBlueprintCard`'s lock-check call site to fall back to the raw value**

`_createBlueprintCard`'s cache can hold `entities: null` (a real deserialize
failure). Passing `null` straight into `getLockedEntitiesInBlueprint` would lose
the `failedDueToUnlock` signal (its own internal `deserializeBlueprintEntities(root, null)`
call hits the "no input" early-return, which is `failedDueToUnlock: false` — the
wrong classification). Passing the original raw string lets it re-derive the
flag correctly, exactly like `openBlueprintPreviewDialog` already does with its
`entities || blueprint` pattern.

In `src/ui.js`, inside `_createBlueprintCard` (around line 761), change:

```javascript
        const { entities, cost } = cached;
        // Not cached: unlock state can change mid-session (e.g. leveling up), so this
        // must be recomputed on every render even though entities/cost are stable.
        const lockedEntities = getLockedEntitiesInBlueprint(this.root, entities);
```

to:

```javascript
        const { entities, cost } = cached;
        // Not cached: unlock state can change mid-session (e.g. leveling up), so this
        // must be recomputed on every render even though entities/cost are stable.
        // Falls back to the raw value when entities is null so a real deserialize
        // failure (locked/unresearched content) is re-detected instead of silently
        // reporting "not locked."
        const lockedEntities = getLockedEntitiesInBlueprint(this.root, entities || bp?.value);
```

(The `cached` destructure itself is updated in Task 4, which also adds
`failedDueToUnlock` to it — this step only touches the `getLockedEntitiesInBlueprint`
call line.)

- [ ] **Step 8: Run the full test suite to verify everything passes**

Run: `npx vitest run --reporter=dot`
Expected: PASS (all tests in both `tests/preview.test.js` and `tests/ui.test.js`)

- [ ] **Step 9: Commit**

```bash
git add src/preview.js src/ui.js tests/preview.test.js tests/ui.test.js
git commit -m "preview,ui: consolidate getLockedEntitiesInBlueprint with gBuildingVariants fallback and fail-open policy"
```

---

### Task 4: `_createBlueprintCard` placeholder rendering

**Files:**
- Modify: `src/ui.js:745-766`
- Test: `tests/ui.test.js`

**Interfaces:**
- Consumes: `deserializeBlueprintEntities` (Task 1/2), `getLockedEntitiesInBlueprint` (Task 3).
- Produces: no new exports — this is a leaf UI change.

- [ ] **Step 1: Write the failing test**

In `tests/ui.test.js`, inside `describe('_createBlueprintCard cost element
rendering', ...)` (ends at line 1092), add this test right before the closing
`});`:

```javascript
    it('renders "Cost: unknown" placeholder and disables equip when deserialize fails due to locked content', () => {
        global.shapez.BlueprintLibraryModLoader.mods[0].constructor.deserialize.mockImplementation(() => {
            throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
        });

        const bp = { id: 'bp_research_gated', name: 'Research Gated BP', value: 'RESEARCH_GATED_BP_STRING', tags: [] };
        const card = hudLibrary._createBlueprintCard(bp, () => {});

        expect(card.querySelector('.bplib-cost-unknown')).not.toBeNull();
        expect(card.querySelectorAll('.requirement.bplib-cost-unknown .label')[0].textContent).toBe('Cost: unknown');
        expect(card.querySelectorAll('.requirement:not(.bplib-cost-unknown)').length).toBe(0);

        const equipBtn = card.querySelector('.bplib-btn-equip');
        expect(equipBtn.disabled).toBe(true);
        expect(equipBtn.classList.contains('disabled')).toBe(true);
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/ui.test.js -t "Cost: unknown" --reporter=dot`
Expected: FAIL — no `.bplib-cost-unknown` element exists yet.

- [ ] **Step 3: Implement the placeholder rendering**

In `src/ui.js`, inside `_createBlueprintCard` (lines 745-766), replace:

```javascript
        if (!this._cardCache) {
            this._cardCache = new Map();
        }

        const cacheKey = `${bp?.id || ""}:${bp?.value || ""}`;
        let cached = this._cardCache.get(cacheKey);
        if (!cached) {
            const entities = deserializeBlueprintEntities(this.root, bp?.value);
            const cost = getBlueprintCost(this.root, entities);
            cached = { entities, cost };
            this._cardCache.set(cacheKey, cached);
        }

        const { entities, cost } = cached;
        // Not cached: unlock state can change mid-session (e.g. leveling up), so this
        // must be recomputed on every render even though entities/cost are stable.
        // Falls back to the raw value when entities is null so a real deserialize
        // failure (locked/unresearched content) is re-detected instead of silently
        // reporting "not locked."
        const lockedEntities = getLockedEntitiesInBlueprint(this.root, entities || bp?.value);

        if (cost && cost.length) {
            const costElem = renderBlueprintCostElement(this.root, cost, 24);
            reqDiv.appendChild(costElem);
        }
```

with:

```javascript
        if (!this._cardCache) {
            this._cardCache = new Map();
        }

        const cacheKey = `${bp?.id || ""}:${bp?.value || ""}`;
        let cached = this._cardCache.get(cacheKey);
        if (!cached) {
            const { entities, failedDueToUnlock } = deserializeBlueprintEntities(this.root, bp?.value);
            const cost = getBlueprintCost(this.root, entities);
            cached = { entities, cost, failedDueToUnlock };
            this._cardCache.set(cacheKey, cached);
        }

        const { entities, cost, failedDueToUnlock } = cached;
        // Not cached: unlock state can change mid-session (e.g. leveling up), so this
        // must be recomputed on every render even though entities/cost/failedDueToUnlock
        // are stable. Falls back to the raw value when entities is null so a real
        // deserialize failure (locked/unresearched content) is re-detected instead of
        // silently reporting "not locked."
        const lockedEntities = getLockedEntitiesInBlueprint(this.root, entities || bp?.value);

        if (failedDueToUnlock) {
            const unknownDiv = document.createElement('div');
            unknownDiv.className = 'requirement bplib-cost-unknown';
            const labelSpan = document.createElement('span');
            labelSpan.className = 'label';
            labelSpan.textContent = 'Cost: unknown';
            unknownDiv.appendChild(labelSpan);
            reqDiv.appendChild(unknownDiv);
        } else if (cost && cost.length) {
            const costElem = renderBlueprintCostElement(this.root, cost, 24);
            reqDiv.appendChild(costElem);
        }
```

- [ ] **Step 4: Run the full ui test suite to verify everything passes**

Run: `npx vitest run tests/ui.test.js --reporter=dot`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui.js tests/ui.test.js
git commit -m "ui: show 'Cost: unknown' placeholder on library cards for locked/unresearched blueprints"
```

---

### Task 5: `openBlueprintPreviewDialog` placeholder rendering

**Files:**
- Modify: `src/preview.js:427-433, 434-446, 490-508`
- Test: `tests/preview.test.js`

**Interfaces:**
- Consumes: `deserializeBlueprintEntities` (Task 1/2).
- Produces: no new exports — leaf UI change.

- [ ] **Step 1: Write the failing tests**

In `tests/preview.test.js`, inside `describe('openBlueprintPreviewDialog',
...)` (ends at line 248), add these tests right before the closing `});`:

```javascript
        it('shows "Buildings: ?" and "Cost: unknown" when deserialize fails due to locked/unresearched content', () => {
            let createdDialog = null;
            global.shapez.Dialog = vi.fn().mockImplementation(function (opts) {
                const el = document.createElement('div');
                el.innerHTML = opts.contentHTML;
                this.element = el;
                this.dialogElem = document.createElement('div');
                this.buttonSignals = { equip: { add: vi.fn() } };
                this.closeRequested = { add: vi.fn() };
                createdDialog = this;
                return this;
            });

            mockBpMod.constructor.deserialize.mockImplementation(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            const bp = { id: 'bp1', name: 'Research Gated Blueprint', value: 'RESEARCH_GATED_BP_STRING' };
            openBlueprintPreviewDialog(mockRoot, bp);

            const statsContainer = createdDialog.element.querySelector('.bplib-preview-stats');
            expect(statsContainer.textContent).toContain('?');

            const costSlot = createdDialog.element.querySelector('.bplib-preview-cost-slot');
            expect(costSlot.textContent).toContain('unknown');
        });

        it('disables EQUIP button when deserialize fails due to locked/unresearched content', () => {
            let createdDialog = null;
            global.shapez.Dialog = vi.fn().mockImplementation(function (opts) {
                const el = document.createElement('div');
                el.innerHTML = opts.contentHTML;
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'buttons';
                (opts.buttons || []).forEach(b => {
                    const [name, style] = b.split(':');
                    const btn = document.createElement('button');
                    btn.className = `button styledButton ${style || ''}`;
                    btn.dataset.button = name;
                    btn.textContent = name.toUpperCase();
                    buttonsDiv.appendChild(btn);
                });
                el.appendChild(buttonsDiv);

                this.element = el;
                this.dialogElem = document.createElement('div');
                this.buttonSignals = { equip: { add: vi.fn() } };
                this.closeRequested = { add: vi.fn() };
                createdDialog = this;
                return this;
            });

            mockBpMod.constructor.deserialize.mockImplementation(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            const bp = { id: 'bp1', name: 'Research Gated Blueprint', value: 'RESEARCH_GATED_BP_STRING' };
            openBlueprintPreviewDialog(mockRoot, bp);

            const equipBtn = createdDialog.element.querySelector('.buttons button.good, .buttons button[data-button="equip"], button.good');
            expect(equipBtn.disabled).toBe(true);
        });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/preview.test.js -t "locked/unresearched content" --reporter=dot`
Expected: FAIL — no placeholder text or disabled state exists yet for this
dialog path (note: `getLockedEntitiesInBlueprint`'s Task 3 sentinel already
makes the equip-disable test technically closer to passing than the text
tests, but confirm both fail before proceeding to be sure of a clean baseline).

- [ ] **Step 3: Implement the placeholder rendering**

In `src/preview.js`, inside `openBlueprintPreviewDialog` (lines 427-446),
replace:

```javascript
    const entities = deserializeBlueprintEntities(root, blueprint.value || blueprint);
    const entityCount = getBlueprintEntityCount(root, entities);
    const cost = getBlueprintCost(root, entities);

    const previewHtml = `
        <div class="bplib-preview-dialog-content">
            <div class="bplib-preview-canvas-container">
                <button class="button styledButton bplib-preview-recenter-btn">Recenter</button>
            </div>
            <div class="bplib-preview-footer">
                <div class="bplib-preview-stats">
                    <div class="stat-item"><span class="label">Buildings:</span> <strong>${entityCount}</strong></div>
                    <div class="stat-item bplib-preview-cost-slot"></div>
                </div>
            </div>
        </div>
    `;
```

with:

```javascript
    const { entities, failedDueToUnlock } = deserializeBlueprintEntities(root, blueprint.value || blueprint);
    const entityCount = getBlueprintEntityCount(root, entities);
    const entityCountDisplay = failedDueToUnlock ? "?" : entityCount;
    const cost = getBlueprintCost(root, entities);

    const previewHtml = `
        <div class="bplib-preview-dialog-content">
            <div class="bplib-preview-canvas-container">
                <button class="button styledButton bplib-preview-recenter-btn">Recenter</button>
            </div>
            <div class="bplib-preview-footer">
                <div class="bplib-preview-stats">
                    <div class="stat-item"><span class="label">Buildings:</span> <strong>${entityCountDisplay}</strong></div>
                    <div class="stat-item bplib-preview-cost-slot"></div>
                </div>
            </div>
        </div>
    `;
```

Then, further down in the same function (around lines 498-507), replace:

```javascript
        const costSlot = dialog.element.querySelector(".bplib-preview-cost-slot");
        if (costSlot && cost && cost.length) {
            const labelSpan = document.createElement("span");
            labelSpan.className = "label bplib-preview-cost-label";
            labelSpan.textContent = "Cost:";
            costSlot.appendChild(labelSpan);

            const costElem = renderBlueprintCostElement(root, cost, 24);
            costSlot.appendChild(costElem);
        }
```

with:

```javascript
        const costSlot = dialog.element.querySelector(".bplib-preview-cost-slot");
        if (costSlot && failedDueToUnlock) {
            const labelSpan = document.createElement("span");
            labelSpan.className = "label bplib-preview-cost-label";
            labelSpan.textContent = "Cost:";
            costSlot.appendChild(labelSpan);

            const unknownSpan = document.createElement("span");
            unknownSpan.className = "bplib-preview-cost-unknown";
            unknownSpan.textContent = "unknown";
            costSlot.appendChild(unknownSpan);
        } else if (costSlot && cost && cost.length) {
            const labelSpan = document.createElement("span");
            labelSpan.className = "label bplib-preview-cost-label";
            labelSpan.textContent = "Cost:";
            costSlot.appendChild(labelSpan);

            const costElem = renderBlueprintCostElement(root, cost, 24);
            costSlot.appendChild(costElem);
        }
```

The two `getLockedEntitiesInBlueprint(root, entities || blueprint)` call sites
(the `equip` button signal handler and the locked-warning block) need no code
change — `entities` is now correctly `null` on a real failure (same as before
this task; only the surrounding local variable name/shape changed via the
destructure above), so the existing `entities || blueprint` fallback already
re-triggers the Task 3 sentinel path correctly.

The `InteractiveBlueprintViewer` construction call
(`new InteractiveBlueprintViewer(root, entities || blueprint.value, liveContainer)`)
also needs no change for the same reason.

- [ ] **Step 4: Run the full preview test suite to verify everything passes**

Run: `npx vitest run tests/preview.test.js --reporter=dot`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/preview.js tests/preview.test.js
git commit -m "preview: show 'Buildings: ?' / 'Cost: unknown' in preview dialog for locked/unresearched blueprints"
```

---

### Task 6: Record `equipBlueprint` deserialize-duplication as tracked technical debt

**Files:**
- Create: `docs/agent-collaboration-notes.md`

**Interfaces:** None — documentation only.

No file in this project currently tracks cross-session technical debt notes.
This task creates one, per your explicit instruction during design review to
leave `equipBlueprint` untouched now but record the duplication for later.

- [ ] **Step 1: Create the notes file**

```markdown
# Agent Collaboration Notes

Running log of technical debt and deferred decisions surfaced during
agent-assisted work, so a future session (agent or human) has the context
without re-deriving it.

## `equipBlueprint` duplicates deserialize-and-classify logic (2026-08-11)

`src/ui.js`'s `equipBlueprint` (around line 565) has its own inline try/catch
around `bpMod.constructor.deserialize`, separate from `src/preview.js`'s
`deserializeBlueprintEntities`, which now returns a structured
`{ entities, failedDueToUnlock }` result (see
`docs/superpowers/specs/2026-08-11-preview-deserialize-locked-detection-design.md`).

This was deliberately left alone during that fix: `equipBlueprint`'s deserialize
handling was already fixed and verified working in-game (commit `3d4fc0a`,
"ui: treat deserialize failure during equip as locked buildings"), and
re-touching it to consume the new shared function risked regressing confirmed
behavior for a consistency-only win.

**Follow-up, not yet scheduled:** once the structured
`deserializeBlueprintEntities` function has more mileage, consolidate
`equipBlueprint` onto it too, so there's a single deserialize-and-classify path
instead of two. Re-verify in-game after doing so, per this project's
Verification Discipline — passing tests alone would not be sufficient
confirmation for this path, since the original bug this duplication traces
back to was only caught by manual in-game testing.
```

- [ ] **Step 2: Commit**

```bash
git add docs/agent-collaboration-notes.md
git commit -m "docs: track equipBlueprint deserialize-duplication as technical debt"
```

---

### Task 7: Full automated verification

**Files:** None (verification only).

**Interfaces:** None.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run --reporter=dot`
Expected: PASS — every test in `tests/preview.test.js` and `tests/ui.test.js`.

- [ ] **Step 2: Run the typechecker**

Run: `npx tsc --noEmit`
Expected: No errors. If `deserializeBlueprintEntities`'s new object return
shape surfaces a type mismatch anywhere JSDoc types are checked, fix the
JSDoc `@returns` annotation on `deserializeBlueprintEntities`
(`src/preview.js`) to `{entities: Array|null, failedDueToUnlock: boolean}`
rather than suppressing the error.

- [ ] **Step 3: Run the linter**

Run: `npx eslint .`
Expected: No errors.

- [ ] **Step 4: Build the mod bundle**

Run: `npm run build:dev`
Expected: Succeeds, producing an updated `BlueprintLibrary.mod.js`. This is a
dev build (unminified) so the next task's manual in-game check can read stack
traces if anything goes wrong.

- [ ] **Step 5: Commit the rebuilt bundle if it changed**

```bash
git status --short
```

If `BlueprintLibrary.mod.js` shows as modified:

```bash
git add BlueprintLibrary.mod.js
git commit -m "build: rebuild bundle for preview deserialize locked-detection fix"
```

---

### Task 8: Real-runtime verification (manual — requires you, not an agent)

**Files:** None.

**Interfaces:** None.

Per this project's Verification Discipline, passing mocked unit tests is not
sufficient confirmation — the original bug in this plan was only caught by
manual in-game testing, and the mocks in Tasks 1-5 only test this plan's own
assumptions about `shapez-industries`'s behavior. This task cannot be
delegated to a subagent; it needs the actual game running with the actual
`shapez-industries` mod loaded.

- [ ] **Step 1: Load the game with BlueprintLibrary and shapez-industries active**

Load a save (or start a new game) with both mods enabled, using the freshly
built `BlueprintLibrary.mod.js` from Task 7.

- [ ] **Step 2: Save a blueprint containing an unresearched Industries variant to your library**

In a level where the `merger-inverse` balancer variant (or any other
currently-unresearched shapez-industries variant) is not yet unlocked, place
one, select it, and save it to the BlueprintBook library via the normal copy
flow.

- [ ] **Step 3: Open the library and confirm the card shows the placeholder state**

Open the BlueprintBook library overlay. Confirm the saved blueprint's card
shows "Cost: unknown" (not a blank cost row, not a real cost number) and that
its EQUIP button is disabled with the "Contains locked buildings" tooltip —
BEFORE clicking anything. This is the actual regression this plan fixes: prior
to this work, the card would have shown no cost row and an enabled EQUIP
button, i.e. it would have looked like a normal, unlocked blueprint.

- [ ] **Step 4: Open the PREVIEW dialog for that card**

Confirm the dialog shows "Buildings: ?" and "Cost: unknown" in its stats row,
and that its EQUIP button is disabled.

- [ ] **Step 5: Confirm the already-fixed equip-click path still works**

Click EQUIP on the card (it should be disabled — if it's clickable, that's a
regression, stop and investigate before continuing). Separately, exercise the
existing `equipBlueprint` locked-buildings warning path (e.g. via a blueprint
containing an entity locked by normal level-gating, not a research-gated
Industries variant) to confirm commit `3d4fc0a`'s behavior is unaffected by
this plan's changes.

- [ ] **Step 6: Report the result**

Report back with a pass/fail for each of steps 3-5. Only after this passes
should this plan be considered complete — do not report "fixed" based on
Task 7's test/build results alone.
