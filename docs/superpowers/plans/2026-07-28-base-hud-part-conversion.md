# BaseHUDPart Native Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `HUDBlueprintLibrary` in `src/ui.js` from a `shapez.Dialog` wrapper to a native `shapez.BaseHUDPart` matching `HUDStatistics` architecture, using persistent DOM elements, `shapez.DynamicDomAttach`, `InputReceiver`, and `isBlockingOverlay()`.

**Architecture:** `createElements(parent)` builds a persistent `#ingame_HUD_BlueprintLibrary` container containing `.dialogInner` once at HUD init. `show()` and `close()` toggle visibility via `this.domAttach.update(this.visible)` and attach/detach `InputReceiver`. Static events are bound once in `createElements()`, while dynamic blueprint grid rendering runs safely inside `render()`.

**Tech Stack:** JavaScript (ES6+), shapez.io Mod API (`BaseHUDPart`, `DynamicDomAttach`, `InputReceiver`, `KeyActionMapper`), Vitest, Esbuild.

## Global Constraints
- Target File: `src/ui.js`, `src/styles.js`, `tests/ui.test.js`
- Standard `BaseHUDPart` Methods: `createElements`, `initialize`, `isBlockingOverlay`, `show`, `close`, `update`, `cleanup`
- Overridden `isBlockingOverlay()` must return `this.visible`
- Retain native `.ingameDialog`, `.dialogInner`, `.dialogMods`, `.optionChooserDialog`, `.dialogUpgrades` styling classes
- Preserve all 103 existing unit tests passing cleanly

---

### Task 1: Scoped SCSS / CSS Styling for `#ingame_HUD_BlueprintLibrary`

**Files:**
- Modify: `src/styles.js`
- Test: `tests/styles.test.js`

**Interfaces:**
- Consumes: Existing CSS string export in `src/styles.js`
- Produces: Updated CSS rule for `#ingame_HUD_BlueprintLibrary .dialogInner`

- [ ] **Step 1: Write failing unit test for `#ingame_HUD_BlueprintLibrary` CSS rule**

Add a test in `tests/styles.test.js` verifying `CSS` includes `#ingame_HUD_BlueprintLibrary .dialogInner`:
```javascript
it('includes #ingame_HUD_BlueprintLibrary .dialogInner styles', () => {
    expect(CSS).toContain('#ingame_HUD_BlueprintLibrary .dialogInner');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/styles.test.js`
Expected: FAIL ("#ingame_HUD_BlueprintLibrary .dialogInner" not found in CSS)

- [ ] **Step 3: Update `src/styles.js` with scoped styling**

