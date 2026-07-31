/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the global shapez object before importing ui.js
global.shapez = {
    Mod: class {},
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
    ClickDetector: class {
        constructor(element, opts) {
            this.element = element;
            this.click = { add: (handler, receiver) => { element.addEventListener('click', (e) => handler.call(receiver, e)); } };
        }
        cleanup() {}
    },
    BlueprintLibraryModLoader: {
        mods: []
    }
};

vi.mock('../src/updater.js', () => ({
    checkForUpdates: vi.fn().mockResolvedValue({ updateAvailable: false })
}));

const { HUDBlueprintLibrary, isBlueprintsUnlocked, registerNativeChangelogEntry } = await import('../src/ui.js');
const { METADATA } = await import('../src/metadata.js');

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

        await hudLibrary1.checkUpdateOnce();

        expect(hudLibrary1.showWelcomeDialog).toHaveBeenCalledWith(METADATA.version);
        expect(BlueprintStore.getLastSeenVersion()).toBe(METADATA.version);

        // Simulate subsequent save load or new game session
        HUDBlueprintLibrary.hasCheckedUpdate = false;
        const hudLibrary2 = new HUDBlueprintLibrary(mockRoot);
        hudLibrary2.showWelcomeDialog = vi.fn();

        await hudLibrary2.checkUpdateOnce();

        // Welcome dialog should NOT be shown again because lastSeenVersion === currentVersion
        expect(hudLibrary2.showWelcomeDialog).not.toHaveBeenCalled();
    });

    it('toggles update dialog open and closed on demand with toggleUpdateDialog()', async () => {
        const mockDialog = {
            dialogElem: document.createElement('div'),
            buttonSignals: {},
            closeRequested: { add: vi.fn(), dispatch: vi.fn() }
        };
        const mockRoot = {
            app: {},
            hud: {
                parts: {
                    dialogs: {
                        internalShowDialog: vi.fn(),
                        closeDialog: vi.fn()
                    }
                }
            }
        };

        const hudLibrary = new HUDBlueprintLibrary(mockRoot);
        hudLibrary.latestUpdateInfo = { latestVersion: '2.0.0', downloadUrl: 'https://example.com', releaseNotes: 'Major update', updateAvailable: true };

        // 1. First call opens the dialog
        global.shapez.Dialog = vi.fn().mockImplementation(function() { return mockDialog; });
        await hudLibrary.toggleUpdateDialog();

        expect(mockRoot.hud.parts.dialogs.internalShowDialog).toHaveBeenCalledWith(mockDialog);
        expect(hudLibrary.updateDialog).toBe(mockDialog);

        // 2. Second call closes the dialog
        await hudLibrary.toggleUpdateDialog();
        expect(mockRoot.hud.parts.dialogs.closeDialog).toHaveBeenCalledWith(mockDialog);
        expect(hudLibrary.updateDialog).toBeNull();
    });

    it('renders update button in toolbar when update is available and toggles dialog on click', async () => {
        const mockOverlay = document.createElement('div');
        mockOverlay.innerHTML = `
            <div class="bplib-dialog-content">
                <div class="bplib-toolbar">
                    <button class="button styledButton good bplib-btn-import" id="bplib-btn-import">+ Import Blueprint</button>
                    <button class="button styledButton bplib-btn-update" id="bplib-btn-update">Update (v2.0.0)</button>
                    <input type="text" class="input-text" id="bplib-search">
                </div>
                <div id="bplib-filter-tags"></div>
                <div id="bplib-grid" class="bplib-grid"></div>
            </div>
        `;
        const mockDialog = {
            dialogElem: document.createElement('div'),
            element: mockOverlay,
            buttonSignals: {},
            trackClicks: vi.fn(),
            closeRequested: { add: vi.fn(), dispatch: vi.fn() }
        };
        const mockRoot = {
            app: {},
            hud: {
                parts: {
                    dialogs: {
                        internalShowDialog: vi.fn(),
                        closeDialog: vi.fn()
                    }
                }
            }
        };

        const hudLibrary = new HUDBlueprintLibrary(mockRoot);
        hudLibrary.latestUpdateInfo = { latestVersion: '2.0.0', downloadUrl: 'https://example.com', releaseNotes: 'Major update', updateAvailable: true };
        hudLibrary.toggleUpdateDialog = vi.fn();

        global.shapez.Dialog = vi.fn().mockImplementation(function() { return mockDialog; });
        hudLibrary.show();

        const updateBtn = hudLibrary.overlay.querySelector('#bplib-btn-update');
        expect(updateBtn).not.toBeNull();
        expect(updateBtn.textContent).toContain('Update (v2.0.0)');

        updateBtn.click();
        expect(hudLibrary.toggleUpdateDialog).toHaveBeenCalled();
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
        hudLibrary.createElements(document.createElement('div'));
        hudLibrary.render = vi.fn();

        hudLibrary.show();

        const gridElem = hudLibrary.overlay.querySelector('#bplib-grid');
        expect(gridElem).not.toBeNull();

        // Dispatch a wheel event and verify stopPropagation is called
        const wheelEvent = new Event('wheel', { bubbles: true, cancelable: true });
        const stopPropagationSpy = vi.spyOn(wheelEvent, 'stopPropagation');

        gridElem.dispatchEvent(wheelEvent);

        expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('adds dialogUpgrades class to dialogInner when createElements() is called', async () => {
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
        hudLibrary.createElements(document.createElement('div'));

        expect(hudLibrary.dialogInner.classList.contains('dialogUpgrades')).toBe(true);
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
        hudLibrary.createElements(document.createElement('div'));
        hudLibrary.registerClickDetector = vi.fn();
    });

    it('resets visible to false when equipBlueprint is called', async () => {
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

        await hudLibrary.equipBlueprint('VALID_BP_STRING');

        expect(hudLibrary.visible).toBe(false);
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

    it('blocks equipBlueprint() before level 12 and displays blueprintsNotUnlocked dialog', async () => {
        mockRoot.hubGoals.isRewardUnlocked.mockReturnValue(false);

        await hudLibrary.equipBlueprint('VALID_BP_STRING');

        expect(showInfoSpy).toHaveBeenCalled();
    });
});

describe('async equipBlueprint', () => {
    let mockRoot;
    let hudLibrary;
    let originalClipboard;

    beforeEach(async () => {
        vi.clearAllMocks();

        originalClipboard = global.navigator.clipboard;

        mockRoot = {
            app: {},
            hubGoals: {
                isRewardUnlocked: vi.fn().mockReturnValue(true),
                isBuildingUnlocked: vi.fn().mockReturnValue(true)
            },
            hud: {
                parts: {
                    dialogs: {
                        internalShowDialog: vi.fn(),
                        closeDialog: vi.fn()
                    },
                    blueprintPlacer: {
                        currentBlueprint: { set: vi.fn() },
                        lastBlueprintUsed: null
                    },
                    notifications: {
                        sendNotification: vi.fn()
                    }
                },
                signals: {
                    notification: { dispatch: vi.fn() },
                    pasteBlueprintRequested: { dispatch: vi.fn() }
                }
            },
            keymapper: {
                emit: vi.fn()
            }
        };

        global.shapez.Blueprint = class {
            constructor(entities) {
                this.entities = entities;
            }
        };

        global.shapez.BlueprintLibraryModLoader = {
            mods: [{
                metadata: { id: 'bp-string' },
                constructor: {
                    deserialize: vi.fn().mockReturnValue([{ uid: 1, components: {} }])
                }
            }]
        };

        const { HUDBlueprintLibrary } = await import('../src/ui.js');
        hudLibrary = new HUDBlueprintLibrary(mockRoot);
        hudLibrary.close = vi.fn(hudLibrary.close.bind(hudLibrary));
    });

    afterEach(() => {
        if (originalClipboard !== undefined) {
            Object.defineProperty(global.navigator, 'clipboard', {
                value: originalClipboard,
                configurable: true,
                writable: true
            });
        } else {
            delete global.navigator.clipboard;
        }
    });

    it('sets lastBlueprintUsed synchronously before clipboard write completes', async () => {
        let resolveClipboard;
        const clipboardPromise = new Promise(resolve => { resolveClipboard = resolve; });
        const writeTextMock = vi.fn().mockReturnValue(clipboardPromise);

        Object.defineProperty(global.navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            configurable: true,
            writable: true
        });

        const equipPromise = hudLibrary.equipBlueprint('TEST_BP_STRING');

        // Verify lastBlueprintUsed was set synchronously before clipboard Promise resolves
        expect(mockRoot.hud.parts.blueprintPlacer.lastBlueprintUsed).toBeDefined();
        expect(mockRoot.hud.parts.blueprintPlacer.lastBlueprintUsed.entities).toEqual([{ uid: 1, components: {} }]);

        resolveClipboard();
        await equipPromise;
    });

    it('attempts clipboard writeText with blueprintString and handles failures gracefully', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(global.navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            configurable: true,
            writable: true
        });

        await hudLibrary.equipBlueprint('TEST_BP_STRING');
        expect(writeTextMock).toHaveBeenCalledWith('TEST_BP_STRING');

        // Test rejection handled gracefully without throwing
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        writeTextMock.mockRejectedValueOnce(new Error('Clipboard denied'));
        await expect(hudLibrary.equipBlueprint('TEST_BP_STRING')).resolves.not.toThrow();
        expect(consoleWarnSpy).toHaveBeenCalledWith('[BlueprintBook] Clipboard write failed:', expect.any(Error));
        consoleWarnSpy.mockRestore();
    });

    it('dispatches warning notification and returns early without setting blueprint, clipboard, or paste event if locked entities exist', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(global.navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            configurable: true,
            writable: true
        });

        const lockedEntity = {
            components: {
                StaticMapEntity: {
                    getMetaBuilding: () => ({ id: 'locked_building' })
                }
            }
        };
        global.shapez.BlueprintLibraryModLoader.mods[0].constructor.deserialize.mockReturnValue([lockedEntity]);
        mockRoot.hubGoals.isBuildingUnlocked.mockReturnValue(false);

        await hudLibrary.equipBlueprint('LOCKED_BP_STRING');

        expect(mockRoot.hud.parts.notifications.sendNotification).toHaveBeenCalledWith(
            'Blueprint contains locked buildings (unlocked at later levels)',
            expect.anything()
        );
        expect(mockRoot.hud.parts.blueprintPlacer.lastBlueprintUsed).toBeNull();
        expect(mockRoot.hud.parts.blueprintPlacer.currentBlueprint.set).not.toHaveBeenCalled();
        expect(writeTextMock).not.toHaveBeenCalled();
        expect(mockRoot.keymapper.emit).not.toHaveBeenCalled();
        expect(mockRoot.hud.signals.pasteBlueprintRequested.dispatch).not.toHaveBeenCalled();
    });

    it('_createBlueprintCard caches derived entity calculations per blueprint id and value key', () => {
        const bp = { id: 'bp_cache_1', name: 'Cache BP', value: 'CACHE_BP_VALUE', tags: [] };
        const deserializeSpy = global.shapez.BlueprintLibraryModLoader.mods[0].constructor.deserialize;
        deserializeSpy.mockClear();

        hudLibrary._createBlueprintCard(bp, () => {});
        const callCountAfterFirstRender = deserializeSpy.mock.calls.length;

        // Second render with same bp.id and bp.value should hit cache without calling deserialize again
        hudLibrary._createBlueprintCard(bp, () => {});
        expect(deserializeSpy.mock.calls.length).toBe(callCountAfterFirstRender);

        // Render with changed bp.value should invalidate cache and compute again
        const bpUpdated = { id: 'bp_cache_1', name: 'Cache BP', value: 'NEW_CACHE_BP_VALUE', tags: [] };
        hudLibrary._createBlueprintCard(bpUpdated, () => {});
        expect(deserializeSpy.mock.calls.length).toBeGreaterThan(callCountAfterFirstRender);
    });

    it('_createBlueprintCard disables equip button and sets title tooltip when blueprint contains locked entities', () => {
        const lockedEntity = {
            components: {
                StaticMapEntity: {
                    getMetaBuilding: () => ({ id: 'locked_building' })
                }
            }
        };
        global.shapez.BlueprintLibraryModLoader.mods[0].constructor.deserialize.mockReturnValue([lockedEntity]);
        mockRoot.hubGoals.isBuildingUnlocked.mockReturnValue(false);

        const bp = { id: 'bp_locked', name: 'Locked BP', value: 'LOCKED_BP_STRING', tags: [] };
        const card = hudLibrary._createBlueprintCard(bp, () => {});

        const equipBtn = card.querySelector('.bplib-btn-equip');
        expect(equipBtn).not.toBeNull();
        expect(equipBtn.classList.contains('disabled')).toBe(true);
        expect(equipBtn.disabled).toBe(true);
        expect(equipBtn.title).toBe('Contains locked buildings (unlocked at higher level)');
    });

    it('shows error and returns early without closing when modLoader is missing or invalid', async () => {
        global.shapez.BlueprintLibraryModLoader = null;
        hudLibrary.close = vi.fn();
        hudLibrary.notify = vi.fn();

        await hudLibrary.equipBlueprint('TEST_BP_STRING');

        expect(hudLibrary.notify).toHaveBeenCalledWith('Blueprint strings mod loader unavailable.', 'error');
        expect(hudLibrary.close).not.toHaveBeenCalled();
    });

    it('shows error and returns early without closing when bp-string mod is not found', async () => {
        global.shapez.BlueprintLibraryModLoader = { mods: [] };
        hudLibrary.close = vi.fn();
        hudLibrary.notify = vi.fn();

        await hudLibrary.equipBlueprint('TEST_BP_STRING');

        expect(hudLibrary.notify).toHaveBeenCalledWith('Blueprint string deserializer unavailable.', 'error');
        expect(hudLibrary.close).not.toHaveBeenCalled();
    });

    it('emits paste event and calls close()', async () => {
        await hudLibrary.equipBlueprint('TEST_BP_STRING');

        expect(mockRoot.keymapper.emit).toHaveBeenCalledWith('pasteBlueprintRequested');
        expect(hudLibrary.close).toHaveBeenCalled();
    });
});

