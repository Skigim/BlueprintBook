# Handoff — preview.js silently reports research-gated blueprints as safe

**Status:** investigation complete, not yet planned or implemented.

## Background

While doing real-runtime verification for the blueprint-cost-compat plan
(`docs/superpowers/plans/2026-08-11-shapez-industries-blueprint-cost-compat.md`),
equipping a blueprint containing an shapez-industries research-gated balancer
variant (`merger-inverse`) crashed with:

```
AssertionError: Unknown balancer variant: merger-inverse
  at MetaBalancerBuilding.updateVariants
  at MetaBalancerBuilding._createEntity
  at _SerializerInternal.deserializeEntityNoPlace
  at ... unpackEntities ... Function.deserialize
  at HUDBlueprintLibrary.equipBlueprint (src/ui.js)
```

## Root cause

`shapez-industries` doesn't pre-register research-gated variants in the
building/variant registry until they're unlocked. Deserializing a blueprint
that references such a variant throws a hard assertion **during entity
construction**, before any entities array exists — not a "this entity is
locked" signal we can inspect afterward. `getLockedEntitiesInBlueprint`
(both copies, `src/ui.js:29` and `src/preview.js:567`) only ever runs on the
entities *returned by* deserialize, so it structurally cannot see this case.

## What's already fixed (commit 3d4fc0a, this branch)

`src/ui.js`'s `equipBlueprint` now catches the deserialize call specifically
and shows the existing "Blueprint contains locked buildings" warning instead
of leaking the raw assertion as an "Error equipping blueprint" notification.
Verified fixed in-game.

## What's still broken

`src/preview.js:56-60`, `deserializeBlueprintEntities`:

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

This is the function backing card rendering (`getBlueprintCost`,
`getBlueprintEntityCount`, and `src/preview.js`'s own copy of
`getLockedEntitiesInBlueprint` at line 567, plus the preview dialog). It
swallows the same assertion into a bare `null`. Downstream, that reads as:

- `getBlueprintEntityCount` → `0` buildings
- `getBlueprintCost` → `null` cost (renders no cost row)
- `getLockedEntitiesInBlueprint` → `[]` (falsy "not locked")

So a library card containing a research-gated blueprint silently displays
as an empty, costless, unlocked blueprint — a false negative, not a crash.
The equip button stays enabled; clicking it now (post-3d4fc0a) correctly
shows the locked-buildings warning, but the card itself lied about it.

## Prior related work — reusable starting material

`git show 0ad392c` — an unplanned attempt (antigravity session, reverted
2026-08-11, sits at `stash@{0}` in the parent checkout) consolidated the two
`getLockedEntitiesInBlueprint` copies and added fail-open per-entity error
handling plus a `shapez.gBuildingVariants`-based fallback for variants
filtered out of `getAvailableVariants` by other mods (e.g. a toolbar mod
hiding "mirrored" without actually locking it).

The full source+test diff is saved alongside this handoff at
[`2026-08-11-preview-deserialize-false-negative-stash-reference.diff`](2026-08-11-preview-deserialize-false-negative-stash-reference.diff)
so it survives even after the stash entry is eventually dropped. Confirmed
via `git merge-tree --write-tree --merge-base=c5c4f9a HEAD 0ad392c` that it
merges cleanly onto this branch's HEAD (`3d4fc0a`) — only the built
`BlueprintLibrary.mod.js` bundle conflicts, trivially resolved by
rebuilding. The consolidated `getLockedEntitiesInBlueprint(root,
blueprintInput)` also composes correctly with the `equipBlueprint` fix
already on this branch: its internal `deserializeBlueprintEntities` short-
circuits on `Array.isArray(blueprintInput)`, so passing it an
already-deserialized `entities` array (as `equipBlueprint` does) still
works.

**Do not merge it wholesale.** It does not address this handoff's actual
bug — it still assumes `deserializeBlueprintEntities` returns entities
before inspecting them, so it can't see a deserialize-time throw either.
Treat it strictly as a draft to build the real fix from, and validate/rework
it in the next plan's own TDD cycle rather than reusing it as-is:

- **Unverified host-engine assumption.** The `shapez.gBuildingVariants`
  fallback (reading `gBuildingVariants[code]` to tell "registered but
  filtered from `getAvailableVariants`" apart from "actually locked") has
  never been traced against `shapez_source/` to confirm the global exists
  or has that shape. Per this project's Verification Discipline, that must
  be confirmed before the logic is trusted — if wrong, it silently
  misclassifies buildings in either direction.
- **No real-runtime verification.** Its tests only assert against its own
  assumed shape of `gBuildingVariants` — the same category of unverified
  mock this project's rules call out as insufficient.
- **Fail-open behavior is a real policy change**, not just error handling —
  worth deciding deliberately in the new plan rather than inheriting
  silently (an entity whose unlock/variant check throws is now treated as
  unlocked; confirm that's the intended failure mode).

## Suggested direction (not yet decided/planned)

`deserializeBlueprintEntities` needs to distinguish "this input can't be
parsed at all" (current `null` behavior, correct) from "this parses to
content the game can't currently construct because it's locked/unresearched"
(should surface as a locked signal, not a silent empty result). Options to
weigh in the actual planning pass:

- Have the catch block classify the error (e.g. does the message match a
  known "unknown variant" pattern?) and return a sentinel distinguishable
  from "couldn't parse" — fragile, coupled to Industries' exact wording.
  Also does not extend to other mods to whatever it might throw.
- Cheaper Now: Add a boolean out-param and follow-up `{ entities: null | Entity[], failedDueToUnlock: boolean }`
  return shape and thread it through the three call sites (cost, count,
  lock detection), since callers already branch on truthy/falsy.
- Reconsider whether card rendering should optimistically show "may contain
  locked content, cost unknown" for any deserialize failure, given a
  library card cannot generally distinguish real corruption from this case
  today anyway.

Also worth folding in the `getLockedEntitiesInBlueprint` de-duplication
non-goal (`src/ui.js:29` vs `src/preview.js:567`) — the reference diff above
already did that consolidation and it merges clean onto this branch, so a
future plan doesn't have to redo it from scratch, only verify and rework it.

## Files involved

- `src/preview.js` — `deserializeBlueprintEntities`, `getBlueprintCost`,
  `getBlueprintEntityCount`, `getLockedEntitiesInBlueprint`
- `src/ui.js` — the duplicate `getLockedEntitiesInBlueprint`, `_cardCache`
  (does not key on unlock state — pre-existing, separate issue, do not
  conflate)
- `tests/preview.test.js`, `tests/ui.test.js`

## Next step

Run `superpowers:brainstorming` then `superpowers:writing-plans` on this
handoff when ready to schedule the work — do not implement directly from
this doc.
