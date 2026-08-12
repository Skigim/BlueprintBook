# Design — fix preview/card false-negative for locked blueprint content

**Status:** approved, not yet planned.

**Origin:** [`2026-08-11-preview-deserialize-false-negative-handoff.md`](../plans/2026-08-11-preview-deserialize-false-negative-handoff.md).

## Problem

`deserializeBlueprintEntities` (`src/preview.js:51-61`) swallows any exception from
`bpMod.constructor.deserialize` into a bare `null`. This is correct for "can't parse
this input at all," but a blueprint that references content the game can't currently
construct — e.g. an unresearched shapez-industries variant like `merger-inverse`,
which the mod doesn't pre-register until unlocked — also throws during deserialize,
before any entities array exists to inspect for lock status. That throw is
indistinguishable from a parse failure downstream, so:

- `getBlueprintEntityCount` → `0`
- `getBlueprintCost` → `null` (no cost row)
- `getLockedEntitiesInBlueprint` → `[]` (falsy "not locked")

A library card containing such a blueprint renders as an empty, costless, unlocked
blueprint — a false negative. `src/ui.js`'s `equipBlueprint` already has a correct
fix for the *click-equip* path (commit `3d4fc0a`), but the card itself still lies.

## Approach

### 1. Structured return shape for `deserializeBlueprintEntities`

Change its return type from `Array|null` to:

```
{ entities: Array|null, failedDueToUnlock: boolean }
```

Classification rule: **any exception** caught from `bpMod.constructor.deserialize`
sets `failedDueToUnlock: true`. No message-pattern matching — Industries' exact
wording ("Unknown balancer variant: ...") is not a signal to couple to, since other
mods that gate content the same way may throw differently. This means a genuinely
corrupt/garbage blueprint string is also classified as `failedDueToUnlock: true`;
that's an accepted imprecision, since there's no robust way to tell the two apart
without reimplementing bp-string's parser ourselves, and a corrupt string in the
player's own library is rare compared to the locked-content case this bug is about.

The two "can't even attempt parsing" early returns (no input; no bp-string mod
loaded) keep `failedDueToUnlock: false` — they never reached a deserialize attempt.
The existing `Array.isArray(blueprintInput)` fast path (caller already has entities)
also returns `failedDueToUnlock: false`.

### 2. Consolidate `getLockedEntitiesInBlueprint` into one copy

Delete `ui.js`'s duplicate (`ui.js:29-49`, the simpler unlock-only check); `ui.js`
imports the one already living in `preview.js:567` (which also checks variant
availability). The consolidated function:

- Internally calls `deserializeBlueprintEntities` itself and reads
  `failedDueToUnlock` from that call.
- When `failedDueToUnlock` is `true`, returns a single sentinel entry (e.g.
  `[{ __unresolvable: true }]`) instead of `[]`, so every existing `.length > 0`
  check (equip-button disable, locked-warning badge) starts working correctly
  without changes at those call sites.
- Adds a `shapez.gBuildingVariants` fallback for the separate case of a variant
  that's registered but filtered out of `getAvailableVariants` by a third mod
  (e.g. a toolbar mod hiding "mirrored" without actually locking it). **Verified**
  against `shapez_source/`: `src/js/game/building_codes.js` exports a live
  `gBuildingVariants` object (`{ [code]: { metaClass, metaInstance, variant,
  rotationVariant, tileSize } }`), populated by `registerBuildingVariant`.
  `src/js/mods/modloader.js`'s `exposeExports()` walks every module's named
  exports and live-binds them as getters onto `window.shapez` when `G_IS_DEV ||
  G_IS_STANDALONE` (not on `G_IS_STEAM_DEMO` or plain web builds without either
  flag) — so `shapez.gBuildingVariants` reflects the same live object. Because a
  building code is registered per-variant already (one code per
  building+variant+rotation combination), an *existence* check
  (`gBuildingVariants[code]`) is sufficient to confirm the code corresponds to the
  entity's actual variant — no need to cross-check the `.variant` field. Read
  access to the global itself is wrapped in try/catch: if it's absent (non-dev,
  non-standalone build), the fallback simply doesn't rescue the entity — it stays
  classified as locked, not misclassified as unlocked.
