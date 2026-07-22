/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the global shapez object before importing ui.js
global.shapez = {
    BaseHUDPart: class {
        constructor(root) {
            this.root = root;
        }
        cleanup() {}
    },
    BlueprintLibraryModLoader: {
        mods: []
    }
};

const { HUDBlueprintLibrary } = await import('../src/ui.js');

vi.mock('../lib/ui.js', () => ({
    createTextAreaFormElement: vi.fn(() => ({
        getValue: () => 'valid-string'
    }))
}));

describe('HUDBlueprintLibrary Hotkeys', () => {
    let mockRoot;
    let hudLibrary;
    let mockBpMod;

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup mock bp-string mod
        mockBpMod = {
            metadata: { id: 'bp-string' },
            constructor: {
                serialize: vi.fn().mockReturnValue('MOCK_SERIALIZED_STRING')
            }
        };
        global.shapez.BlueprintLibraryModLoader.mods = [mockBpMod];

        // Setup mock shapez root object
        mockRoot = {
            app: {},
            hud: {
                parts: {
                    massSelector: {
                        selectedUids: new Set()
                    }
                }
            },
            entityMgr: {
                findByUid: vi.fn(uid => ({ id: uid }))
            }
        };

        hudLibrary = new HUDBlueprintLibrary(mockRoot);
        // Mock openImportDialog
        hudLibrary.openImportDialog = vi.fn();
    });

    afterEach(() => {
        hudLibrary.cleanup();
    });

    it('handles native save hotkey with active selection, serializes and opens import dialog synchronously', () => {
        mockRoot.hud.parts.massSelector.selectedUids = new Set(['entity1', 'entity2']);

        // Directly invoke the handler mapped to the native shapez keybinding
        const result = hudLibrary.handleSaveHotkey();

        expect(result).toBe('stop_propagation');

        expect(mockBpMod.constructor.serialize).toHaveBeenCalledWith([
            { id: 'entity1' },
            { id: 'entity2' }
        ]);

        expect(hudLibrary.openImportDialog).toHaveBeenCalledWith('MOCK_SERIALIZED_STRING');
    });

    it('ignores native save hotkey if there is no active selection', () => {
        // Empty selection
        mockRoot.hud.parts.massSelector.selectedUids = new Set();

        const result = hudLibrary.handleSaveHotkey();

        // Should still stop propagation so the game doesn't trigger default actions for the hotkey
        expect(result).toBe('stop_propagation');

        // shouldn't serialize, shouldn't open dialog
        expect(mockBpMod.constructor.serialize).not.toHaveBeenCalled();
        expect(hudLibrary.openImportDialog).not.toHaveBeenCalled();
    });
    it('handles native toggle hotkey and returns stop_propagation', () => {
        hudLibrary.show = vi.fn(() => { hudLibrary.visible = true; });
        const result = hudLibrary.handleToggleHotkey();
        expect(result).toBe('stop_propagation');
        expect(hudLibrary.show).toHaveBeenCalled();
        expect(hudLibrary.visible).toBe(true);
    });
});

describe('openImportDialog rendering', () => {
    let mockRoot;
    let hudLibrary;
    let mockDialog;
    let mockBlueprintStore;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Mock shapez form and dialog classes
        global.shapez.FormElementInput = class {
            constructor(opts) { this.defaultValue = opts.defaultValue; }
            getValue() { return this.defaultValue || 'Test Val'; }
        };
        global.shapez.DialogWithForm = class {
            constructor(opts) {
                mockDialog = this;
                this.buttonSignals = {
                    ok: {
                        add: vi.fn(cb => { this.okCb = cb; })
                    }
                };
            }
        };

        mockRoot = {
            app: {},
            hud: {
                parts: {
                    dialogs: { internalShowDialog: vi.fn() }
                },
                signals: {
                    notification: { dispatch: vi.fn() }
                }
            }
        };

        const { HUDBlueprintLibrary } = await import('../src/ui.js');
        hudLibrary = new HUDBlueprintLibrary(mockRoot);
        hudLibrary.render = vi.fn();
        
        // Mock BlueprintStore
        const { BlueprintStore } = await import('../src/store.js');
        BlueprintStore.add = vi.fn();
        mockBlueprintStore = BlueprintStore;
    });

    it('saves blueprint and calls render if the Blueprint Book is open (visible = true)', () => {
        hudLibrary.visible = true; // Book is open
        hudLibrary.openImportDialog('test-string');
        
        expect(mockRoot.hud.parts.dialogs.internalShowDialog).toHaveBeenCalled();
        
        // Simulate clicking OK on the import dialog
        mockDialog.okCb();
        
        expect(mockBlueprintStore.add).toHaveBeenCalled();
        // Since visible is true, render should be called to update the grid
        expect(hudLibrary.render).toHaveBeenCalled();
    });

    it('saves blueprint but skips render if the Blueprint Book is closed (visible = false)', () => {
        hudLibrary.visible = false; // Book is closed (bypassed via native hotkey)
        hudLibrary.openImportDialog('test-string');
        
        expect(mockRoot.hud.parts.dialogs.internalShowDialog).toHaveBeenCalled();
        
        // Simulate clicking OK on the import dialog
        mockDialog.okCb();
        
        expect(mockBlueprintStore.add).toHaveBeenCalled();
        // Since visible is false, render should NOT be called to avoid the querySelector crash
        expect(hudLibrary.render).not.toHaveBeenCalled();
    });
});

