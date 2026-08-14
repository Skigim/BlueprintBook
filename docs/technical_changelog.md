# Developer & Technical Changelog

This document provides deep technical details, architectural decisions, and API contract changes in **Blueprint Book** for developers, modders, and contributors.

## [1.0.4] - 2026-08-14

### 1. Held-Blueprint Save Hotkey Fix (`src/ui.js`)
- **Root Cause**: `handleSaveHotkey()` read exclusively from `massSelector.selectedUids`. Native `mass_selector.js` clears `selectedUids` the instant it dispatches `buildingsSelectedForCopy` (i.e. the moment a blueprint is copied/held), so the natural select → Ctrl+C → Ctrl+P flow always hit an empty selection and silently no-opped.
- **Fix**: `handleSaveHotkey()` now falls back to `root.hud.parts.blueprintPlacer.currentBlueprint.get().entities` when `selectedUids` is empty, preserving the existing mass-selection path when one is active.

### 2. Card Cache Staleness Fix (`src/ui.js`)
- **Root Cause**: `_createBlueprintCard()`'s per-card cache stored `{ entities, cost, lockedEntities }` together, keyed by `id:value`. `lockedEntities` depends on `root.hubGoals.isBuildingUnlocked()`, which changes as the player progresses through the tech tree mid-session — but once cached it was never recomputed, so a card's locked/EQUIP-disabled state froze at whatever it was on first render.
- **Fix**: The cache now stores only `{ entities, cost }` (the expensive, content-derived, session-stable values). `lockedEntities` is recomputed from the cached `entities` on every render.

### 3. Dead `keymapper.emit` Removal (`src/ui.js`)
- **Root Cause**: `equipBlueprint()` had a branch attempting `root.keymapper.emit(...)` / `root.keyMapper.emit(...)` before the real `root.hud.signals.pasteBlueprintRequested.dispatch()` call. Neither `root.keymapper` nor a `.emit()` method exist on shapez's actual `KeyActionMapper` (`shapez_source/src/js/game/key_action_mapper.js`), so the branch was always a no-op. The corresponding unit test asserted against a mock fabricated in the test itself rather than real engine shape, masking the dead code.
- **Fix**: Removed the dead branch; updated the test to assert on `hud.signals.pasteBlueprintRequested.dispatch()`, the actual call path.

### 4. Blueprint Cost Normalization for `shapez-industries` (`src/preview.js`, `src/ui.js`, `src/styles.js`)
- **Root Cause**: `shapez-industries@1.1.6` extends `Blueprint` and replaces `getCost()`, returning a three-element array of per-shape amounts instead of vanilla's single number (`shapez_source/src/js/game/blueprint.js:64`). `getBlueprintCost()` passed the raw value through; the `cost === null || cost === undefined` guards at the two call sites let an array pass; `` `${cost}` `` then stringified it, rendering `30,20,0` on every card and preview dialog. Display corruption only — no crash.
- **Fix**: Introduced a normalization boundary in `src/preview.js`. `normalizeBlueprintCost(root, raw)` collapses both shapes into a canonical `Array<{shapeKey: string|null, amount: number}>`: a finite number becomes a single entry; an array maps index → shape key, keeping only finite non-zero amounts; anything else returns `null`. When every array amount is zero it still emits one `amount: 0` entry, preserving the free-copy-paste case which must keep rendering `0` rather than disappearing.
- **Rendering**: `renderBlueprintCostElement()` now loops the entry array and emits one `.requirement` row per entry, using each entry's own `shapeKey` instead of re-deriving it from `gameMode`. A `null` or unresolvable key renders an amount-only row with no `.shape` child.
- **Guard Change**: Both call sites (`src/ui.js` card render, `src/preview.js` preview cost slot) switched from `!== null` to `cost && cost.length` — an array passes a null check, so the old guard was structurally unable to reject a bad shape.
- **Shape Key Resolution**: Extracted the loader-list lookup out of `resolveBpStringMod` into a generic `findModById(id)`. `resolveCostShapeKeys(root)` returns `INDUSTRIES_COST_SHAPE_KEYS` when `findModById("shapez-industries")` hits, otherwise `[gameMode.getBlueprintShapeKey()]` with a `"CuCuCuCu"` fallback and a try/catch (the method is patched under Industries). Industries' three cost shape keys are a module-private const in its bundle — only index 0 is reachable at runtime via `gameMode.getBlueprintShapeKey()`, so indices 1 and 2 are mirrored in our source. Note that `getCost()` only ever increments indices 0 and 1 in 1.1.6; index 2 is always `0`, hence filtering by value rather than hardcoding a length.
- **Containment**: Industries awareness lives only in `src/preview.js`. `src/ui.js`, `src/store.js`, and `src/styles.js` are unaware the mod exists beyond the multi-row CSS.
- **CSS**: Added `gap: calc(8px * var(--ui-scale))` to `.bplib-upgrade .requirements` and `.bplib-preview-cost-slot .requirements` for multi-row spacing, per the project's dynamic-scaling rule.

