# BaseHUDPart Native Conversion Design: HUDBlueprintLibrary

## Overview
This design details the conversion of `HUDBlueprintLibrary` in the **Blueprint Book** mod from a wrapper around `shapez.Dialog` into a native `shapez.BaseHUDPart` overlay panel, matching the exact architecture used by native shapez.io windows such as `HUDStatistics` (`shapez_source/src/js/game/hud/parts/statistics.js`).

## Architecture & Principles

### 1. Native Pattern Alignment
In `shapez.io`, full-featured HUD overlay windows (`HUDStatistics`, `HUDWaypoints`, `HUDResearchOverlay`) extend `shapez.BaseHUDPart` and manage their DOM directly via `shapez.DynamicDomAttach`. 

Instead of dynamically instantiating `new shapez.Dialog(...)` on demand (which created and destroyed transient DOM trees):
1. `HUDBlueprintLibrary` creates a persistent DOM tree during `createElements(parent)`.
2. Uses `shapez.DynamicDomAttach` with class `"visible"` to handle DOM attachment, native entry animations, and visibility toggling (`appendChild` / `removeChild`).
3. Inherits native modal chrome from `.ingameDialog` and uses `this.closeOnBackgroundClick(this.background, this.close)` for background backdrop dismissal.
4. Overrides `isBlockingOverlay()` (`return this.visible;`) so that `hud.hasBlockingOverlayOpen()` correctly suppresses underlying game world interaction (building placement, movement, hotkeys) while open.
5. Manages native input focus via `shapez.InputReceiver("blueprintLibrary")` and `shapez.KeyActionMapper`.
6. Secondary transient alerts and form prompts (*Import Blueprint*, *Edit Blueprint*, *Welcome Dialog*, *Update Available*) continue using `shapez.Dialog` / `shapez.DialogWithForm` to display popups on top of the HUD part.

### 2. Persistent DOM Lifetime Model (Refactoring Blast Radius)
Moving from transient dialogs to a persistent `BaseHUDPart` changes the underlying DOM assumption:
- **Old Model**: `this.show()` instantiated `new shapez.Dialog(...)` every time, destroying and recreating nodes. `this.overlay` was dynamically resolved via `this.dialog.element || document.querySelector(".ingameDialog:last-child")`.
- **New Model**: `createElements()` runs **once** when the HUD initializes. `this.dialogInner` (and `this.background`) are persistent DOM references stored on the instance (`this.overlay = this.dialogInner`).
- **DOM Method Audit**:
  - `bindEvents()`: Binds event listeners on static elements (**search input**, **import button**, **close button**, **grid scroll**) **once** during `createElements()`.
  - `render()`: Re-populates dynamic card nodes (`.bplib-grid`) and tag filter pills (`#bplib-filter-tags`) inside the persistent container. `cleanupDynamicClickDetectors()` is invoked prior to re-rendering cards to prevent duplicate event listener leaks across open/close/re-open cycles.
  - `searchQuery` and `activeTagFilter`: Retained across open/close cycles so players do not lose their search context upon reopening.
  - Native Dialog CSS Parity: `.dialogInner` retains `dialogMods`, `optionChooserDialog`, and `dialogUpgrades` styling classes for visual consistency with native dialogs.

---

## Component Specs

### `HUDBlueprintLibrary` (`src/ui.js`)

#### Lifecycle Methods & APIs
- `createElements(parent)`:
  - Creates root container `this.background = makeDiv(parent, "ingame_HUD_BlueprintLibrary", ["ingameDialog"])`.
  - Creates `this.dialogInner = makeDiv(this.background, null, ["dialogInner", "dialogMods", "optionChooserDialog", "dialogUpgrades"])`.
  - Creates `this.title = makeDiv(this.dialogInner, null, ["title"], "Blueprint Book")`.
  - Creates `this.closeButton = makeDiv(this.title, null, ["closeButton"])`.
  - Calls `this.trackClicks(this.closeButton, this.close)`.
  - Calls `this.closeOnBackgroundClick(this.background, this.close)` to enable backdrop click dismissal natively.
  - Builds static layout inside `this.dialogInner`:
    - Toolbar container (`#bplib-toolbar`)
    - Search input (`#bplib-search`)
    - Import button (`#bplib-btn-import`)
    - Update notice button (`#bplib-btn-update`)
    - Tag filter container (`#bplib-filter-tags`)
    - Grid container (`#bplib-grid`)
  - Sets `this.overlay = this.dialogInner`.
  - Appends `this.background` to `parent.element || parent`.
  - Binds static event listeners (**search input `input` event**, **grid `wheel` event**, **import button click**).

