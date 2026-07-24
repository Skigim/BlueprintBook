# Developer & Technical Changelog

This document provides deep technical details, architectural decisions, and API contract changes in **Blueprint Book** for developers, modders, and contributors.

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
- **Zoom & Coordinate Space**: Expanded minimum zoom limit from `0.1` down to `0.02` to support rendering massive factory blueprints. Computed drag and wheel coordinates via DPR canvas aspect ratios (`scaleX = canvas.width / rect.width`).
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