Add the scoped rules to `CSS` string in `src/styles.js`:
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/styles.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/styles.js tests/styles.test.js
git commit -m "style: add scoped #ingame_HUD_BlueprintLibrary SCSS rule"
```

---

### Task 2: Core BaseHUDPart Lifecycle Implementation in `src/ui.js`

**Files:**
- Modify: `src/ui.js:62-250`
- Test: `tests/ui.test.js`

**Interfaces:**
- Consumes: `shapez.BaseHUDPart`, `shapez.DynamicDomAttach`, `shapez.InputReceiver`, `shapez.KeyActionMapper`
- Produces: Native `HUDBlueprintLibrary` lifecycle (`createElements`, `initialize`, `isBlockingOverlay`, `show`, `close`, `update`, `cleanup`)

- [ ] **Step 1: Write failing unit tests for lifecycle methods and `isBlockingOverlay`**

In `tests/ui.test.js`, add test cases verifying:
```javascript
it('implements BaseHUDPart lifecycle methods and isBlockingOverlay', async () => {
    const { HUDBlueprintLibrary } = await import('../src/ui.js');
    const mockRoot = {
        app: { inputMgr: { makeSureAttachedAndOnTop: vi.fn(), makeSureDetached: vi.fn() } }
    };
    const library = new HUDBlueprintLibrary(mockRoot);
    library.createElements(document.createElement('div'));
    library.initialize();

    expect(library.isBlockingOverlay()).toBe(false);

    library.show();
    expect(library.visible).toBe(true);
    expect(library.isBlockingOverlay()).toBe(true);
    expect(mockRoot.app.inputMgr.makeSureAttachedAndOnTop).toHaveBeenCalled();

    library.close();
    expect(library.visible).toBe(false);
    expect(library.isBlockingOverlay()).toBe(false);
    expect(mockRoot.app.inputMgr.makeSureDetached).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui.test.js`
Expected: FAIL (isBlockingOverlay or lifecycle methods missing/failing)

- [ ] **Step 3: Implement lifecycle methods in `HUDBlueprintLibrary` (`src/ui.js`)**

Refactor `HUDBlueprintLibrary` in `src/ui.js`:
```javascript
export class HUDBlueprintLibrary extends shapez.BaseHUDPart {
    createElements(parent) {
        this.parent = parent;
        this.activeTagFilter = null;
        this.searchQuery = "";

        const makeDiv = (shapez && shapez.makeDiv) || ((p, id, classes, text) => {
            const el = document.createElement("div");
            if (id) el.id = id;
            if (classes && Array.isArray(classes)) classes.forEach(c => el.classList.add(c));
            if (text) el.textContent = text;
            if (p) (p.element || p).appendChild(el);
            return el;
        });

        this.background = makeDiv(parent, "ingame_HUD_BlueprintLibrary", ["ingameDialog"]);
        this.dialogInner = makeDiv(this.background, null, ["dialogInner", "dialogMods", "optionChooserDialog", "dialogUpgrades"]);
        this.title = makeDiv(this.dialogInner, null, ["title"], "Blueprint Book");
        this.closeButton = makeDiv(this.title, null, ["closeButton"]);
        
        if (typeof this.trackClicks === "function") {
            this.trackClicks(this.closeButton, this.close);
        }
        if (typeof this.closeOnBackgroundClick === "function") {
            this.closeOnBackgroundClick(this.background, this.close);
        }

        const toolbar = makeDiv(this.dialogInner, "bplib-toolbar", ["bplib-toolbar"]);
        toolbar.innerHTML = `
            <button class="button styledButton good bplib-btn-import" id="bplib-btn-import">+ Import Blueprint</button>
            <input type="text" class="input-text" placeholder="Search blueprints..." id="bplib-search">
        `;

        this.filterHeader = makeDiv(this.dialogInner, "bplib-filter-tags", ["bplib-filterHeader"]);
        this.gridContainer = makeDiv(this.dialogInner, "bplib-grid", ["bplib-grid"]);

        this.overlay = this.dialogInner;
        this.bindEvents();
    }

    initialize() {
        this.visible = false;
        this.updateDialog = null;
        this.latestUpdateInfo = null;

        if (shapez && shapez.DynamicDomAttach) {
            this.domAttach = new shapez.DynamicDomAttach(this.root, this.background, {
                attachClass: "visible",
            });
        }

        if (shapez && shapez.InputReceiver && shapez.KeyActionMapper) {
            this.inputReceiver = new shapez.InputReceiver("blueprintLibrary");
            this.keyActionMapper = new shapez.KeyActionMapper(this.root, this.inputReceiver);
            if (shapez.KEYMAPPINGS) {
                if (shapez.KEYMAPPINGS.general?.back) {
                    this.keyActionMapper.getBinding(shapez.KEYMAPPINGS.general.back).add(this.close, this);
                }
                if (shapez.KEYMAPPINGS.ingame?.menuClose) {
                    this.keyActionMapper.getBinding(shapez.KEYMAPPINGS.ingame.menuClose).add(this.close, this);
                }
            }
        }

        registerNativeChangelogEntry();
        this.close();
        this.checkUpdateOnce();
    }

    isBlockingOverlay() {
        return Boolean(this.visible);
    }

    show() {
        if (!this.isBlueprintsUnlocked()) {
            this.showBlueprintsNotUnlocked();
            return;
        }

        this.visible = true;
        if (this.root?.app?.inputMgr && this.inputReceiver) {
            this.root.app.inputMgr.makeSureAttachedAndOnTop(this.inputReceiver);
        }

        this.render();
        this.update();
    }

    close() {
        this.visible = false;
        if (this.root?.app?.inputMgr && this.inputReceiver) {
            this.root.app.inputMgr.makeSureDetached(this.inputReceiver);
        }
        this.update();
    }

    update() {
        if (this.domAttach) {
            this.domAttach.update(this.visible);
        }
    }

    cleanup() {
        if (super.cleanup) super.cleanup();
        if (this.root?.app?.inputMgr && this.inputReceiver) {
            this.root.app.inputMgr.makeSureDetached(this.inputReceiver);
        }
        this.cleanupDynamicClickDetectors();
        this.visible = false;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui.js tests/ui.test.js
git commit -m "feat(ui): implement BaseHUDPart lifecycle methods and isBlockingOverlay"
```

---

### Task 3: Refactor Persistent DOM Interactions & Event Handlers in `src/ui.js`

**Files:**
- Modify: `src/ui.js:70-450`
- Test: `tests/ui.test.js`

**Interfaces:**
- Consumes: Persistent `this.background` / `this.dialogInner`
- Produces: Refactored `bindEvents()`, `render()`, `handleToggleHotkey()` operating cleanly on persistent DOM without recreating dialog popups.

- [ ] **Step 1: Write failing unit test for open-close-reopen persistent DOM interactions**

In `tests/ui.test.js`, add test:
```javascript
it('handles open -> search/filter -> close -> reopen cleanly on persistent DOM', async () => {
    hudLibrary.show();
    expect(hudLibrary.visible).toBe(true);

    const searchInput = hudLibrary.overlay.querySelector('#bplib-search');
    searchInput.value = 'test search';
    searchInput.dispatchEvent(new Event('input'));
    expect(hudLibrary.searchQuery).toBe('test search');

    hudLibrary.close();
    expect(hudLibrary.visible).toBe(false);

    hudLibrary.show();
    expect(hudLibrary.visible).toBe(true);
    expect(hudLibrary.searchQuery).toBe('test search');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui.test.js`
Expected: FAIL

- [ ] **Step 3: Update `bindEvents()`, `render()`, and `handleToggleHotkey()` in `src/ui.js`**

Ensure `bindEvents()` attaches static listeners to search input, import button, and scroll wheel once during `createElements()`. Ensure `handleToggleHotkey()` checks `this.visible` to call `this.close()` or `this.show()`. Ensure `render()` calls `this.cleanupDynamicClickDetectors()` before appending new cards.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui.js tests/ui.test.js
git commit -m "refactor(ui): update persistent DOM event handlers and toggle hotkey"
```

---

### Task 4: Complete Test Suite Verification, Dev Build & Local Deployment

**Files:**
- Modify: `tests/ui.test.js`
- Output: `BlueprintLibrary.mod.js`

**Interfaces:**
- Consumes: Entire test suite, Esbuild build script
- Produces: Passing test suite (103+ tests), compiled dev bundle deployed to local shapez mod folder.

- [ ] **Step 1: Run full Vitest test suite**

Run: `npm run test`
Expected: All test files pass cleanly (103+ tests).

- [ ] **Step 2: Build dev bundle and copy to local mods directory**

Run: `npm run build:dev; Copy-Item BlueprintLibrary.mod.js C:\Users\dwigh\AppData\Roaming\shapez.io\mods\BlueprintLibrary.mod.js -Force`
Expected: Success (`BlueprintLibrary.mod.js` built and copied).

- [ ] **Step 3: Commit final updates**

```bash
git add -A
git commit -m "feat(ui): complete BaseHUDPart native conversion for BlueprintBook"
```
