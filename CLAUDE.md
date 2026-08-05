# Shapez Mod UI & HUD Rules
- **Dynamic Scaling**: Always use `calc(PX * var(--ui-scale))` and `content-box` sizing for custom UI components to maintain native scale parity across resolutions and user UI scale settings (`application.js` `getEffectiveUiScale()`).
- **Layering & Z-Index Scoping**:
  - Modal-style `BaseHUDPart` overlays (windows meant to block interaction like dialogs) should slot between `420` and `460` (above regular dialogs like `HUDStatistics` at 410, below `HUDModalDialogs` at 470).
  - Non-modal HUD additions (toolbars, badges, overlays) should reference the earlier tiers in `main.scss` `$elements` (100–390).
- **DOM Insertion Safety**: Always use `target.parentNode.insertBefore(newElem, target.nextSibling)` when injecting elements adjacent to target nodes to avoid `DOMException` if the target is nested inside a sub-wrapper.
- **Input Propagation**: Never call `e.stopPropagation()` on mouse/keyboard events inside custom UI components — it desyncs `InputDistributor.keysDown` and `ClickDetector`'s pressed-state tracking.
- **Search/Text Input Focus**: Never call `.focus()` on a text input from inside `HUDPart.show()` — the keypress that triggered `show()` (e.g. `P`) lands inside the newly focused field.
- Before touching modals or dialogs, read `docs/shapez_dialog_api.md`. Before other engine integration (HUD extension, storage, migrations), read `docs/shapez_engine_notes.md`.

# Required Workflow Skills
- `test-driven-development` and `subagent-driven-development` are required for all new code.
- `systematic-debugging` is required for all bug fixes — form and verify a hypothesis before changing anything.
- Prefer native input handlers and natural event flows over injecting synthetic events or hacking engine state; take the simplest correct route.

# Verification Discipline
- Never assume a pattern from another game, or another Shapez version, carries over here — trace the actual source in `shapez_source/` and verify before building on it.
- Never assume a host object or property exists (e.g. `app.storage`) — trace the host engine source to confirm actual scoping (closure-scoped vs. property-exposed) before writing logic or test mocks.
- Before designing state migrations or storage routines, inspect the actual local save data (`AppData/Roaming/...` or IndexedDB) — don't assume a pristine `length === 0` starting state.
- Passing unit tests is not the same as verified behavior — mocks only test your own assumptions. Don't tell the user something is fixed until real host-runtime behavior is confirmed, not just mocked tests.
- Before adding a defensive guard (`x && x.y`), check whether `x` is already used as a base class or otherwise proven present elsewhere in the same file — don't guard against conditions that are load-time guaranteed.

# After Every Change
- Review your own diff before presenting it — run the self-review pass described in the `subagent-driven-development` skill.
- If the user calls out a workflow misstep, stop, revert the previous turn's changes, and redo it with the correct workflow. Don't argue the point — just fix it.

# Tool Call Efficiency Rules
1. Do NOT issue diagnostic tool calls (e.g., `git status`, `ls`, `pwd`) after simple file writes unless an error occurs.
2. Group related file updates into a single response block.
3. Pipe or quiet test output (`vitest --reporter=dot` / `npm test -- --quiet`) to prevent terminal log dumps from bloating context.
4. Once a plan is approved, execute all file changes sequentially without asking for confirmation at each sub-step.