describe('HUDBlueprintLibrary Update Dialog', () => {
    it('shows update dialog when an update is available', () => {
        const viewOnModIoCbMock = { add: vi.fn() };
        const skipVersionCbMock = { add: vi.fn() };
        const mockDialog = {
            buttonSignals: {
                viewOnModIo: viewOnModIoCbMock,
                skipVersion: skipVersionCbMock,
            }
        };

        global.shapez.Dialog = vi.fn().mockImplementation(function (config) {
            return mockDialog;
        });

        const mockRoot = {
            app: {},
            hud: {
                parts: {
                    dialogs: {
                        internalShowDialog: vi.fn()
                    }
                }
            }
        };

        const hudLibrary = new HUDBlueprintLibrary(mockRoot);
        hudLibrary.showUpdateDialog({
            latestVersion: '1.0.2',
            downloadUrl: 'https://github.com/Skigim/BlueprintBook/releases/latest',
            releaseNotes: 'New feature release'
        });

        expect(global.shapez.Dialog).toHaveBeenCalled();
        expect(mockRoot.hud.parts.dialogs.internalShowDialog).toHaveBeenCalledWith(mockDialog);
    });

    it('shows welcome dialog on first load of version and suppresses it when version is already seen', async () => {
        const { BlueprintStore } = await import('../src/store.js');
        BlueprintStore.init({ settings: {}, saveSettings: () => {} });

        const mockRoot = {
            app: {},
            hud: {
                parts: {
                    dialogs: { internalShowDialog: vi.fn() }
                }
            }
        };

        const hudLibrary1 = new HUDBlueprintLibrary(mockRoot);
        hudLibrary1.showWelcomeDialog = vi.fn();

        // Reset hasCheckedUpdate flag for testing fresh instance
        HUDBlueprintLibrary.hasCheckedUpdate = false;

        // Mock checkForUpdates to return no update
        const updater = await import('../src/updater.js');
        vi.spyOn(updater, 'checkForUpdates').mockResolvedValue({ updateAvailable: false });

        await hudLibrary1.checkUpdateOnce();

        expect(hudLibrary1.showWelcomeDialog).toHaveBeenCalledWith('1.0.2');
        expect(BlueprintStore.getLastSeenVersion()).toBe('1.0.2');

        // Simulate subsequent save load or new game session
        HUDBlueprintLibrary.hasCheckedUpdate = false;
        const hudLibrary2 = new HUDBlueprintLibrary(mockRoot);
        hudLibrary2.showWelcomeDialog = vi.fn();

        await hudLibrary2.checkUpdateOnce();

        // Welcome dialog should NOT be shown again because lastSeenVersion === currentVersion ('1.0.2')
        expect(hudLibrary2.showWelcomeDialog).not.toHaveBeenCalled();
    });
});

describe('Blueprint Book Dialog Scroll & Layout Properties', () => {
    it('defines min-height: 0 and pointer-events: auto on .bplib-grid and pointer-events: auto on .bplib-dialog-content in styles.js', async () => {
        const { CSS } = await import('../src/styles.js');

        // Check CSS rules for .bplib-dialog-content
        expect(CSS).toMatch(/\.bplib-dialog-content\s*\{[^}]*pointer-events:\s*auto;/);

        // Check CSS rules for .bplib-grid
        expect(CSS).toMatch(/\.bplib-grid\s*\{[^}]*min-height:\s*0;/);
        expect(CSS).toMatch(/\.bplib-grid\s*\{[^}]*pointer-events:\s*auto;/);
    });

    it('attaches a wheel event listener to #bplib-grid that calls stopPropagation', async () => {
        const mockDialogElem = document.createElement('div');
        const mockOverlay = document.createElement('div');
        mockOverlay.innerHTML = `
            <div class="bplib-dialog-content">
                <div id="bplib-search"></div>
                <div id="bplib-btn-import"></div>
                <div id="bplib-filter-tags"></div>
                <div id="bplib-grid" class="bplib-grid"></div>
            </div>
        `;

        const mockDialog = {
            dialogElem: mockDialogElem,
            element: mockOverlay,
            trackClicks: vi.fn(),
            closeRequested: { add: vi.fn(), dispatch: vi.fn() }
        };

        global.shapez.Dialog = vi.fn().mockImplementation(function () { return mockDialog; });

        const mockRoot = {
            app: {},
            hud: {
                parts: {
                    dialogs: { internalShowDialog: vi.fn() },
                    blueprintPlacer: { currentBlueprint: { set: vi.fn() } }
                },
                signals: { notification: { dispatch: vi.fn() } }
            }
        };

        const { HUDBlueprintLibrary } = await import('../src/ui.js');
        const hudLibrary = new HUDBlueprintLibrary(mockRoot);
        hudLibrary.render = vi.fn();

        hudLibrary.show();

        const gridElem = mockOverlay.querySelector('#bplib-grid');
        expect(gridElem).not.toBeNull();

        // Dispatch a wheel event and verify stopPropagation is called
        const wheelEvent = new Event('wheel', { bubbles: true, cancelable: true });
        const stopPropagationSpy = vi.spyOn(wheelEvent, 'stopPropagation');

        gridElem.dispatchEvent(wheelEvent);

        expect(stopPropagationSpy).toHaveBeenCalled();
    });
});

