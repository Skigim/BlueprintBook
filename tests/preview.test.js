// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getBlueprintEntityCount,
    getBlueprintCost,
    InteractiveBlueprintViewer,
    openBlueprintPreviewDialog
} from '../src/preview.js';

describe('Blueprint Preview Renderer (src/preview.js)', () => {
    let mockRoot;
    let mockBpMod;
    let mockEntities;

    beforeEach(() => {
        vi.clearAllMocks();

        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
            fillRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn()
        });

        global.shapez = global.shapez || {};
        global.shapez.Vector = class {
            constructor(x, y) { this.x = x; this.y = y; }
            sub(v) { return new global.shapez.Vector(this.x - v.x, this.y - v.y); }
        };
        global.shapez.Rectangle = class {
            constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; }
        };
        global.shapez.DrawParameters = class { constructor(opts) {} };

        const mockEntity = {
            components: {
                StaticMapEntity: {
                    origin: new global.shapez.Vector(0, 0),
                    getTileSpaceBounds: () => ({ x: 0, y: 0, width: 2, height: 2 }),
                    getSprite: () => ({}),
                    drawSpriteOnBoundsClipped: vi.fn()
                }
            }
        };

        mockEntities = [mockEntity];

        mockBpMod = {
            metadata: { id: 'bp-string' },
            constructor: {
                deserialize: vi.fn().mockReturnValue(mockEntities)
            }
        };

        global.shapez.BlueprintLibraryModLoader = {
            mods: [mockBpMod]
        };

        global.shapez.Blueprint = class {
            constructor(entities) {
                this.entities = entities;
            }
            getCost() {
                return 42;
            }
        };

        mockRoot = {
            app: {},
            gameMode: {
                getHasFreeCopyPaste: vi.fn().mockReturnValue(false),
                getBlueprintShapeKey: vi.fn().mockReturnValue('CuCuCuCu')
            },
            shapeDefinitionMgr: {
                getShapeFromShortKey: vi.fn().mockReturnValue({
                    generateAsCanvas: vi.fn().mockReturnValue(document.createElement('canvas'))
                })
            },
            hud: {
                parts: {
                    dialogs: {
                        internalShowDialog: vi.fn(),
                        closeDialog: vi.fn()
                    }
                }
            }
        };
    });

    describe('openBlueprintPreviewDialog', () => {
        it('constructs shapez.Dialog with native buttons ["cancel:bad", "equip:good:EQUIP"]', () => {
            let passedOpts = null;
            global.shapez.Dialog = vi.fn().mockImplementation(function (opts) {
                passedOpts = opts;
                this.element = document.createElement('div');
                this.buttonSignals = { equip: { add: vi.fn() } };
                this.closeRequested = { add: vi.fn() };
                return this;
            });

            const bp = { id: 'bp1', name: 'Test Blueprint', value: 'VALID_BP_STRING' };
            const onEquipMock = vi.fn();

            openBlueprintPreviewDialog(mockRoot, bp, onEquipMock);

            expect(mockRoot.hud.parts.dialogs.internalShowDialog).toHaveBeenCalled();
            expect(passedOpts).not.toBeNull();
            expect(passedOpts.buttons).toEqual(["cancel:bad", "equip:good:EQUIP"]);
        });

        it('applies dialogUpgrades class to dialog.dialogElem', () => {
            let createdDialog = null;
            global.shapez.Dialog = vi.fn().mockImplementation(function (opts) {
                this.element = document.createElement('div');
                this.dialogElem = document.createElement('div');
                this.buttonSignals = { equip: { add: vi.fn() } };
                this.closeRequested = { add: vi.fn() };
                createdDialog = this;
                return this;
            });

            const bp = { id: 'bp1', name: 'Test Blueprint', value: 'VALID_BP_STRING' };
            openBlueprintPreviewDialog(mockRoot, bp);

            expect(createdDialog.dialogElem.classList.contains('dialogUpgrades')).toBe(true);
        });
    });

    describe('InteractiveBlueprintViewer', () => {
        it('initializes canvas and attaches pan/zoom event listeners', () => {
            const container = document.createElement('div');
            const viewer = new InteractiveBlueprintViewer(mockRoot, 'VALID_BP_STRING', container);

            expect(container.querySelector('canvas')).not.toBeNull();
            expect(viewer.canvas).not.toBeNull();

            // Clean up
            viewer.cleanup();
        });
    });
});
