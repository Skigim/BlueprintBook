# Developer & Technical Changelog

This document provides deep technical details, architectural decisions, and API contract changes in **Blueprint Book** for developers, modders, and contributors.

## [Unreleased]

### 1. Held-Blueprint Save Hotkey Fix (`src/ui.js`)
- **Root Cause**: `handleSaveHotkey()` read exclusively from `massSelector.selectedUids`. Native `mass_selector.js` clears `selectedUids` the instant it dispatches `buildingsSelectedForCopy` (i.e. the moment a blueprint is copied/held), so the natural select → Ctrl+C → Ctrl+P flow always hit an empty selection and silently no-opped.
- **Fix**: `handleSaveHotkey()` now falls back to `root.hud.parts.blueprintPlacer.currentBlueprint.get().entities` when `selectedUids` is empty, preserving the existing mass-selection path when one is active.

### 2. Card Cache Staleness Fix (`src/ui.js`)
- **Root Cause**: `_createBlueprintCard()`'s per-card cache stored `{ entities, cost, lockedEntities }` together, keyed by `id:value`. `lockedEntities` depends on `root.hubGoals.isBuildingUnlocked()`, which changes as the player progresses through the tech tree mid-session — but once cached it was never recomputed, so a card's locked/EQUIP-disabled state froze at whatever it was on first render.
- **Fix**: The cache now stores only `{ entities, cost }` (the expensive, content-derived, session-stable values). `lockedEntities` is recomputed from the cached `entities` on every render.

### 3. Dead `keymapper.emit` Removal (`src/ui.js`)
- **Root Cause**: `equipBlueprint()` had a branch attempting `root.keymapper.emit(...)` / `root.keyMapper.emit(...)` before the real `root.hud.signals.pasteBlueprintRequested.dispatch()` call. Neither `root.keymapper` nor a `.emit()` method exist on shapez's actual `KeyActionMapper` (`shapez_source/src/js/game/key_action_mapper.js`), so the branch was always a no-op. The corresponding unit test asserted against a mock fabricated in the test itself rather than real engine shape, masking the dead code.
- **Fix**: Removed the dead branch; updated the test to assert on `hud.signals.pasteBlueprintRequested.dispatch()`, the actual call path.

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
