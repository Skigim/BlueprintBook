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
    FormElementInput: class {
        constructor(opts) {
            Object.assign(this, opts);
        }
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

    it('defines grid-column: 2 / 3 for .bplib-upgrade-actions matching 2-column grid layout in styles.js', async () => {
        const { CSS } = await import('../src/styles.js');

        expect(CSS).toMatch(/\.bplib-upgrade\s*\{[^}]*grid-template-columns:\s*1fr\s+auto;/);
        expect(CSS).toMatch(/\.bplib-upgrade\s+\.bplib-upgrade-actions\s*\{[^}]*grid-column:\s*2\s*\/\s*3;/);
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

    it('adds dialogUpgrades class to dialog.dialogElem when show() is called', async () => {
        const mockDialogElem = document.createElement('div');
        const mockOverlay = document.createElement('div');
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
                    dialogs: { internalShowDialog: vi.fn() }
                }
            }
        };

        const { HUDBlueprintLibrary } = await import('../src/ui.js');
        const hudLibrary = new HUDBlueprintLibrary(mockRoot);
        hudLibrary.render = vi.fn();

        hudLibrary.show();

        expect(mockDialogElem.classList.contains('dialogUpgrades')).toBe(true);
    });
});

describe('Task 1: Blueprint Book Lockout Prevention Specs', () => {
    let mockRoot;
    let hudLibrary;

    beforeEach(async () => {
        vi.clearAllMocks();

        global.shapez.FormElementInput = class {
            constructor(opts) {
                Object.assign(this, opts);
            }
        };

        mockRoot = {
            app: {},
            hud: {
                parts: {
                    dialogs: {
                        internalShowDialog: vi.fn(),
                        closeDialog: vi.fn()
                    },
                    blueprintPlacer: {
                        currentBlueprint: { set: vi.fn() }
                    }
                },
                signals: {
                    notification: { dispatch: vi.fn() },
                    pasteBlueprintRequested: { dispatch: vi.fn() }
                }
            }
        };

        const { HUDBlueprintLibrary } = await import('../src/ui.js');
        hudLibrary = new HUDBlueprintLibrary(mockRoot);
        hudLibrary.registerClickDetector = vi.fn();
    });

    it('resets visible to false and cleans up dialog when equipBlueprint is called', () => {
        let mockDialogInstance;
        global.shapez.Dialog = class {
            constructor(opts) {
                const elem = document.createElement('div');
                elem.innerHTML = opts.contentHTML || opts.content || '';
                this.dialogElem = elem;
                this.element = elem;
                this.trackClicks = vi.fn();
                this.closeRequested = { add: vi.fn(), dispatch: vi.fn() };
                mockDialogInstance = this;
            }
        };
        global.shapez.ClickDetector = class { constructor() { this.click = { add: vi.fn() }; } };
        global.shapez.Blueprint = class { constructor(e) {} };
        global.shapez.BlueprintLibraryModLoader = {
            mods: [{
                metadata: { id: 'bp-string' },
                constructor: { deserialize: () => [{ uid: 1 }] }
            }]
        };

        hudLibrary.show();
        expect(hudLibrary.visible).toBe(true);

        hudLibrary.equipBlueprint('VALID_BP_STRING');

        expect(mockRoot.hud.parts.dialogs.closeDialog).toHaveBeenCalledWith(mockDialogInstance);
        expect(hudLibrary.visible).toBe(false);
        expect(hudLibrary.dialog).toBeNull();
    });

    it('removes summary badge and BP tier badge entirely from card, and styles PREVIEW button natively', () => {
        const bp = { id: 'bp_1', name: 'Test BP', value: 'VALID_BP_STRING', tags: ['mining'] };
        const card = hudLibrary._createBlueprintCard(bp, () => {});

        // Summary badge and BP tier badge should be completely removed
        const summaryBadge = card.querySelector('.bplib-summary-badge');
        expect(summaryBadge).toBeNull();

        const tierBadge = card.querySelector('.tier');
        expect(tierBadge).toBeNull();

        // PREVIEW button should carry native Shapez button classes
        const previewBtn = card.querySelector('.bplib-btn-preview');
        expect(previewBtn).not.toBeNull();
        expect(previewBtn.classList.contains('button')).toBe(true);
        expect(previewBtn.classList.contains('styledButton')).toBe(true);
    });

    it('renders search input with native input-text class and configures import dialog with defaultValue "" and closeButton false', () => {
        hudLibrary.show();
        const searchInput = hudLibrary.overlay.querySelector('#bplib-search');
        expect(searchInput.classList.contains('input-text')).toBe(true);

        let capturedFormOpts = null;
        global.shapez.DialogWithForm = vi.fn().mockImplementation(function (opts) {
            capturedFormOpts = opts;
            this.element = document.createElement('div');
            this.closeRequested = { add: vi.fn() };
            return this;
        });

        hudLibrary.openImportDialog();
        expect(capturedFormOpts).not.toBeNull();
        expect(capturedFormOpts.closeButton).toBe(false);
        const nameFormElem = capturedFormOpts.formElements.find(e => e.id === 'name');
        expect(nameFormElem).toBeDefined();
        expect(nameFormElem.defaultValue).toBe('');
    });
});