describe('isBlueprintsUnlocked', () => {
    it('returns true (fail-open) when root or hubGoals is null/undefined', () => {
        expect(isBlueprintsUnlocked(null)).toBe(true);
        expect(isBlueprintsUnlocked({})).toBe(true);
        expect(isBlueprintsUnlocked({ hubGoals: {} })).toBe(true);
    });

    it('returns true (fail-open) when hubGoals exists but lacks isRewardUnlocked method', () => {
        const root = { hubGoals: { isBuildingUnlocked: vi.fn() } };
        expect(isBlueprintsUnlocked(root)).toBe(true);
    });

    it('delegates to hubGoals.isRewardUnlocked when method is present', () => {
        const isRewardUnlocked = vi.fn().mockReturnValue(false);
        const root = { hubGoals: { isRewardUnlocked } };
        expect(isBlueprintsUnlocked(root)).toBe(false);
        expect(isRewardUnlocked).toHaveBeenCalledWith('reward_blueprints');
    });
});

describe('registerNativeChangelogEntry', () => {
    it('populates shapez.CHANGELOG with entry matching METADATA.version and does not duplicate', () => {
        global.shapez.CHANGELOG = [];
        registerNativeChangelogEntry();

        expect(global.shapez.CHANGELOG.length).toBe(1);
        expect(global.shapez.CHANGELOG[0].version).toBe(`Blueprint Book v${METADATA.version}`);
        expect(global.shapez.CHANGELOG[0].date).toBe('2026-07-28');
        expect(Array.isArray(global.shapez.CHANGELOG[0].entries)).toBe(true);
        expect(global.shapez.CHANGELOG[0].entries.length).toBeGreaterThan(0);

        // Subsequent calls should not duplicate the entry
        registerNativeChangelogEntry();
        expect(global.shapez.CHANGELOG.length).toBe(1);
    });
});

