/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// index.js registers its mod class with the host via window.$shapez_registerMod at import
// time, and (through its ui.js / lib/ui.js imports) touches several shapez members at
// module-evaluation time too - mirror the global mock ui.test.js already establishes for
// those same imports.
global.shapez = {
    Mod: class {},
    BaseHUDPart: class {
        constructor(root) {
            this.root = root;
        }
        cleanup() {}
    },
    FormElementInput: class {},
    ClickDetector: class {},
    BlueprintLibraryModLoader: { mods: [] },
    CHANGELOG: [],
    enumNotificationType: { info: "info", warning: "warning", error: "error", success: "success" },
    enumHubGoalRewards: { reward_blueprints: "reward_blueprints" },
    makeDiv: (p, id, classes, text) => {
        const el = document.createElement("div");
        if (id) el.id = id;
        if (classes && Array.isArray(classes)) classes.forEach(c => el.classList.add(c));
        if (text) el.textContent = text;
        if (p) (p.element || p).appendChild(el);
        return el;
    },
    DynamicDomAttach: class {},
    InputReceiver: class {},
    KeyActionMapper: class {},
    T: { dialogs: {} },
    HUDGameMenu: class {},
    HUDKeybindingOverlay: class {},
    // Storage backends: real classes so a regression (accidentally constructing/initializing
    // them from mod.init() again) is actually detectable via the constructor spies below,
    // instead of these calls silently no-oping against undefined.
    StorageImplElectron: class {
        constructor(app) {
            global.__electronCtorSpy?.(app);
        }
        async initialize() {}
    },
    StorageImplBrowserIndexedDB: class {
        constructor(app) {
            global.__idbCtorSpy?.(app);
        }
        async initialize() {}
    },
};

vi.mock('../src/updater.js', () => ({
    checkForUpdates: vi.fn().mockResolvedValue({ updateAvailable: false })
}));

vi.mock('../src/migrationScan.js', () => ({
    runDeferredMigrationScan: vi.fn().mockResolvedValue(undefined)
}));

global.window = global.window || {};
window.$shapez_registerMod = vi.fn();

const { runDeferredMigrationScan } = await import('../src/migrationScan.js');
await import('../src/index.js');

// Captured once, right after the module-scope registration call fires (before any test's
// vi.clearAllMocks() wipes window.$shapez_registerMod's call history).
const registeredModClass = window.$shapez_registerMod.mock.calls[0]?.[0];

describe('BlueprintLibraryMod.init()', () => {
    let mod;

    beforeEach(() => {
        vi.clearAllMocks();
        global.__electronCtorSpy = vi.fn();
        global.__idbCtorSpy = vi.fn();

        mod = new registeredModClass();
        mod.app = {};
        mod.modLoader = { mods: [] };
        mod.settings = {};
        mod.saveSettings = vi.fn();
        mod.modInterface = {
            registerCss: vi.fn(),
            registerHudElement: vi.fn(),
            registerIngameKeybinding: vi.fn(),
            extendClass: vi.fn(),
        };
    });

    it('registers a mod class with the host via window.$shapez_registerMod at import time', () => {
        expect(typeof registeredModClass).toBe('function');
        expect(mod).toBeInstanceOf(registeredModClass);
    });

    it('runs cheap settings normalization synchronously without constructing or initializing any storage backend', async () => {
        await mod.init();

        expect(mod.settings.blueprints).toEqual([]);
        expect(mod.settings.availableTags).toEqual([]);
        expect(mod.settings.nextBlueprintId).toBe(1);

        expect(global.__electronCtorSpy).not.toHaveBeenCalled();
        expect(global.__idbCtorSpy).not.toHaveBeenCalled();
    });

    it('does not trigger the deferred legacy migration scan itself', async () => {
        await mod.init();

        expect(runDeferredMigrationScan).not.toHaveBeenCalled();
    });

    it('registers CSS, the blueprintLibrary HUD element, and both native keybindings', async () => {
        await mod.init();

        expect(mod.modInterface.registerCss).toHaveBeenCalledTimes(1);
        expect(mod.modInterface.registerHudElement).toHaveBeenCalledWith('blueprintLibrary', expect.any(Function));
        expect(mod.modInterface.registerIngameKeybinding).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'blueprint_book_save' })
        );
        expect(mod.modInterface.registerIngameKeybinding).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'blueprint_book_toggle' })
        );
    });

    it('exposes mod.modLoader on shapez.BlueprintLibraryModLoader', async () => {
        const fakeModLoader = { mods: ['fake-loader'] };
        mod.modLoader = fakeModLoader;

        await mod.init();

        expect(global.shapez.BlueprintLibraryModLoader).toBe(fakeModLoader);
    });
});
