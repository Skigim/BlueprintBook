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