- Adds fail-open per-entity error handling: if inspecting one entity throws (a bug
  in some other mod's `getMetaBuilding`/`getIsUnlocked`/`getAvailableVariants`),
  that entity is treated as **unlocked** and the error is logged via
  `console.warn`. This matches the existing (unplanned, reverted) draft's
  behavior and is a deliberate policy choice, not inherited silently.

Both additions are reworked from the reference diff (`git show 0ad392c`, saved at
[`2026-08-11-preview-deserialize-false-negative-stash-reference.diff`](../plans/2026-08-11-preview-deserialize-false-negative-stash-reference.diff))
rather than merged wholesale — its tests only assert against its own assumed mock
shape of `gBuildingVariants`, which this design now traces and verifies for real.

### 3. Cost/count functions: minimal change

`getBlueprintCost` and `getBlueprintEntityCount` read `.entities` off the new
structured result internally. Their external return types are unchanged
(`Array|null`, `number`) — they already tolerate `entities === null` by returning
`null`/`0` respectively, and that behavior is correct whether the `null` came from
a parse failure or a lock failure. They don't need to know *why* entities is
`null`; only the two UI entry points below do.

### 4. UI entry points consume the flag directly

- **`_createBlueprintCard`** (`ui.js:745-761`): the existing
  `deserializeBlueprintEntities` call destructures `{ entities, failedDueToUnlock
  }`. The per-card cache (keyed `${bp.id}:${bp.value}`) stores all three of
  `entities`, `cost`, and `failedDueToUnlock` — caching `failedDueToUnlock` is
  safe because deserializability of a fixed blueprint *value* doesn't change
  mid-session; only per-entity unlock status can, which is why the lock check
  itself stays uncached (existing comment in the code, unchanged). When
  `failedDueToUnlock` is true, render "Cost: unknown" placeholder text instead
  of a blank cost row — the card doesn't display a building count today
  (`getBlueprintEntityCount` is imported into `ui.js` but never called there),
  so there's no count placeholder to add here.
- **`openBlueprintPreviewDialog`** (`preview.js:427-433`): same destructuring at
  its own `deserializeBlueprintEntities` call. This dialog *does* show both a
  cost row and a "Buildings: N" stat (via `entityCount`), so both get
  placeholder text ("Cost: unknown" / "Buildings: ?") when `failedDueToUnlock`.
  Equip-button disabling already flows from
  `getLockedEntitiesInBlueprint`'s `.length > 0` check, which now correctly
  reports non-empty via the sentinel entry.
- **`InteractiveBlueprintViewer.initEntities`**: unaffected. It already renders
  nothing when entities is empty/null; no behavior change needed.
- **`equipBlueprint`** (`ui.js:565-610`): explicitly left untouched. It has its
  own inline try/catch around `bpMod.constructor.deserialize` (not routed through
  `deserializeBlueprintEntities`) and is already fixed and verified working
  in-game (commit `3d4fc0a`). Re-touching it to consume the new structured
  function risks regressing confirmed-working behavior for a consistency-only
  win. **Technical debt, tracked here, not addressed by this plan:**
  `equipBlueprint` duplicates the deserialize-and-classify logic that now lives
  in `deserializeBlueprintEntities`; a future pass should consolidate onto the
  single function once it's proven out.

## Data flow (per card render / preview open)

```
deserializeBlueprintEntities(root, value)
  -> { entities, failedDueToUnlock }
     -> cost  = getBlueprintCost(root, entities)          // null if entities null
     -> count = getBlueprintEntityCount(root, entities)   // 0 if entities null
     -> locked = getLockedEntitiesInBlueprint(root, value) // re-derives its own
                                                            // {entities,failedDueToUnlock};
                                                            // sentinel entry if failed
render:
  if failedDueToUnlock -> "Cost: unknown" / "Buildings: ?" placeholders
  if locked.length > 0 -> disable equip button, show locked-content warning
```

## Error handling summary

- Any exception from `bpMod.constructor.deserialize` → `failedDueToUnlock: true`,
  `entities: null`. No message inspection.
- Per-entity inspection errors inside `getLockedEntitiesInBlueprint` → caught
  individually, logged via `console.warn`, entity treated as unlocked (fail-open).
- `shapez.gBuildingVariants` access wrapped in try/catch; absence or lookup
  failure means "not rescued," not "unlocked."

## Testing

- `tests/preview.test.js`: `deserializeBlueprintEntities` returns
  `{entities: null, failedDueToUnlock: true}` on any deserialize throw;
  `{entities: null, failedDueToUnlock: false}` on empty-input/no-mod;
  `{entities: [...], failedDueToUnlock: false}` on success and on
  array-passthrough. `getLockedEntitiesInBlueprint` sentinel-locked case;
  existing locked-building/locked-variant cases still pass; new
  `gBuildingVariants` registered-but-filtered-from-`getAvailableVariants` case
  (adapted from the reference diff, using the verified real shape); fail-open
  per-entity-throw case (adapted from the reference diff).
- `tests/ui.test.js`: remove the duplicate `getLockedEntitiesInBlueprint` tests
  (or adapt them to import from `preview.js`); add coverage for
  `_createBlueprintCard`'s placeholder text and disabled-equip state when
  `failedDueToUnlock`.
- No test changes needed for `equipBlueprint` (untouched; already covered by
  `3d4fc0a`'s existing tests).
- **Real-runtime verification required** (per this project's Verification
  Discipline — passing mocked unit tests is not sufficient): equip a blueprint
  containing an unresearched shapez-industries variant (e.g. `merger-inverse`)
  from the library and confirm the *card itself* shows the placeholder cost/count
  text and a disabled equip button *before* clicking — not just that clicking
  produces the already-verified locked-buildings warning.

## Out of scope

- `_cardCache`'s lack of unlock-state keying (pre-existing, separate issue per
  the handoff — not conflated with this fix).
- Refactoring `equipBlueprint` onto the shared structured function (tracked as
  technical debt above, not implemented here).
- Any change to `bp-string`'s own serialization/deserialization behavior.