describe('Dev Version Change - Dynamic Boot Check', () => {
    let mockRoot;
    let hudLibrary;
    let mockDialogElem;
    let mockOverlay;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockDialogElem = document.createElement('div');
        mockOverlay = document.createElement('div');

        const mockDialog = {
            dialogElem: mockDialogElem,
            element: mockOverlay,
            buttonSignals: {},
            trackClicks: vi.fn(),
            closeRequested: { add: vi.fn(), dispatch: vi.fn() }
        };

        global.shapez.Dialog = vi.fn().mockImplementation(function (opts = {}) {
            mockOverlay.innerHTML = opts.contentHTML || opts.content || '';
            return mockDialog;
        });
        global.shapez.ClickDetector = class {
            constructor(element, opts) {
                this.element = element;
                this.click = { add: (handler, receiver) => { element.addEventListener('click', (e) => handler.call(receiver, e)); } };
            }
            cleanup() {}
        };

        mockRoot = {
            app: {
                modLoader: {
                    mods: [{ metadata: { id: 'bp-library', isDev: true }, meta: { version: METADATA.version, isDev: true }, settings: { availableTags: [], blueprints: [] } }]
                }
            },
            hubGoals: {
                isRewardUnlocked: vi.fn().mockReturnValue(true)
            },
            hud: {
                parts: {
                    dialogs: { internalShowDialog: vi.fn(), closeDialog: vi.fn() }
                },
                signals: {
                    notification: { dispatch: vi.fn() }
                }
            }
        };

        const { HUDBlueprintLibrary } = await import('../src/ui.js');
        const { BlueprintStore } = await import('../src/store.js');
        BlueprintStore.init({ settings: { availableTags: [], blueprints: [] }, saveSettings: vi.fn() });
        BlueprintStore.mod = mockRoot.app.modLoader.mods[0];

        hudLibrary = new HUDBlueprintLibrary(mockRoot);
    });

    afterEach(() => {
        if (hudLibrary) hudLibrary.cleanup();
    });

    it('checkUpdateOnce uses getActiveVersion so isDev = true triggers welcome dialog on boot', async () => {
        const { BlueprintStore } = await import('../src/store.js');
        BlueprintStore.init({ settings: { availableTags: [], blueprints: [] }, saveSettings: vi.fn() });
        BlueprintStore.mod = mockRoot.app.modLoader.mods[0];
        BlueprintStore.setLastSeenVersion(METADATA.version);

        HUDBlueprintLibrary.hasCheckedUpdate = false;
        hudLibrary.showWelcomeDialog = vi.fn();

        await hudLibrary.checkUpdateOnce();

        expect(hudLibrary.showWelcomeDialog).toHaveBeenCalled();
        const calledVersion = hudLibrary.showWelcomeDialog.mock.calls[0][0];
        expect(calledVersion).toContain(`${METADATA.version}-dev.`);
        expect(BlueprintStore.getLastSeenVersion()).toBe(calledVersion);
    });
});

