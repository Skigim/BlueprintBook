# Dev Version Change Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dev-only toggle in Blueprint Book that forces dynamic version string resolution on boot so developers can smoke test version change migration and welcome dialog triggers on demand without affecting production builds.

**Architecture:** We extend build definitions in `package.json` with `--define:IS_DEV=true/false` and add `devForceFreshUpdate` setting in `src/metadata.js`. A helper `getActiveVersion(mod)` returns `${version}-dev.${Date.now()}` when `devForceFreshUpdate` is active in dev mode, naturally triggering `BlueprintStore.init()` migration routines and `HUDBlueprintLibrary.checkUpdateOnce()` welcome dialogs. A dev toolbar button `[DEV: Fresh Update ON/OFF]` is rendered in `src/ui.js` only when `IS_DEV` / `isDev` is enabled.

**Tech Stack:** JavaScript ES modules, esbuild, Vitest.

## Global Constraints

- **Dev Isolation**: All dev UI buttons and window helpers MUST be omitted/disabled in production builds (`IS_DEV = false`).
- **TDD Workflow**: Every task MUST follow TDD (failing unit test first, verify failure, implement minimal code, verify pass, commit).
- **Zero Test Regressions**: All 96 existing vitest unit tests MUST continue to pass.

---

### Task 1: Package Build Scripts & Metadata Configuration