describe('Task 2: Card className Specs', () => {
    let mockRoot;
    let hudLibrary;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockRoot = {
            app: {},
            hud: {
                parts: {
                    dialogs: { internalShowDialog: vi.fn(), closeDialog: vi.fn() },
                    blueprintPlacer: { currentBlueprint: { set: vi.fn() } }
                },
                signals: { notification: { dispatch: vi.fn(), pasteBlueprintRequested: { dispatch: vi.fn() } } }
            }
        };

        const { HUDBlueprintLibrary } = await import('../src/ui.js');
        hudLibrary = new HUDBlueprintLibrary(mockRoot);
    });

    it('sets card className to "bplib-upgrade shopCard"', () => {
        const bp = { id: 'bp_1', name: 'Test BP', value: 'VALID_BP_STRING', tags: ['mining'] };
        const card = hudLibrary._createBlueprintCard(bp, () => {});
        expect(card.classList.contains('bplib-upgrade')).toBe(true);
        expect(card.classList.contains('shopCard')).toBe(true);
    });
});

describe('Reward-Based Blueprint Unlock Gating', () => {
    let mockRoot;
    let hudLibrary;
    let showInfoSpy;

    beforeEach(async () => {
        vi.clearAllMocks();
        showInfoSpy = vi.fn();

        mockRoot = {
            app: {},
            hubGoals: {
                isRewardUnlocked: vi.fn()
            },
            hud: {
                parts: {
                    dialogs: { showInfo: showInfoSpy, internalShowDialog: vi.fn(), closeDialog: vi.fn() },
                    massSelector: { selectedUids: new Set(['uid1', 'uid2']) }
                },
                signals: { notification: { dispatch: vi.fn() } }
            },
            entityMgr: { findByUid: vi.fn(uid => ({ id: uid })) }
        };

        const { HUDBlueprintLibrary } = await import('../src/ui.js');
        hudLibrary = new HUDBlueprintLibrary(mockRoot);
        hudLibrary.registerClickDetector = vi.fn();
        hudLibrary.initialize();
    });

    it('blocks show() before level 12 and displays blueprintsNotUnlocked dialog', () => {
        mockRoot.hubGoals.isRewardUnlocked.mockReturnValue(false);

        hudLibrary.show();

        expect(showInfoSpy).toHaveBeenCalled();
        expect(hudLibrary.visible).toBe(false);
        expect(hudLibrary.dialog).toBeFalsy();
    });

    it('allows show() after level 12 unlock', () => {
        mockRoot.hubGoals.isRewardUnlocked.mockReturnValue(true);

        hudLibrary.show();

        expect(showInfoSpy).not.toHaveBeenCalled();
        expect(hudLibrary.visible).toBe(true);
        expect(hudLibrary.dialog).not.toBeNull();
    });

    it('blocks handleSaveHotkey() before level 12 and displays blueprintsNotUnlocked dialog', () => {
        mockRoot.hubGoals.isRewardUnlocked.mockReturnValue(false);

        const result = hudLibrary.handleSaveHotkey();

        expect(result).toBe('stop_propagation');
        expect(showInfoSpy).toHaveBeenCalled();
    });

    it('blocks equipBlueprint() before level 12 and displays blueprintsNotUnlocked dialog', () => {
        mockRoot.hubGoals.isRewardUnlocked.mockReturnValue(false);

        hudLibrary.equipBlueprint('VALID_BP_STRING');

        expect(showInfoSpy).toHaveBeenCalled();
    });
});


