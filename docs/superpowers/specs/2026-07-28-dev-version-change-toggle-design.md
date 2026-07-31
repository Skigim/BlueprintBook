# Design Spec: Dev Version Change Toggle for Smoke Testing

**Date**: 2026-07-28  
**Author**: Antigravity & User  
**Status**: Approved  

---

## 1. Overview

To smoke test issue #4 (and version change migration/welcome dialog behavior) on demand without modifying hardcoded version numbers or corrupting save files, we need a developer toggle. When active in dev builds, this toggle causes the system to treat every game boot as a fresh mod version update, exercising both `BlueprintStore.init()` migration routines and `HUDBlueprintLibrary.checkUpdateOnce()` welcome dialog triggers naturally. In production builds, all dev UI elements and override behaviors are stripped/disabled.

---

## 2. Requirements & Constraints

1. **Dev-Only Visibility**: Dev controls (toolbar button and `window.BlueprintBookDev` global helpers) MUST NOT appear or execute in production runs (`IS_DEV = false`).
2. **Natural Execution**: Enabling the toggle MUST exercise the actual production semver comparison and migration code paths rather than bypassing conditional guards with hardcoded early returns.
3. **Persistence**: The toggle state (`devForceFreshUpdate`) persists in `mod.settings` so that closing and reopening the game while in dev mode maintains the forced update behavior until explicitly turned off.
4. **Seamless Toggle**: Toggling the dev mode OFF restores standard single-version behavior immediately.

---

## 3. Detailed Architecture

### 3.1. Build System & Environment Guard (`package.json`, `src/metadata.js`)

* **`package.json`**:
  * Production script: `"build": "esbuild src/index.js --bundle --outfile=BlueprintLibrary.mod.js --format=iife --define:IS_DEV=false"`
  * Dev script: `"build:dev": "esbuild src/index.js --bundle --outfile=BlueprintLibrary.mod.js --format=iife --define:IS_DEV=true"`
* **`src/metadata.js`**:
  * Add `isDev: false` property to `METADATA`.
  * Add `devForceFreshUpdate: false` to `METADATA.settings`.
* **Helper**:
  * `isDevMode()` returns `(typeof IS_DEV !== "undefined" ? IS_DEV : Boolean(METADATA.isDev))`.

---

### 3.2. Dynamic Active Version Resolution (`src/store.js`, `src/ui.js`)

* **`getActiveVersion(mod)` Helper**:
  ```javascript
  export function getActiveVersion(mod) {
      const baseVersion = (mod && mod.meta && mod.meta.version) ? String(mod.meta.version) : (METADATA.version || "1.0.3");
      const isDev = (typeof IS_DEV !== "undefined" ? IS_DEV : Boolean(METADATA.isDev));
      if (isDev && mod && mod.settings && mod.settings.devForceFreshUpdate) {
          return `${baseVersion}-dev.${Date.now()}`;
      }
      return baseVersion;
  }
  ```
* **Store Init (`src/store.js`)**:
  * Replace static `mod.meta.version` lookup in `BlueprintStore.init()` with `getActiveVersion(mod)`.
  * When `devForceFreshUpdate` is `true`, `mod.settings.migrationVersion` (from previous boot) will not match `currentVersion` (`1.0.3-dev.<timestamp>`), triggering `migrateLegacySettings(...)` and updating `migrationVersion`.

* **Update & Welcome Check (`src/ui.js`)**:
  * In `HUDBlueprintLibrary.checkUpdateOnce()`, determine `currentVersion` via `getActiveVersion(this.mod)`.
  * When `devForceFreshUpdate` is `true`, `lastSeenVersion` will not match `currentVersion`, triggering `showWelcomeDialog("1.0.3")` and updating `lastSeenVersion`.

---

### 3.3. UI Controls & Developer Window Helpers (`src/ui.js`, `src/index.js`)

* **Toolbar Button (`src/ui.js`)**:
  * In `HUDBlueprintLibrary.show()` / `render()`:
    * If `isDevMode()` is `true`:
      * Append a button to toolbar HTML:
        ```html
        <button class="button styledButton bplib-btn-dev-toggle" id="bplib-btn-dev-toggle">
            DEV: Fresh Update [ON/OFF]
        </button>
        ```
      * Clicking the button toggles `mod.settings.devForceFreshUpdate`, calls `BlueprintStore.persist()`, updates button style (`#2e7d32` for ON, `#424242` for OFF), and dispatches a notification.
    * If `isDevMode()` is `false`:
      * Do not render the button or bind any dev listeners.

* **Window Helper (`src/index.js`)**:
  * If `isDevMode()` is `true`:
    * Attach `window.BlueprintBookDev = { toggleDevFreshUpdate(), isDevFreshUpdateEnabled() }`.

---

## 4. Verification Plan

### 4.1. Automated Unit Tests (`npx vitest run`)

1. **`tests/store.test.js`**:
   * Verify `getActiveVersion()` returns dynamic `-dev.<timestamp>` string when `devForceFreshUpdate` is `true` and `IS_DEV` / `isDev` is `true`.
   * Verify `BlueprintStore.init()` executes `migrateLegacySettings` when `devForceFreshUpdate` is `true`.
2. **`tests/ui.test.js`**:
   * Verify `checkUpdateOnce()` triggers `showWelcomeDialog` when `devForceFreshUpdate` is `true`.
   * Verify dev toolbar button is rendered when `isDev` is `true`, and omitted when `isDev` is `false`.
3. **Regression Test Suite**:
   * Verify all 96 existing vitest tests continue to pass.

### 4.2. Build & Smoke Test Verification

1. Run `npm run build:dev` to build dev bundle.
2. Run `npm run build` to build production bundle. Verify file size and clean compilation.
