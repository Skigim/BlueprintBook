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

describe('preventGameInputs DOM Propagation', () => {
    it('does not stop propagation of keyboard or mouse events to prevent desyncing ClickDetector or keysDown state', async () => {
        const { preventGameInputs } = await import('../lib/dom.js');
        const inputElem = document.createElement('input');
        preventGameInputs(inputElem);

        const keyupEvent = new KeyboardEvent('keyup', { bubbles: true, cancelable: true });
        const mouseupEvent = new MouseEvent('mouseup', { bubbles: true, cancelable: true });

        const stopPropagationSpy = vi.spyOn(keyupEvent, 'stopPropagation');
        const mouseStopSpy = vi.spyOn(mouseupEvent, 'stopPropagation');

        inputElem.dispatchEvent(keyupEvent);
        inputElem.dispatchEvent(mouseupEvent);

        expect(stopPropagationSpy).not.toHaveBeenCalled();
        expect(mouseStopSpy).not.toHaveBeenCalled();
    });
});
