# BaseHUDPart Native Conversion Design: HUDBlueprintLibrary

## Overview
This design details the conversion of `HUDBlueprintLibrary` in the **Blueprint Book** mod from a wrapper around `shapez.Dialog` into a native `shapez.BaseHUDPart` overlay panel, matching the exact architecture used by native shapez.io windows such as `HUDStatistics` (`shapez_source/src/js/game/hud/parts/statistics.js`).

## Architecture & Principles

### Native Pattern Alignment
In `shapez.io`, full-featured HUD overlay windows (`HUDStatistics`, `HUDWaypoints`, `HUDResearchOverlay`) extend `shapez.BaseHUDPart` and manage their DOM directly via `shapez.DynamicDomAttach`. 

Instead of dynamically instantiating `new shapez.Dialog(...)` when opened:
1. `HUDBlueprintLibrary` creates its persistent DOM elements during `createElements(parent)`.
2. Uses `shapez.DynamicDomAttach` with class `"visible"` to handle DOM attachment, animations, and visibility toggling.
3. Manages native input focus via `shapez.InputReceiver("blueprintLibrary")` and `shapez.KeyActionMapper`.
4. Secondary transient alerts and form prompts (*Import Blueprint*, *Edit Blueprint*, *Welcome Dialog*, *Update Available*) will continue using `shapez.Dialog` / `shapez.DialogWithForm` to display popups over the HUD part.

---

## Component Specs

### 1. `HUDBlueprintLibrary` (`src/ui.js`)

#### Lifecycle Methods
- `createElements(parent)`:
  - Creates root container `this.background` with classes `["ingame_HUD_BlueprintLibrary", "ingameDialog"]`.
  - Creates `this.dialogInner` with class `["dialogInner"]`.
  - Creates `this.title` element with title `"Blueprint Book"` and native close button `this.closeButton` (`["closeButton"]`).
  - Registers click listener on `this.closeButton` calling `this.close()`.
  - Creates toolbar container (`#bplib-toolbar`), search input (`#bplib-search`), import button (`#bplib-btn-import`), tag filter bar (`#bplib-filter-tags`), and blueprint grid (`#bplib-grid`).
  - Appends `this.background` to `parent.element || parent`.

- `initialize()`:
  - Instantiates `this.domAttach = new shapez.DynamicDomAttach(this.root, this.background, { attachClass: "visible" })`.
  - Sets up `this.inputReceiver = new shapez.InputReceiver("blueprintLibrary")` and `this.keyActionMapper = new shapez.KeyActionMapper(this.root, this.inputReceiver)`.
  - Maps `general.back` and `ingame.menuClose` actions to `this.close()`.
  - Sets initial state `this.visible = false`.
  - Calls `this.close()` and triggers initial update check (`this.checkUpdateOnce()`).

- `show()`:
  - Validates reward unlock status via `this.isBlueprintsUnlocked()`.
  - Sets `this.visible = true`.
  - Attaches input receiver via `this.root.app.inputMgr.makeSureAttachedAndOnTop(this.inputReceiver)`.
  - Calls `this.render()` to populate grid and filter tags.
  - Updates `this.domAttach.update(true)`.

- `close()`:
  - Sets `this.visible = false`.
  - Detaches input receiver via `this.root.app.inputMgr.makeSureDetached(this.inputReceiver)`.
  - Updates `this.domAttach.update(false)`.

- `update()`:
  - Calls `this.domAttach.update(this.visible)`.

- `cleanup()`:
  - Calls `super.cleanup()`.
  - Ensures input receiver is detached.
  - Cleans up dynamic click detectors.

---

## Styling Specs (`src/styles.js`)

Add CSS definitions for `.ingame_HUD_BlueprintLibrary`:
```css
.ingame_HUD_BlueprintLibrary {
    position: absolute;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease-in-out;
}

.ingame_HUD_BlueprintLibrary.visible {
    opacity: 1;
    pointer-events: auto;
}

.ingame_HUD_BlueprintLibrary .dialogInner {
    width: 800px;
    max-width: 90vw;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    background: #1b2836;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    overflow: hidden;
}
```

---

## Verification & Testing Plan

### Automated Unit Tests (`tests/ui.test.js`)
1. **Elements Creation**: Verify `createElements` builds `.ingame_HUD_BlueprintLibrary` and appends to parent container.
2. **Visibility Toggling**: Verify `show()` and `close()` update `this.visible` and toggle `.visible` class via `DynamicDomAttach`.
3. **Input Receiver**: Verify `inputMgr.makeSureAttachedAndOnTop` and `makeSureDetached` are called on `show()` / `close()`.
4. **Hotkey Integrations**: Verify `handleToggleHotkey` toggles HUD part visibility.
5. **Full Suite**: Ensure all 103 existing unit tests pass without regression.

### Manual & Build Verification
1. Run `npx vitest run` to verify all test suites pass.
2. Run `npm run build:dev` and copy bundle to shapez local mod directory.