describe('BaseHUDPart Lifecycle & isBlockingOverlay Specs', () => {
    let mockRoot;
    let hudLibrary;
    let mockInputMgr;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockInputMgr = {
            makeSureAttachedAndOnTop: vi.fn(),
            makeSureDetached: vi.fn()
        };

        mockRoot = {
            app: {
                inputMgr: mockInputMgr
            },
            hubGoals: {
                isRewardUnlocked: vi.fn().mockReturnValue(true)
            },
            hud: {
                parts: {
                    dialogs: { internalShowDialog: vi.fn(), closeDialog: vi.fn() }
                },
                signals: { notification: { dispatch: vi.fn() } }
            }
        };

        global.shapez.DynamicDomAttach = class {
            constructor(root, element, opts) {
                this.root = root;
                this.element = element;
                this.opts = opts;
            }
            update(visible) {
                if (visible) {
                    this.element.classList.add(this.opts.attachClass || 'visible');
                } else {
                    this.element.classList.remove(this.opts.attachClass || 'visible');
                }
            }
        };
        global.shapez.InputReceiver = class {
            constructor(id) {
                this.id = id;
            }
        };
        global.shapez.KeyActionMapper = class {
            constructor(root, receiver) {
                this.root = root;
                this.receiver = receiver;
            }
            getBinding() {
                return { add: vi.fn() };
            }
        };
        global.shapez.KEYMAPPINGS = {
            general: { back: 'back' },
            ingame: { menuClose: 'menuClose' }
        };

        const { HUDBlueprintLibrary } = await import('../src/ui.js');
        hudLibrary = new HUDBlueprintLibrary(mockRoot);
    });

    it('createElements builds #ingame_HUD_BlueprintLibrary container with .ingameDialog and .dialogInner', () => {
        const parentElem = document.createElement('div');
        hudLibrary.createElements(parentElem);

        expect(hudLibrary.background).not.toBeNull();
        expect(hudLibrary.background.id).toBe('ingame_HUD_BlueprintLibrary');
        expect(hudLibrary.background.classList.contains('ingameDialog')).toBe(true);

        expect(hudLibrary.dialogInner).not.toBeNull();
        expect(hudLibrary.dialogInner.classList.contains('dialogInner')).toBe(true);
        expect(hudLibrary.dialogInner.classList.contains('dialogMods')).toBe(true);
        expect(hudLibrary.dialogInner.classList.contains('optionChooserDialog')).toBe(true);
        expect(hudLibrary.dialogInner.classList.contains('dialogUpgrades')).toBe(true);
        expect(hudLibrary.overlay).toBe(hudLibrary.dialogInner);
    });

    it('isBlockingOverlay() returns false when hidden and true when shown', () => {
        const parentElem = document.createElement('div');
        hudLibrary.createElements(parentElem);
        hudLibrary.initialize();

        expect(hudLibrary.isBlockingOverlay()).toBe(false);

        hudLibrary.show();
        expect(hudLibrary.isBlockingOverlay()).toBe(true);

        hudLibrary.close();
        expect(hudLibrary.isBlockingOverlay()).toBe(false);
    });

    it('show() and close() toggle this.visible and attach/detach inputReceiver', () => {
        const parentElem = document.createElement('div');
        hudLibrary.createElements(parentElem);
        hudLibrary.initialize();

        expect(hudLibrary.visible).toBe(false);

        hudLibrary.show();
        expect(hudLibrary.visible).toBe(true);
        expect(mockInputMgr.makeSureAttachedAndOnTop).toHaveBeenCalledWith(hudLibrary.inputReceiver);

        hudLibrary.close();
        expect(hudLibrary.visible).toBe(false);
        expect(mockInputMgr.makeSureDetached).toHaveBeenCalledWith(hudLibrary.inputReceiver);
    });
});

