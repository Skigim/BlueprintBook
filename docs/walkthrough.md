# Dev Version Change Toggle - Walkthrough & Verification

**Date**: 2026-07-28  
**Target Repository**: `E:\Documents\Projects\Mods\Shapez\BlueprintBook`  
**Status**: Completed & Verified  

---

## 1. Summary of Changes

We implemented a **Dev Version Change Toggle** to enable on-demand smoke testing of version migrations and update welcome dialogs (such as issue #4 from the bugfix run) without hardcoding version numbers or affecting production builds.

### Key Changes:

1. **Build Flags & Environment Definitions (`package.json`, `src/metadata.js`)**:
   - Updated `package.json` scripts:
     - `"build": "esbuild src/index.js --bundle --outfile=BlueprintLibrary.mod.js --format=iife --define:IS_DEV=false"`
     - `"build:dev": "esbuild src/index.js --bundle --outfile=BlueprintLibrary.mod.js --format=iife --define:IS_DEV=true"`
   - Added `isDev: false` and `devForceFreshUpdate: false` to `src/metadata.js`.

2. **Dynamic Version Resolution (`src/store.js`)**:
   - Added `getActiveVersion(mod, forceIsDev)` helper. When `devForceFreshUpdate` is `true` in dev mode, `getActiveVersion` appends `-dev.${Date.now()}`.
   - Updated `BlueprintStore.init()` to resolve `currentVersion` dynamically, triggering `migrateLegacySettings(...)` on every boot when dev fresh update is enabled.

3. **Welcome Dialog Integration & Toolbar Toggle (`src/ui.js`)**:
   - Updated `HUDBlueprintLibrary.checkUpdateOnce()` to resolve active version via `getActiveVersion()`, triggering `showWelcomeDialog()` on every boot when dev fresh update is enabled.
   - In dev mode (`isDevMode() === true`), a `[DEV: Fresh Update ON/OFF]` toolbar button is rendered in the Blueprint Book window. Toggling it updates `devForceFreshUpdate` setting, persists it, and shows a HUD notification.
   - **Production Isolation**: In production builds (`IS_DEV = false`), dev buttons are completely omitted from DOM rendering.

4. **Global Developer Helper (`src/index.js`)**:
   - Attached `window.BlueprintBookDev = { toggleFreshUpdate(), isFreshUpdateEnabled() }` when running in dev mode for console debugging.

---

## 2. Test Verification

### Automated Test Suite (`npx vitest run`)

- **109 / 109 Unit Tests Passed** across 5 test suites:
  - `tests/store.test.js`: 35 tests passed
  - `tests/ui.test.js`: 39 tests passed
  - `tests/preview.test.js`: 22 tests passed
  - `tests/styles.test.js`: 6 tests passed
  - `tests/updater.test.js`: 7 tests passed

### Build Verification

- **Production Build (`npm run build`)**: Generates `BlueprintLibrary.mod.js` (82.6 KB) with `IS_DEV=false` (dev buttons & window helper stripped).
- **Dev Build (`npm run build:dev`)**: Generates `BlueprintLibrary.mod.js` (82.6 KB) with `IS_DEV=true` for smoke testing.
- **Local Deployment**: Successfully deployed built `BlueprintLibrary.mod.js` to `C:\Users\dwigh\AppData\Roaming\shapez.io\mods\BlueprintLibrary.mod.js`.

---

## 3. How to Smoke Test Issue #4

1. Build the dev bundle: `npm run build:dev`
2. Launch Shapez and open Blueprint Book (`P` key).
3. Click the **DEV: Fresh Update [OFF]** button in the toolbar (it will switch to **[ON]** in green).
4. Save and reload the game.
5. On every load, the system will detect a fresh version change, triggering the welcome dialog and legacy settings migration routine as if a new update was installed!
6. Click the toggle again (**[OFF]**) to return to normal single-version behavior.