- `initialize()`:
  - Instantiates `this.domAttach = new shapez.DynamicDomAttach(this.root, this.background, { attachClass: "visible" })`.
  - Sets up `this.inputReceiver = new shapez.InputReceiver("blueprintLibrary")`.
  - Sets up `this.keyActionMapper = new shapez.KeyActionMapper(this.root, this.inputReceiver)`.
  - Maps `KEYMAPPINGS.general.back` and `KEYMAPPINGS.ingame.menuClose` to `this.close`.
  - Sets initial state `this.visible = false`.
  - Calls `this.close()` and triggers initial update check (`this.checkUpdateOnce()`).

- `handleToggleHotkey()`:
  - Toggles HUD part state: if `this.visible` is `true`, calls `this.close()`; if `false`, calls `this.show()`.

- `isBlockingOverlay()`:
  - Returns `this.visible;` (Required by `hud.hasBlockingOverlayOpen()` to suppress background game interaction).

- `show()`:
  - Validates reward unlock status via `this.isBlueprintsUnlocked()`.
  - Sets `this.visible = true`.
  - Attaches input receiver via `this.root.app.inputMgr.makeSureAttachedAndOnTop(this.inputReceiver)`.
  - Calls `this.render()` to populate cards and filters.
  - Calls `this.domAttach.update(true)`.

- `close()`:
  - Sets `this.visible = false`.
  - Detaches input receiver via `this.root.app.inputMgr.makeSureDetached(this.inputReceiver)`.
  - Calls `this.domAttach.update(false)`.

- `update()`:
  - Calls `this.domAttach.update(this.visible)`.

- `cleanup()`:
  - Calls `super.cleanup()`.
  - Ensures input receiver is detached (`makeSureDetached`).
  - Cleans up dynamic click detectors via `cleanupDynamicClickDetectors()`.

---

## Styling Specs (`src/styles.js`)

Mirroring `#ingame_HUD_Statistics`, custom rules scope only mod-specific `.dialogInner` dimensions and styling under `#ingame_HUD_BlueprintLibrary` (letting native `.ingameDialog` handle container positioning, background tinting, and keyframe animations):

```css
#ingame_HUD_BlueprintLibrary .dialogInner {
    width: 840px;
    max-width: 90vw;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    background: #1b2836;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    backdrop-filter: blur(4px);
}
```

---

## Verification & Testing Plan

### Automated Unit Tests (`tests/ui.test.js`)
1. **Persistent Elements Creation**: Verify `createElements` builds `#ingame_HUD_BlueprintLibrary` ONCE at HUD init.
2. **`isBlockingOverlay` Verification**: Verify `isBlockingOverlay()` returns `true` when `visible` is `true`, and `false` when `visible` is `false`.
3. **Visibility Toggling**: Verify `show()` and `close()` update `this.visible` and toggle `.visible` class via `DynamicDomAttach`.
4. **Input Receiver & Keybindings**: Verify `inputMgr.makeSureAttachedAndOnTop` and `makeSureDetached` are called on `show()` / `close()`, and `handleToggleHotkey` toggles state.
5. **Open → Close → Reopen Cycle**: Verify opening, performing search/tag filter, closing, and reopening operates cleanly against persistent DOM without leaking click detectors or failing element queries.
6. **Full Test Suite**: Ensure all existing unit tests pass without regression.

### Manual & Build Verification
1. Run `npx vitest run` to verify all test suites pass.
2. Run `npm run build:dev` and deploy bundle to local shapez mods directory.