### 5. Deserialize Failure No Longer a Silent False Negative (`src/preview.js`, `src/ui.js`)
- **Root Cause**: `deserializeBlueprintEntities()` returned `null` for two semantically different outcomes — "no input / no deserializer available" and "deserialize threw". Mods that gate variants behind their own research system (rather than vanilla's hub level) only register a variant once it is unlocked, so `bpMod.constructor.deserialize()` **throws** on a blueprint referencing unresearched content instead of returning entities we could inspect. Every caller read that `null` as "zero entities", so a research-gated blueprint rendered as a fully unlocked, empty blueprint: `0` buildings, no cost, EQUIP enabled.
- **Fix**: The return shape is now `{ entities, failedDueToUnlock }`; a caught throw sets `failedDueToUnlock: true`. `getBlueprintEntityCount`, `getBlueprintCost`, `InteractiveBlueprintViewer.rebuild()`, and `openBlueprintPreviewDialog` all destructure the new shape.
- **Sentinel Propagation**: `getLockedEntitiesInBlueprint()` returns a single opaque sentinel `[{ __unresolvable: true }]` when `failedDueToUnlock` is set, so every existing `.length > 0` gate (EQUIP disable, locked-warning badge) keeps working without special-casing the new state at each call site.
- **UI Placeholders**: Cards render a `.requirement.bplib-cost-unknown` row reading `Cost: unknown`; the preview dialog renders `Buildings: ?` and `Cost: unknown`. `.bplib-cost-unknown .label` was given explicit `GameFont` / `calc(13px * var(--ui-scale))` / light-dark color rules — it was the only text element on the card with no font or color declaration of its own.
- **Cache Re-derivation**: `_cardCache` now stores `failedDueToUnlock` alongside `{ entities, cost }` and re-derives the entry whenever that flag is set. Without this, content researched mid-session kept showing `Cost: unknown` for the remainder of the session even after the EQUIP button re-enabled. The card path also falls back to `bp?.value` when cached `entities` is `null`, so a genuine deserialize failure is re-detected rather than silently reported as "not locked".
- **Equip Path**: `equipBlueprint()` wraps its own `bpMod.constructor.deserialize` call in a try/catch and surfaces the existing locked-buildings notification instead of a raw equip error. This remains a second, duplicated deserialize-and-classify path — deliberately left alone here because it was already fixed and verified in-game (`3d4fc0a`), and re-touching it for consistency alone risked regressing confirmed behavior. Tracked in `docs/agent-collaboration-notes.md`.

### 6. Deserialize Failure Classification (`src/preview.js`, `src/types/shapez.d.ts`)
- **Purpose**: Distinguish genuine unresearched content from a cross-mod incompatibility in the logs, so a mod patching a building's variant handling and rejecting content it should recognize is not silently filed as "locked".
- **Mechanism**: `classifyDeserializeFailure(root, err)` parses vanilla's `"Unknown <buildingId> variant: <variant>"` assertion convention (see `shapez_source/src/js/game/buildings/balancer.js`) out of the error message, then cross-checks the id against the live `shapez.gMetaBuildingRegistry.findById(...).getAvailableVariants(root)` — whichever instance is currently registered, including one another mod has patched. Variant present in available variants → `likely-incompatibility`; absent → `locked`; message unparseable or registry unavailable → `unrecognized`.
- **Explicitly Best-Effort**: The heuristic depends on the throwing code following that message convention, so a mod wording its own assertions differently degrades to `unrecognized` rather than producing a wrong classification.
- **Fail-Open Policy**: All three kinds are still treated as locked. `logDeserializeFailure()` emits a distinct `console.warn` per kind. Equip stays blocked rather than crashing, in every case.
- **Types**: Declared `gBuildingVariants` and `gMetaBuildingRegistry` on the `Shapez` interface, both reached via the same `exposeExports()` path in `mods/modloader.js`.

### 7. `getLockedEntitiesInBlueprint` Consolidation and Variant Fallback (`src/ui.js`, `src/preview.js`)
- **Root Cause**: Two divergent copies existed with different signatures — `src/ui.js` `(root, entities)` keyed on `root.hubGoals.isBuildingUnlocked(meta)`, and `src/preview.js` `(root, blueprintInput)` keyed on `metaBuilding.getIsUnlocked(root)` plus a variant check. The card path used the `src/ui.js` copy, which never checked variants at all.
- **Fix**: Deleted the `src/ui.js` copy; `src/ui.js` now imports the `src/preview.js` implementation. One deserialize-and-inspect path for cards, previews, and the locked badge.
- **Per-Entity Fail-Open**: Entity inspection is wrapped in a per-entity try/catch that logs and continues, so one mod-supplied entity with a throwing accessor cannot abort the whole loop. `staticComp.code` is read eagerly at the top of the loop body — not lazily inside the fallback branch below — specifically so a throwing `code` getter is caught by that same try/catch. The `getIsUnlocked` call has its own inner try/catch that fails open to unlocked.
- **`gBuildingVariants` Fallback**: A variant can be registered yet filtered out of `getAvailableVariants()` by an unrelated mod (e.g. a toolbar mod hiding `mirrored`) without being locked. When the variant check fails, the code falls back to `shapez.gBuildingVariants[staticComp.code]`; building codes are registered per-variant (verified against `shapez_source/src/js/game/building_codes.js`), so the code's existence alone confirms the entity's actual variant is registered and merely hidden.

## [1.0.3] - 2026-07-28

### 1. Native `BaseHUDPart` Architectural Migration (`src/ui.js`)
- **HUD Part Lifecycle Hooks**: Refactored `HUDBlueprintLibrary` to extend `shapez.BaseHUDPart`. Implemented native lifecycle methods `createElements(parent)`, `initialize()`, `show()`, `close()`, `update()`, and `cleanup()`.
- **Persistent DOM Container & `DynamicDomAttach`**: Replaced lazy `shapez.Dialog` instantiation inside `show()` with `shapez.DynamicDomAttach(this.root, this.background, { attachClass: "visible" })`. The DOM container persists in `document.body` and toggles `.visible` dynamically without node allocation/destruction overhead on toggle cycles.
- **Overlay & Keybinding Handling**: Implemented `isBlockingOverlay()` returning `this.visible`. Bound `InputReceiver("blueprintLibrary")` and `KeyActionMapper` to `general.back` and `ingame.menuClose` for native <kbd>Esc</kbd> and right-click menu closing.

### 2. Z-Index Layering Fix (`src/styles.js`)
- **Stacking Context Alignment**: Reduced `#ingame_HUD_BlueprintLibrary` `z-index` from `500` to `430`. Native `main.scss` dynamically calculates `z-index` via `@each $elem in $elements` (starting at 100 with +10 step), placing `ingame_HUD_Statistics` at `z-index: 410` and `ingame_HUD_ModalDialogs` at `z-index: 470`. Setting the library to `430` places it directly above regular HUD dialogs while ensuring modal dialogs (`z-index: 470`) like blueprint previews and import forms render cleanly on top.

### 3. Dynamic UI SCSS Scaling & Sizing Model (`src/styles.js`)
- **Native `var(--ui-scale)` Dynamic Calc**: Converted static pixel declarations in toolbar elements to native `calc(PX * var(--ui-scale))` dynamic scaling formulas, preserving proportionality across high-DPI displays and user UI scale settings.
- **Content-Box Flow**: Switched tab buttons and inputs from `border-box` to native `box-sizing: content-box`, ensuring text height (`11px` / `14px`), line height (`18px`), and padding (`calc(1px * var(--ui-scale))` / `calc(10px * var(--ui-scale))`) stack identically to native `HUDStatistics` pill tabs (~36px rendered height).
- **Horizontal Overflow Scroll**: Applied `overflow-x: auto`, `flex-shrink: 0`, `scrollbar-width: none`, and `::-webkit-scrollbar { display: none; }` to `.bplib-filterHeader` to support smooth horizontal scrolling for large tag collections.

### 4. Form Textarea Theme Contrast Fix (`lib/ui.js`, `src/styles.js`)
- **Native Input Contract Matching**: Removed hardcoded dark inline styles (`background: rgba(0,0,0,0.2)`) on custom textarea form elements (`createTextAreaFormElement`). Added `.bplib-textarea` matching native `FormElementInput` `#eee` background and `#333438` text color across all themes to match native `dialogs.scss` form input styling.

### 5. DOMException Fix in Update Button Insertion (`src/ui.js`)
- **Parent Container Traversal**: Fixed `toolbar.insertBefore(updateBtn, importBtn.nextSibling)` throwing `DOMException` when `importBtn` was nested inside `.bplib-toolbar-right` sub-container. Replaced parent lookup with `importBtn.parentNode.insertBefore(updateBtn, importBtn.nextSibling)`.

---

## [1.0.2] - 2026-07-24

### 1. Storage & Migration Architecture (`src/store.js`)
- **Migration Version Cache**: Added `migrationVersion` key to `mod.settings`. On boot, `BlueprintStore.init()` compares `mod.settings.migrationVersion` with `mod.meta.version`. When equal, candidate storage key scans (~144 async file-read attempts across IndexedDB and Electron stores) are bypassed, reducing boot I/O latency.
- **Tombstone & Resurfacing Prevention**: Extracted `_mergeBlueprintIfNew(bp, currentBlueprints, existingValues, existingNames, deletedValues, deletedNames)`. Deletions now record value and name tombstones into `deletedValues` and `deletedNames` arrays. Fallback storage scans check these tombstones to prevent deleted legacy blueprints from resurfacing.
- **Dynamic Candidate Scanning**: Implemented `getDynamicCandidateFiles()` to enumerate storage keys via `listKeysAsync` and generate semver fallback paths (`modsettings_bp-library__<ver>.json`).

### 2. Interactive Preview Canvas Engine (`src/preview.js`, `src/styles.js`)
- **Tile Bounds Calculation**: Fixed `staticComp.getTileSpaceBounds()` parsing. Corrected property access from `b.width`/`b.height` (which evaluated to `undefined` and caused `NaN` transform bounds) to native Shapez `Rectangle` properties `b.w` and `b.h`.
- **Canvas Flex Layout Decoupling**: Solved scrollbar/layout reflow feedback loop by applying absolute positioning to `.bplib-preview-canvas-container canvas` (`position: absolute; top: 0; left: 0; width: 100% !important; height: 100% !important`) with `overflow: hidden` on parent containers.
- **Dynamic Container Bounds**: `InteractiveBlueprintViewer.resize()` measures `containerElem.clientWidth` and `clientHeight` directly instead of relying solely on window resize listeners.
- **Zoom & Coordinate Space**: Expanded minimum zoom limit from `0.1` down to `0.02` to support rendering massive factory blueprints. Computed wheel zoom focal coordinates via CSS-to-backing-store canvas scaling (`scaleX = canvas.width / rect.width`).
- **Recenter Control**: Bound Recenter button via Shapez native `dialog.trackClicks(recenterBtn, () => viewer.recenter())` with `pointerdown` `stopPropagation`.
- **Deserialization Pass Optimization**: Extracted `resolveBpStringMod` and `deserializeBlueprintEntities`. `getBlueprintEntityCount` and `getBlueprintCost` now accept pre-deserialized entity arrays, eliminating redundant deserialization calls per card render and preview initialization.

### 3. Equip Handler & Dialog Lifecycle (`src/ui.js`, `src/preview.js`)
- **Double-Close Crash Fix**: Removed manual `root.hud.parts.dialogs.closeDialog(dialog)` inside preview `equip` signal handlers. Shapez native `internalButtonHandler` fires button signals first and subsequently dispatches `dialog.closeRequested`. Manual teardown caused a second `closeDialog` call, triggering `assert(false, "Tried to destroy dialog twice")`.
- **Hotkey & Clipboard Sync**: Equipped blueprints set `blueprintPlacer.lastBlueprintUsed`, invoke `currentBlueprint.set(blueprint)`, write string via `navigator.clipboard.writeText`, and dispatch `pasteBlueprintRequested` signal to sync native `V` key placement.

### 4. Level & Variant Unlock Progression Gating (`src/ui.js`, `src/preview.js`)
- **Entity & Variant Audit**: Implemented `getLockedEntitiesInBlueprint(root, blueprintInput)` checking `metaBuilding.getIsUnlocked(root)` and `metaBuilding.getAvailableVariants(root)`.
- **Gated UI Signals**: Card and preview dialog EQUIP buttons are visually disabled (`.disabled`, `disabled` attribute, tooltip) when blueprints contain locked buildings or variants.
- **HUD & Hotkey Gate**: Wrapped HUD button, `P` toggle hotkey, and `Ctrl+P` save hotkey behind `isBlueprintsUnlocked()`, checking native `reward_blueprints` level 12 reward state.

### 5. In-Game Menu HUD Grid Layout (`src/styles.js`, `lib/ui.js`)
- **5-Column Grid Explicit Assignment**: Host Shapez SCSS explicitly assigns `.save` to `grid-column: 3` and `.settings` to `grid-column: 4` within a 4-column declared template. Injected `#ingame_HUD_GameMenu { grid-template-columns: 1fr 1fr 1fr 1fr 1fr !important; }` and shifted `.save` to `grid-column: 4 !important` and `.settings` to `grid-column: 5 !important` so slot 3 accommodates the Blueprint Book icon cleanly.

### 6. Native Dialog API Compliance (`docs/shapez_dialog_api.md`)
- **Button Spec Cleanup**: Stripped dead parameter from button specs (`"equip:good:EQUIP"` -> `"equip:good"`). Button label translation keys explicitly mutate `shapez.T.dialogs.buttons[buttonId]`.
- **Live DOM Binding**: Ensured all DOM event listeners and canvas attachments execute after `internalShowDialog(dialog)` initializes `dialog.element`.

---

## [1.0.1] - 2026-07-21

### 1. Keybinding Subsystem Integration (`src/index.js`, `lib/ui.js`)
- **Native Keybinding Priority**: Registered `blueprint_book_save` (`Ctrl+P`) prior to `blueprint_book_toggle` (`P`) to prevent Shapez input mapper prefix matching collision.
- **HUD Keybinding Hints**: Extended `shapez.HUDKeybindingOverlay` to inject custom keybinding hints into bottom-left HUD overlay based on selection state (`anythingSelectedOnMap`).

### 2. Auto-Updater & Welcome Dialog (`src/updater.js`, `src/ui.js`)
- **GitHub / Mod.io Release Checker**: Added `checkForUpdates(currentVersion)` fetching release tags from GitHub API with semver comparison.
- **Version Skipping & Last Seen Cache**: Added `lastSeenVersion` and `skippedVersion` persistence in `BlueprintStore`.

---

## [1.0.0] - 2026-07-15

### Initial Modular Rewrite
- Complete architectural rewrite of KiitikM's original Blueprint Library mod into modular ES modules (`store.js`, `ui.js`, `preview.js`, `styles.js`, `metadata.js`).