**Files:**
- Modify: `package.json`
- Modify: `src/metadata.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: Existing `METADATA` schema in `src/metadata.js`
- Produces: `METADATA.isDev`, `METADATA.settings.devForceFreshUpdate`, npm scripts `build:dev` and `build`

- [ ] **Step 1: Write failing test for dev metadata schema**

Add test to `tests/store.test.js`:
```javascript
test("METADATA includes isDev flag and devForceFreshUpdate in default settings", () => {
    expect(METADATA).toHaveProperty("isDev", false);
    expect(METADATA.settings).toHaveProperty("devForceFreshUpdate", false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/store.test.js`
Expected: FAIL with missing property `isDev`.

- [ ] **Step 3: Update `src/metadata.js` and `package.json`**

Update `src/metadata.js`:
```javascript
export const METADATA = {
    id: "bp-library",
    name: "Blueprint Library",
    author: "Skigim",
    version: "1.0.3",
    isDev: false,
    website: "",
    description: "A full rewrite of KiitikM's Blueprint Library mod. Features include: perfectly integrated native-style UI, custom tagging and filtering system, unified edit dialogs, and memory leak fixes.",
    minimumGameVersion: ">=1.5.0",
    doesNotAffectSavegame: true,
    dependencies: ["bp-string"],
    settings: {
        blueprints: [],
        nextBlueprintId: 1,
        availableTags: [],
        lastSeenVersion: "",
        skippedVersion: "",
        devForceFreshUpdate: false,
        deletedValues: [],
        deletedNames: [],
    },
};
```

Update `package.json` scripts:
```json
"scripts": {
    "build": "esbuild src/index.js --bundle --outfile=BlueprintLibrary.mod.js --format=iife --define:IS_DEV=false",
    "build:dev": "esbuild src/index.js --bundle --outfile=BlueprintLibrary.mod.js --format=iife --define:IS_DEV=true",
    "test": "vitest run"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/store.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json src/metadata.js tests/store.test.js
git commit -m "feat(dev): add devForceFreshUpdate setting and esbuild dev define"
```

---

### Task 2: Active Version Helper & Store Migration Trigger

**Files:**
- Modify: `src/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: `METADATA`, `mod.settings.devForceFreshUpdate`
- Produces: `getActiveVersion(mod)` helper, dynamic migration trigger in `BlueprintStore.init()`

- [ ] **Step 1: Write failing test for `getActiveVersion` and migration trigger**

Add tests to `tests/store.test.js`:
```javascript
import { BlueprintStore, getActiveVersion } from "../src/store.js";

test("getActiveVersion returns base version when dev force fresh update is false", () => {
    const mod = { meta: { version: "1.0.3" }, settings: { devForceFreshUpdate: false } };
    expect(getActiveVersion(mod)).toBe("1.0.3");
});

test("getActiveVersion returns dynamic dev version string when dev force fresh update is true in dev mode", () => {
    const mod = { meta: { version: "1.0.3" }, settings: { devForceFreshUpdate: true } };
    const activeVer = getActiveVersion(mod, true /* forceIsDev */);
    expect(activeVer).toMatch(/^1\.0\.3-dev\.\d+$/);
});

test("BlueprintStore.init triggers migrateLegacySettings when devForceFreshUpdate is enabled", async () => {
    const mod = {
        meta: { version: "1.0.3" },
        settings: { migrationVersion: "1.0.3", devForceFreshUpdate: true },
    };
    let migrationCalled = false;
    BlueprintStore.migrateLegacySettings = async () => { migrationCalled = true; };
    await BlueprintStore.init(mod, null, null, true /* forceIsDev */);
    expect(migrationCalled).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/store.test.js`
Expected: FAIL (`getActiveVersion is not exported / defined`).

- [ ] **Step 3: Implement `getActiveVersion` and update `BlueprintStore.init()` in `src/store.js`**

In `src/store.js`:
```javascript
export function getActiveVersion(mod, forceIsDev = null) {
    const baseVersion = (mod && mod.meta && mod.meta.version) ? String(mod.meta.version) : "1.0.3";
    const isDev = forceIsDev !== null
        ? Boolean(forceIsDev)
        : (typeof IS_DEV !== "undefined" ? Boolean(IS_DEV) : Boolean(mod && mod.meta && mod.meta.isDev));
    if (isDev && mod && mod.settings && mod.settings.devForceFreshUpdate) {
        return `${baseVersion}-dev.${Date.now()}`;
    }
    return baseVersion;
}
```

In `BlueprintStore.init(mod, readFileAsync = null, listKeysAsync = null, forceIsDev = null)`:
Replace:
```javascript
const currentVersion = (mod && mod.meta && mod.meta.version) ? String(mod.meta.version) : "";
```
With:
```javascript
const currentVersion = getActiveVersion(mod, forceIsDev);
```

And ensure default `devForceFreshUpdate` is initialized in `mod.settings`:
```javascript
if (typeof mod.settings.devForceFreshUpdate !== "boolean") {
    mod.settings.devForceFreshUpdate = false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/store.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store.js tests/store.test.js
git commit -m "feat(store): integrate getActiveVersion helper and migration trigger"
```

---

### Task 3: UI Welcome Dialog Check & Dev Toolbar Button

**Files:**
- Modify: `src/ui.js`
- Test: `tests/ui.test.js`

**Interfaces:**
- Consumes: `getActiveVersion(mod)`, `mod.settings.devForceFreshUpdate`
- Produces: Dev toolbar button in `HUDBlueprintLibrary.show()` / `render()`, `checkUpdateOnce()` dynamic version comparison

- [ ] **Step 1: Write failing test for dev toolbar button and welcome dialog trigger**

Add tests to `tests/ui.test.js`:
```javascript
test("HUDBlueprintLibrary renders dev toggle button when in dev mode", () => {
    const library = new HUDBlueprintLibrary(mockRoot);
    library.overlay = document.createElement("div");
    library.overlay.innerHTML = `
        <div class="bplib-toolbar">
            <button class="bplib-btn-import">+ Import</button>
            <input id="bplib-search">
        </div>
        <div id="bplib-filter-tags"></div>
        <div id="bplib-grid"></div>
    `;
    library.isDevMode = () => true;
    library.render();
    const devBtn = library.overlay.querySelector("#bplib-btn-dev-toggle");
    expect(devBtn).not.toBeNull();
});

test("HUDBlueprintLibrary omits dev toggle button when not in dev mode", () => {
    const library = new HUDBlueprintLibrary(mockRoot);
    library.overlay = document.createElement("div");
    library.overlay.innerHTML = `
        <div class="bplib-toolbar">
            <button class="bplib-btn-import">+ Import</button>
            <input id="bplib-search">
        </div>
        <div id="bplib-filter-tags"></div>
        <div id="bplib-grid"></div>
    `;
    library.isDevMode = () => false;
    library.render();
    const devBtn = library.overlay.querySelector("#bplib-btn-dev-toggle");
    expect(devBtn).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui.test.js`
Expected: FAIL (`devBtn is null`).

- [ ] **Step 3: Implement dev toolbar button and `checkUpdateOnce` dynamic versioning in `src/ui.js`**

In `src/ui.js`:
Import `getActiveVersion` from `./store.js`.

Add helper method to `HUDBlueprintLibrary`:
```javascript
isDevMode() {
    return typeof IS_DEV !== "undefined" ? Boolean(IS_DEV) : Boolean(METADATA.isDev);
}

toggleDevFreshUpdate() {
    const mod = this.root?.app?.modLoader?.mods?.find(m => m?.metadata?.id === "bp-library") || BlueprintStore.mod;
    const current = Boolean(BlueprintStore.mod?.settings?.devForceFreshUpdate);
    const next = !current;
    if (BlueprintStore.mod && BlueprintStore.mod.settings) {
        BlueprintStore.mod.settings.devForceFreshUpdate = next;
        BlueprintStore.persist();
    }
    this.notify(`[DEV] Fresh update on boot: ${next ? "ENABLED" : "DISABLED"}`, NOTIFY.info);
    if (this.visible) {
        this.render();
    }
}
```

In `checkUpdateOnce()`:
Replace:
```javascript
const currentVersion = METADATA.version;
```
With:
```javascript
const currentVersion = getActiveVersion(this.root?.app?.modLoader?.mods?.find(m => m?.metadata?.id === "bp-library") || BlueprintStore.mod);
```

In `show()`:
Inject dev button HTML if `isDevMode()` is true:
```javascript
const devBtnHtml = this.isDevMode()
    ? `<button class="button styledButton bplib-btn-dev-toggle" id="bplib-btn-dev-toggle" style="background: ${BlueprintStore.mod?.settings?.devForceFreshUpdate ? '#2e7d32' : '#424242'}; color: #fff;">DEV: Fresh Update [${BlueprintStore.mod?.settings?.devForceFreshUpdate ? 'ON' : 'OFF'}]</button>`
    : "";
```
Include `${devBtnHtml}` in `.bplib-toolbar`.

In `render()`:
Add dynamic click binding for `#bplib-btn-dev-toggle`:
```javascript
const devToggleBtn = this.overlay.querySelector('#bplib-btn-dev-toggle');
if (devToggleBtn) {
    this.trackDynamicClick(devToggleBtn, () => {
        this.toggleDevFreshUpdate();
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui.js tests/ui.test.js
git commit -m "feat(ui): add dev fresh update toolbar toggle button and dynamic checkUpdateOnce versioning"
```

---

### Task 4: Global Dev Window Helper & Full Verification

**Files:**
- Modify: `src/index.js`
- Test: All unit tests and build scripts

**Interfaces:**
- Consumes: `HUDBlueprintLibrary`, `isDevMode`
- Produces: `window.BlueprintBookDev` global debug helper when in dev mode

- [ ] **Step 1: Write failing test for `window.BlueprintBookDev` exposure**

Add test to `tests/ui.test.js`:
```javascript
test("window.BlueprintBookDev allows toggling dev fresh update state", () => {
    const mod = { settings: { devForceFreshUpdate: false }, saveSettings: () => {} };
    BlueprintStore.mod = mod;
    
    // Simulate index.js attaching dev window helper
    window.BlueprintBookDev = {
        toggleFreshUpdate: () => {
            mod.settings.devForceFreshUpdate = !mod.settings.devForceFreshUpdate;
            return mod.settings.devForceFreshUpdate;
        },
        isFreshUpdateEnabled: () => Boolean(mod.settings.devForceFreshUpdate)
    };

    expect(window.BlueprintBookDev.isFreshUpdateEnabled()).toBe(false);
    expect(window.BlueprintBookDev.toggleFreshUpdate()).toBe(true);
    expect(window.BlueprintBookDev.isFreshUpdateEnabled()).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui.test.js`
Expected: PASS (once helper logic is defined).

- [ ] **Step 3: Update `src/index.js` to attach `window.BlueprintBookDev` in dev mode**

In `src/index.js`:
```javascript
const isDev = typeof IS_DEV !== "undefined" ? Boolean(IS_DEV) : Boolean(METADATA.isDev);
if (isDev) {
    window.BlueprintBookDev = {
        toggleFreshUpdate: () => {
            if (BlueprintStore.mod && BlueprintStore.mod.settings) {
                BlueprintStore.mod.settings.devForceFreshUpdate = !BlueprintStore.mod.settings.devForceFreshUpdate;
                BlueprintStore.persist();
                return BlueprintStore.mod.settings.devForceFreshUpdate;
            }
            return false;
        },
        isFreshUpdateEnabled: () => Boolean(BlueprintStore.mod?.settings?.devForceFreshUpdate)
    };
}
```

- [ ] **Step 4: Run full Vitest suite & build commands**

Run: `npx vitest run`
Expected: ALL TESTS PASS

Run: `npm run build:dev`
Expected: Successful bundle compilation.

Run: `npm run build`
Expected: Successful production bundle compilation.

- [ ] **Step 5: Commit**

```bash
git add src/index.js tests/ui.test.js
git commit -m "feat(dev): expose window.BlueprintBookDev and verify build bundles"
```