describe('Task 3: Persistent DOM Interactions & handleToggleHotkey Specs', () => {
    let mockRoot;
    let hudLibrary;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockRoot = {
            app: {
                inputMgr: {
                    makeSureAttachedAndOnTop: vi.fn(),
                    makeSureDetached: vi.fn()
                }
            },
            hubGoals: {
                isRewardUnlocked: vi.fn().mockReturnValue(true)
            },
            hud: {
                parts: {
                    dialogs: { internalShowDialog: vi.fn(), closeDialog: vi.fn() }
                },
                signals: { notification: { dispatch: vi.fn() } }
            }
        };

        const { HUDBlueprintLibrary } = await import('../src/ui.js');
        const { BlueprintStore } = await import('../src/store.js');
        BlueprintStore.init({ settings: { availableTags: ['factory', 'belt'], blueprints: [] }, saveSettings: vi.fn() });

        hudLibrary = new HUDBlueprintLibrary(mockRoot);
        hudLibrary.createElements(document.createElement('div'));
        hudLibrary.initialize();
    });

    it('persists searchQuery and activeTagFilter across show() -> search -> close() -> show() open/close cycles', () => {
        hudLibrary.show();

        const searchInput = hudLibrary.overlay.querySelector('#bplib-search');
        searchInput.value = 'balancer';
        searchInput.dispatchEvent(new Event('input'));

        hudLibrary.activeTagFilter = 'factory';
        hudLibrary.render();

        expect(hudLibrary.searchQuery).toBe('balancer');
        expect(hudLibrary.activeTagFilter).toBe('factory');

        // Close the Blueprint Book
        hudLibrary.close();
        expect(hudLibrary.visible).toBe(false);

        // Reopen the Blueprint Book
        hudLibrary.show();
        expect(hudLibrary.visible).toBe(true);

        // Verify searchQuery and activeTagFilter state persists
        expect(hudLibrary.searchQuery).toBe('balancer');
        expect(hudLibrary.activeTagFilter).toBe('factory');
        expect(hudLibrary.overlay.querySelector('#bplib-search').value).toBe('balancer');
    });

    it('synchronizes search input DOM value with searchQuery during render()', () => {
        hudLibrary.show();
        hudLibrary.searchQuery = 'machinery';
        hudLibrary.render();

        const searchInput = hudLibrary.overlay.querySelector('#bplib-search');
        expect(searchInput.value).toBe('machinery');
    });


    it('handleToggleHotkey() toggles between show() and close()', () => {
        const showSpy = vi.spyOn(hudLibrary, 'show');
        const closeSpy = vi.spyOn(hudLibrary, 'close');

        expect(hudLibrary.visible).toBe(false);

        // First press when closed -> calls show()
        const res1 = hudLibrary.handleToggleHotkey();
        expect(res1).toBe('stop_propagation');
        expect(showSpy).toHaveBeenCalledTimes(1);
        expect(closeSpy).not.toHaveBeenCalled();
        expect(hudLibrary.visible).toBe(true);

        // Second press when open -> calls close()
        const res2 = hudLibrary.handleToggleHotkey();
        expect(res2).toBe('stop_propagation');
        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(hudLibrary.visible).toBe(false);
    });

    it('render() invokes cleanupDynamicClickDetectors() before re-populating grid cards', () => {
        const cleanupSpy = vi.spyOn(hudLibrary, 'cleanupDynamicClickDetectors');

        hudLibrary.show();
        expect(cleanupSpy).toHaveBeenCalled();

        cleanupSpy.mockClear();
        hudLibrary.render();
        expect(cleanupSpy).toHaveBeenCalled();
    });
});







