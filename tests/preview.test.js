// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    deserializeBlueprintEntities,
    getBlueprintEntityCount,
    getBlueprintCost,
    getLockedEntitiesInBlueprint,
    InteractiveBlueprintViewer,
    openBlueprintPreviewDialog,
    renderBlueprintCostElement,
    resolveCostShapeKeys,
    findModById,
    classifyDeserializeFailure,
    logDeserializeFailure
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
        global.shapez.T = { dialogs: {} };
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
        it('constructs shapez.Dialog with native buttons ["cancel:bad", "equip:good"]', () => {
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
            expect(passedOpts.buttons).toEqual(["cancel:bad", "equip:good"]);
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

        it('adds locked building warning to preview stats footer if blueprint has locked entities', () => {
            let createdDialog = null;
            global.shapez.Dialog = vi.fn().mockImplementation(function (opts) {
                const el = document.createElement('div');
                el.innerHTML = opts.contentHTML;
                this.element = el;
                this.dialogElem = document.createElement('div');
                this.buttonSignals = { equip: { add: vi.fn() } };
                this.closeRequested = { add: vi.fn() };
                createdDialog = this;
                return this;
            });

            const mockLockedEntity = {
                components: {
                    StaticMapEntity: {
                        origin: new global.shapez.Vector(0, 0),
                        getTileSpaceBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
                        getVariant: () => 'default',
                        getMetaBuilding: () => ({
                            getIsUnlocked: vi.fn().mockReturnValue(false),
                            getAvailableVariants: vi.fn().mockReturnValue(['default'])
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([mockLockedEntity]);

            const bp = { id: 'bp1', name: 'Locked Blueprint', value: 'LOCKED_BP_STRING' };
            openBlueprintPreviewDialog(mockRoot, bp);

            const warningElem = createdDialog.element.querySelector('.bplib-preview-locked-warning');
            expect(warningElem).not.toBeNull();
            expect(warningElem.textContent).toContain('⚠️ Contains locked buildings');
        });

        it('disables EQUIP button and sets title tooltip in preview dialog when locked entities are present', () => {
            let createdDialog = null;
            global.shapez.Dialog = vi.fn().mockImplementation(function (opts) {
                const el = document.createElement('div');
                el.innerHTML = opts.contentHTML;
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'buttons';
                (opts.buttons || []).forEach(b => {
                    const [name, style] = b.split(':');
                    const btn = document.createElement('button');
                    btn.className = `button styledButton ${style || ''}`;
                    btn.dataset.button = name;
                    btn.textContent = name.toUpperCase();
                    buttonsDiv.appendChild(btn);
                });
                el.appendChild(buttonsDiv);

                this.element = el;
                this.dialogElem = document.createElement('div');
                this.buttonSignals = { equip: { add: vi.fn() } };
                this.closeRequested = { add: vi.fn() };
                createdDialog = this;
                return this;
            });

            const mockLockedEntity = {
                components: {
                    StaticMapEntity: {
                        origin: new global.shapez.Vector(0, 0),
                        getTileSpaceBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
                        getVariant: () => 'default',
                        getMetaBuilding: () => ({
                            getIsUnlocked: vi.fn().mockReturnValue(false),
                            getAvailableVariants: vi.fn().mockReturnValue(['default'])
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([mockLockedEntity]);

            const bp = { id: 'bp1', name: 'Locked Blueprint', value: 'LOCKED_BP_STRING' };
            openBlueprintPreviewDialog(mockRoot, bp);

            const equipBtn = createdDialog.element.querySelector('.buttons button.good, .buttons button[data-button="equip"], button.good');
            expect(equipBtn).not.toBeNull();
            expect(equipBtn.disabled).toBe(true);
            expect(equipBtn.classList.contains('disabled')).toBe(true);
            expect(equipBtn.title).toBe('Contains locked buildings (unlocked at higher level)');
        });

        it('returns early without throwing when blueprint parameter is null or undefined', () => {
            expect(() => openBlueprintPreviewDialog(mockRoot, null)).not.toThrow();
            expect(() => openBlueprintPreviewDialog(mockRoot, undefined)).not.toThrow();
            expect(mockRoot.hud.parts.dialogs.internalShowDialog).not.toHaveBeenCalled();
        });

        it('renders exactly one .requirement with the same amount text as before for a vanilla-numeric cost', () => {
            let createdDialog = null;
            global.shapez.Dialog = vi.fn().mockImplementation(function (opts) {
                const el = document.createElement('div');
                el.innerHTML = opts.contentHTML;
                this.element = el;
                this.dialogElem = document.createElement('div');
                this.buttonSignals = { equip: { add: vi.fn() } };
                this.closeRequested = { add: vi.fn() };
                createdDialog = this;
                return this;
            });

            const bp = { id: 'bp1', name: 'Numeric Cost Blueprint', value: 'VALID_BP_STRING' };
            openBlueprintPreviewDialog(mockRoot, bp);

            const costSlot = createdDialog.element.querySelector('.bplib-preview-cost-slot');
            expect(costSlot).not.toBeNull();
            const requirements = costSlot.querySelectorAll('.requirement');
            expect(requirements.length).toBe(1);
            expect(requirements[0].querySelector('.amount').textContent).toBe('42');
        });

        it('shows "Buildings: ?" and "Cost: unknown" when deserialize fails due to locked/unresearched content', () => {
            let createdDialog = null;
            global.shapez.Dialog = vi.fn().mockImplementation(function (opts) {
                const el = document.createElement('div');
                el.innerHTML = opts.contentHTML;
                this.element = el;
                this.dialogElem = document.createElement('div');
                this.buttonSignals = { equip: { add: vi.fn() } };
                this.closeRequested = { add: vi.fn() };
                createdDialog = this;
                return this;
            });

            mockBpMod.constructor.deserialize.mockImplementation(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            const bp = { id: 'bp1', name: 'Research Gated Blueprint', value: 'RESEARCH_GATED_BP_STRING' };
            openBlueprintPreviewDialog(mockRoot, bp);

            const statsContainer = createdDialog.element.querySelector('.bplib-preview-stats');
            expect(statsContainer.textContent).toContain('?');

            const costSlot = createdDialog.element.querySelector('.bplib-preview-cost-slot');
            expect(costSlot.textContent).toContain('unknown');
        });

        it('disables EQUIP button when deserialize fails due to locked/unresearched content', () => {
            let createdDialog = null;
            global.shapez.Dialog = vi.fn().mockImplementation(function (opts) {
                const el = document.createElement('div');
                el.innerHTML = opts.contentHTML;
                const buttonsDiv = document.createElement('div');
                buttonsDiv.className = 'buttons';
                (opts.buttons || []).forEach(b => {
                    const [name, style] = b.split(':');
                    const btn = document.createElement('button');
                    btn.className = `button styledButton ${style || ''}`;
                    btn.dataset.button = name;
                    btn.textContent = name.toUpperCase();
                    buttonsDiv.appendChild(btn);
                });
                el.appendChild(buttonsDiv);

                this.element = el;
                this.dialogElem = document.createElement('div');
                this.buttonSignals = { equip: { add: vi.fn() } };
                this.closeRequested = { add: vi.fn() };
                createdDialog = this;
                return this;
            });

            mockBpMod.constructor.deserialize.mockImplementation(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            const bp = { id: 'bp1', name: 'Research Gated Blueprint', value: 'RESEARCH_GATED_BP_STRING' };
            openBlueprintPreviewDialog(mockRoot, bp);

            const equipBtn = createdDialog.element.querySelector('.buttons button.good, .buttons button[data-button="equip"], button.good');
            expect(equipBtn.disabled).toBe(true);
        });
    });

    describe('getLockedEntitiesInBlueprint', () => {
        it('returns empty array when blueprint input is null or undefined', () => {
            expect(getLockedEntitiesInBlueprint(mockRoot, null)).toEqual([]);
            expect(getLockedEntitiesInBlueprint(mockRoot, undefined)).toEqual([]);
        });

        it('handles sparse or invalid entity arrays safely without throwing', () => {
            const sparseEntities = [null, undefined, {}, { components: null }, { components: {} }];
            mockBpMod.constructor.deserialize.mockReturnValueOnce(sparseEntities);

            expect(() => getLockedEntitiesInBlueprint(mockRoot, 'SPARSE_BP')).not.toThrow();
            expect(getLockedEntitiesInBlueprint(mockRoot, 'SPARSE_BP')).toEqual([]);
        });

        it('returns empty array when all entities are unlocked', () => {
            const unlockedEntity = {
                components: {
                    StaticMapEntity: {
                        getVariant: () => 'default',
                        getMetaBuilding: () => ({
                            getIsUnlocked: vi.fn().mockReturnValue(true),
                            getAvailableVariants: vi.fn().mockReturnValue(['default', 'rotatable'])
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([unlockedEntity]);

            const locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING');
            expect(locked).toEqual([]);
        });

        it('identifies entities locked by building status', () => {
            const lockedEntity = {
                components: {
                    StaticMapEntity: {
                        getVariant: () => 'default',
                        getMetaBuilding: () => ({
                            getIsUnlocked: vi.fn().mockReturnValue(false),
                            getAvailableVariants: vi.fn().mockReturnValue(['default'])
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([lockedEntity]);

            const locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING');
            expect(locked).toHaveLength(1);
            expect(locked[0]).toBe(lockedEntity);
        });

        it('identifies entities locked by variant status', () => {
            const lockedVariantEntity = {
                components: {
                    StaticMapEntity: {
                        getVariant: () => 'rotatable',
                        getMetaBuilding: () => ({
                            getIsUnlocked: vi.fn().mockReturnValue(true),
                            getAvailableVariants: vi.fn().mockReturnValue(['default'])
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([lockedVariantEntity]);

            const locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING');
            expect(locked).toHaveLength(1);
            expect(locked[0]).toBe(lockedVariantEntity);
        });

        it('returns a non-empty sentinel result when deserialize fails due to locked/unresearched content', () => {
            mockBpMod.constructor.deserialize.mockImplementationOnce(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            const locked = getLockedEntitiesInBlueprint(mockRoot, 'RESEARCH_GATED_BP_STRING');
            expect(locked.length).toBeGreaterThan(0);
        });

        it('treats a variant filtered from getAvailableVariants as unlocked when its building code is registered in shapez.gBuildingVariants', () => {
            global.shapez.gBuildingVariants = {
                123: { variant: 'mirrored' }
            };

            const toolbarHiddenEntity = {
                components: {
                    StaticMapEntity: {
                        code: 123,
                        getVariant: () => 'mirrored',
                        getMetaBuilding: () => ({
                            getIsUnlocked: vi.fn().mockReturnValue(true),
                            // Some other mod (e.g. a toolbar mod) filtered 'mirrored' out of
                            // getAvailableVariants without actually locking it:
                            getAvailableVariants: vi.fn().mockReturnValue(['default'])
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([toolbarHiddenEntity]);

            const locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING');
            expect(locked).toEqual([]);

            delete global.shapez.gBuildingVariants;
        });

        it('still treats a filtered variant as locked when its code is not in shapez.gBuildingVariants', () => {
            global.shapez.gBuildingVariants = {};

            const filteredEntity = {
                components: {
                    StaticMapEntity: {
                        code: 999,
                        getVariant: () => 'mirrored',
                        getMetaBuilding: () => ({
                            getIsUnlocked: vi.fn().mockReturnValue(true),
                            getAvailableVariants: vi.fn().mockReturnValue(['default'])
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([filteredEntity]);

            const locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING');
            expect(locked).toHaveLength(1);

            delete global.shapez.gBuildingVariants;
        });

        it('fails open (treats as unlocked) and logs a warning when getIsUnlocked throws', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const throwingEntity = {
                components: {
                    StaticMapEntity: {
                        code: 1,
                        getVariant: () => 'default',
                        getMetaBuilding: () => ({
                            getIsUnlocked: () => { throw new Error('Mod unlock check error'); },
                            getAvailableVariants: () => ['default']
                        })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([throwingEntity]);

            let locked;
            expect(() => { locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING'); }).not.toThrow();
            expect(locked).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith(
                '[BlueprintBook] Unlock check threw exception, failing open (unlocked):',
                expect.any(Error)
            );

            warnSpy.mockRestore();
        });

        it('fails open and logs a warning when a single entity throws during inspection', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const brokenEntity = {
                components: {
                    StaticMapEntity: {
                        get code() { throw new Error('boom'); }
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([brokenEntity]);

            let locked;
            expect(() => { locked = getLockedEntitiesInBlueprint(mockRoot, 'BP_STRING'); }).not.toThrow();
            expect(locked).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith(
                '[BlueprintBook] Entity inspection error, failing open:',
                expect.any(Error)
            );

            warnSpy.mockRestore();
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

        it('skips entity rendering cleanly when staticComp origin is missing or sub is invalid', () => {
            const mockInvalidOriginEntity = {
                components: {
                    StaticMapEntity: {
                        origin: null,
                        getTileSpaceBounds: () => ({ x: 0, y: 0, width: 2, height: 2 })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([mockInvalidOriginEntity]);

            const container = document.createElement('div');
            const viewer = new InteractiveBlueprintViewer(mockRoot, 'INVALID_ORIGIN_BP', container);
            expect(() => viewer.render()).not.toThrow();
            viewer.cleanup();
        });

        it('uses staticComp.getRotationVariant() when rendering preview sprite', () => {
            const getPreviewSpriteMock = vi.fn().mockReturnValue({});
            const mockRotationEntity = {
                components: {
                    StaticMapEntity: {
                        origin: new global.shapez.Vector(0, 0),
                        getTileSpaceBounds: () => ({ x: 0, y: 0, width: 2, height: 2 }),
                        getRotationVariant: () => 3,
                        getVariant: () => 'rotatable',
                        getMetaBuilding: () => ({
                            getPreviewSprite: getPreviewSpriteMock
                        }),
                        getSprite: () => null,
                        drawSpriteOnBoundsClipped: vi.fn()
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([mockRotationEntity]);

            const container = document.createElement('div');
            const viewer = new InteractiveBlueprintViewer(mockRoot, 'ROTATION_BP', container);
            viewer.render();

            expect(getPreviewSpriteMock).toHaveBeenCalledWith(3, 'rotatable');
            viewer.cleanup();
        });

        it('scales mouse coordinates in onWheel by ratio of canvas size to bounding rect size', () => {
            const container = document.createElement('div');
            const viewer = new InteractiveBlueprintViewer(mockRoot, 'VALID_BP_STRING', container);

            viewer.canvas.width = 600;
            viewer.canvas.height = 400;
            viewer.canvas.getBoundingClientRect = () => ({
                left: 50,
                top: 50,
                width: 300,
                height: 200
            });

            viewer.panX = 0;
            viewer.panY = 0;
            viewer.zoom = 1;

            const wheelEvent = {
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                clientX: 100, // (100 - 50) * (600 / 300) = 100
                clientY: 100, // (100 - 50) * (400 / 200) = 100
                deltaY: -100  // zoomIn -> newZoom = 1.15
            };

            viewer.onWheel(wheelEvent);

            // expected panX: mouseX - (mouseX - panX) * (1.15 / 1)
            // = 100 - (100 - 0) * 1.15 = 100 - 115 = -15
            expect(viewer.panX).toBeCloseTo(-15);
            expect(viewer.panY).toBeCloseTo(-15);

            viewer.cleanup();
        });

        it('initializes and cleans up ResizeObserver when window.ResizeObserver is available', () => {
            const observeMock = vi.fn();
            const disconnectMock = vi.fn();
            let observerCallback = null;

            const originalResizeObserver = global.ResizeObserver;
            const originalWindowResizeObserver = window.ResizeObserver;

            const mockResizeObserverClass = vi.fn().mockImplementation(function (cb) {
                observerCallback = cb;
                this.observe = observeMock;
                this.disconnect = disconnectMock;
            });

            global.ResizeObserver = mockResizeObserverClass;
            window.ResizeObserver = mockResizeObserverClass;

            const container = document.createElement('div');
            const viewer = new InteractiveBlueprintViewer(mockRoot, 'VALID_BP_STRING', container);

            expect(mockResizeObserverClass).toHaveBeenCalled();
            expect(observeMock).toHaveBeenCalledWith(container);
            expect(viewer.resizeObserver).toBeDefined();

            // Verify observer callback triggers resize (real ResizeObserver always invokes
            // its callback with a ResizeObserverEntry[], even when empty)
            const resizeSpy = vi.spyOn(viewer, 'resize');
            if (observerCallback) observerCallback([]);
            expect(resizeSpy).toHaveBeenCalledTimes(1);

            // Also exercise the non-empty entries branch (entry.contentRect dimension check)
            if (observerCallback) observerCallback([{ contentRect: { width: 640, height: 480 } }]);
            expect(resizeSpy).toHaveBeenCalledTimes(2);

            viewer.cleanup();
            expect(disconnectMock).toHaveBeenCalled();
            expect(viewer.resizeObserver).toBeNull();

            global.ResizeObserver = originalResizeObserver;
            window.ResizeObserver = originalWindowResizeObserver;
        });

        it('handles null or missing containerElem gracefully without throwing', () => {
            let viewer = null;
            expect(() => {
                viewer = new InteractiveBlueprintViewer(mockRoot, 'VALID_BP_STRING', null);
                viewer.resize();
                viewer.cleanup();
            }).not.toThrow();
        });

        it('ignores NaN bounds values when initializing entity bounds', () => {
            const mockNanEntity = {
                components: {
                    StaticMapEntity: {
                        origin: new global.shapez.Vector(0, 0),
                        getTileSpaceBounds: () => ({ x: NaN, y: 0, width: 2, height: 2 })
                    }
                }
            };
            mockBpMod.constructor.deserialize.mockReturnValueOnce([mockNanEntity]);
            const container = document.createElement('div');
            const viewer = new InteractiveBlueprintViewer(mockRoot, 'NAN_BP', container);
            expect(viewer.bounds).toEqual({ minX: 0, minY: 0, tilesW: 1, tilesH: 1 });
            viewer.cleanup();
        });

        it('handles missing ResizeObserver global gracefully', () => {
            const originalResizeObserver = global.ResizeObserver;
            const originalWindowResizeObserver = window.ResizeObserver;
            delete global.ResizeObserver;
            delete window.ResizeObserver;

            const container = document.createElement('div');
            let viewer;
            expect(() => {
                viewer = new InteractiveBlueprintViewer(mockRoot, 'VALID_BP_STRING', container);
            }).not.toThrow();
            expect(viewer.resizeObserver).toBeFalsy();

            if (viewer) viewer.cleanup();
            global.ResizeObserver = originalResizeObserver;
            window.ResizeObserver = originalWindowResizeObserver;
        });

        it('zooms out on positive deltaY and clamps zoom between 0.02 and 10.0', () => {
            const container = document.createElement('div');
            const viewer = new InteractiveBlueprintViewer(mockRoot, 'VALID_BP_STRING', container);
            viewer.zoom = 1;

            // Zoom out once
            viewer.onWheel({ preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 0, clientY: 0, deltaY: 100 });
            expect(viewer.zoom).toBeCloseTo(0.85);

            // Zoom out repeatedly to hit min clamp 0.02
            for (let i = 0; i < 40; i++) {
                viewer.onWheel({ preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 0, clientY: 0, deltaY: 100 });
            }
            expect(viewer.zoom).toBe(0.02);

            // Zoom in repeatedly to hit max clamp 10.0
            for (let i = 0; i < 50; i++) {
                viewer.onWheel({ preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 0, clientY: 0, deltaY: -100 });
            }
            expect(viewer.zoom).toBe(10);

            viewer.cleanup();
        });

        it('detaches canvas from container on cleanup', () => {
            const container = document.createElement('div');
            const viewer = new InteractiveBlueprintViewer(mockRoot, 'VALID_BP_STRING', container);
            expect(container.contains(viewer.canvas)).toBe(true);

            viewer.cleanup();
            expect(container.contains(viewer.canvas)).toBe(false);
        });

        it('returns early in render if DrawParameters or Vector are missing on shapez', () => {
            const originalDrawParameters = global.shapez.DrawParameters;
            delete global.shapez.DrawParameters;

            const container = document.createElement('div');
            const viewer = new InteractiveBlueprintViewer(mockRoot, 'VALID_BP_STRING', container);
            expect(() => viewer.render()).not.toThrow();

            global.shapez.DrawParameters = originalDrawParameters;
            viewer.cleanup();
        });
    });

    describe('openBlueprintPreviewDialog - recenter tracking', () => {
        it('binds recenter button using dialog.trackClicks if available', () => {
            let createdDialog = null;
            global.shapez.Dialog = vi.fn().mockImplementation(function (opts) {
                const el = document.createElement('div');
                el.innerHTML = opts.contentHTML;
                this.element = el;
                this.dialogElem = document.createElement('div');
                this.buttonSignals = { equip: { add: vi.fn() } };
                this.closeRequested = { add: vi.fn() };
                this.trackClicks = vi.fn();
                createdDialog = this;
                return this;
            });

            const bp = { id: 'bp1', name: 'Test Blueprint', value: 'VALID_BP_STRING' };
            openBlueprintPreviewDialog(mockRoot, bp);

            const recenterBtn = createdDialog.element.querySelector('.bplib-preview-recenter-btn');
            expect(recenterBtn).not.toBeNull();
            expect(createdDialog.trackClicks).toHaveBeenCalledWith(recenterBtn, expect.any(Function));
        });
    });

    describe('deserializeBlueprintEntities', () => {
        it('returns {entities: null, failedDueToUnlock: false} for null or undefined input', () => {
            expect(deserializeBlueprintEntities(mockRoot, null)).toEqual({ entities: null, failedDueToUnlock: false });
            expect(deserializeBlueprintEntities(mockRoot, undefined)).toEqual({ entities: null, failedDueToUnlock: false });
        });

        it('returns the array unchanged with failedDueToUnlock false when given an already-deserialized array', () => {
            const result = deserializeBlueprintEntities(mockRoot, mockEntities);
            expect(result).toEqual({ entities: mockEntities, failedDueToUnlock: false });
        });

        it('returns {entities: null, failedDueToUnlock: false} when the bp-string mod is not loaded', () => {
            global.shapez.BlueprintLibraryModLoader = { mods: [] };
            const result = deserializeBlueprintEntities(mockRoot, 'BP_STRING');
            expect(result).toEqual({ entities: null, failedDueToUnlock: false });
        });

        it('returns the deserialized entities with failedDueToUnlock false on success', () => {
            const result = deserializeBlueprintEntities(mockRoot, 'VALID_BP_STRING');
            expect(result).toEqual({ entities: mockEntities, failedDueToUnlock: false });
        });

        it('returns {entities: null, failedDueToUnlock: false} when deserialize itself returns a falsy value', () => {
            mockBpMod.constructor.deserialize.mockReturnValueOnce(null);
            const result = deserializeBlueprintEntities(mockRoot, 'EMPTY_RESULT_BP_STRING');
            expect(result).toEqual({ entities: null, failedDueToUnlock: false });
        });

        it('returns {entities: null, failedDueToUnlock: true} when deserialize throws, without leaking the exception', () => {
            mockBpMod.constructor.deserialize.mockImplementationOnce(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            let result;
            expect(() => { result = deserializeBlueprintEntities(mockRoot, 'RESEARCH_GATED_BP_STRING'); }).not.toThrow();
            expect(result).toEqual({ entities: null, failedDueToUnlock: true });
        });
    });

    describe('classifyDeserializeFailure', () => {
        it('classifies as "locked" when the error names a variant absent from the building registry\'s available variants', () => {
            global.shapez.gMetaBuildingRegistry = {
                findById: vi.fn().mockReturnValue({
                    getAvailableVariants: vi.fn().mockReturnValue(['default', 'merger'])
                })
            };
            const err = new Error('AssertionError: Unknown balancer variant: splitter');

            const result = classifyDeserializeFailure(mockRoot, err);

            expect(result).toEqual({ kind: 'locked', buildingId: 'balancer', variant: 'splitter' });
        });

        it('classifies as "likely-incompatibility" when the error names a variant the registry reports as available', () => {
            global.shapez.gMetaBuildingRegistry = {
                findById: vi.fn().mockReturnValue({
                    getAvailableVariants: vi.fn().mockReturnValue(['default', 'merger', 'splitter'])
                })
            };
            const err = new Error('AssertionError: Unknown balancer variant: splitter');

            const result = classifyDeserializeFailure(mockRoot, err);

            expect(result).toEqual({ kind: 'likely-incompatibility', buildingId: 'balancer', variant: 'splitter' });
        });

        it('classifies as "unrecognized" when the error message does not match the "Unknown X variant: Y" pattern', () => {
            const err = new TypeError("Cannot read properties of undefined (reading 'code')");

            const result = classifyDeserializeFailure(mockRoot, err);

            expect(result).toEqual({ kind: 'unrecognized', buildingId: null, variant: null });
        });

        it('classifies as "unrecognized" (but keeps the parsed buildingId/variant) when the registry is unavailable', () => {
            delete global.shapez.gMetaBuildingRegistry;
            const err = new Error('AssertionError: Unknown balancer variant: splitter');

            const result = classifyDeserializeFailure(mockRoot, err);

            expect(result).toEqual({ kind: 'unrecognized', buildingId: 'balancer', variant: 'splitter' });
        });

        it('classifies as "unrecognized" when the registry lookup throws', () => {
            global.shapez.gMetaBuildingRegistry = {
                findById: vi.fn().mockImplementation(() => { throw new Error('registry not ready'); })
            };
            const err = new Error('AssertionError: Unknown balancer variant: splitter');

            const result = classifyDeserializeFailure(mockRoot, err);

            expect(result).toEqual({ kind: 'unrecognized', buildingId: 'balancer', variant: 'splitter' });
        });
    });

    describe('logDeserializeFailure', () => {
        it('logs a "not currently unlocked" warning for kind "locked"', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            global.shapez.gMetaBuildingRegistry = {
                findById: vi.fn().mockReturnValue({
                    getAvailableVariants: vi.fn().mockReturnValue(['default'])
                })
            };
            const err = new Error('AssertionError: Unknown balancer variant: splitter');

            logDeserializeFailure(mockRoot, err);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                "[BlueprintBook] Blueprint deserialize failed: balancer:splitter is not in this building's currently available variants — treating as locked/unresearched content.",
                err
            );
            consoleWarnSpy.mockRestore();
        });

        it('logs a "likely a compatibility issue" warning for kind "likely-incompatibility"', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            global.shapez.gMetaBuildingRegistry = {
                findById: vi.fn().mockReturnValue({
                    getAvailableVariants: vi.fn().mockReturnValue(['default', 'splitter'])
                })
            };
            const err = new Error('AssertionError: Unknown balancer variant: splitter');

            logDeserializeFailure(mockRoot, err);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                "[BlueprintBook] Blueprint deserialize failed: balancer:splitter IS listed as available, so this isn't a content lock — likely a compatibility issue with another mod's building patch. Treating as locked anyway (fail-open) so equip stays blocked rather than crashing.",
                err
            );
            consoleWarnSpy.mockRestore();
        });

        it('logs an "unrecognized reason" warning for kind "unrecognized"', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            delete global.shapez.gMetaBuildingRegistry;
            const err = new TypeError("Cannot read properties of undefined (reading 'code')");

            logDeserializeFailure(mockRoot, err);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                "[BlueprintBook] Blueprint deserialize failed for an unrecognized reason — treating as locked (fail-open).",
                err
            );
            consoleWarnSpy.mockRestore();
        });
    });

    describe('renderBlueprintCostElement', () => {
        it('renders one .requirement child per entry, with amounts in order', () => {
            const cost = [
                { shapeKey: 'CuCuCuCu', amount: 30 },
                { shapeKey: 'CuCuCuCu', amount: 20 }
            ];

            const el = renderBlueprintCostElement(mockRoot, cost);
            const requirements = el.querySelectorAll('.requirement');
            expect(requirements.length).toBe(2);
            expect(requirements[0].querySelector('.amount').textContent).toBe('30');
            expect(requirements[1].querySelector('.amount').textContent).toBe('20');
        });

        it('renders a .shape child containing the generated canvas for a resolvable key', () => {
            const canvas = document.createElement('canvas');
            mockRoot.shapeDefinitionMgr.getShapeFromShortKey.mockReturnValue({
                generateAsCanvas: vi.fn().mockReturnValue(canvas)
            });

            const cost = [{ shapeKey: 'CuCuCuCu', amount: 30 }];
            const el = renderBlueprintCostElement(mockRoot, cost);
            const req = el.querySelector('.requirement');
            const shapeDiv = req.querySelector('.shape');
            expect(shapeDiv).not.toBeNull();
            expect(shapeDiv.querySelector('canvas')).toBe(canvas);
        });

        it('renders amount-only, no .shape child, when entry shapeKey is null', () => {
            const cost = [{ shapeKey: null, amount: 15 }];
            const el = renderBlueprintCostElement(mockRoot, cost);
            const req = el.querySelector('.requirement');
            expect(req.querySelector('.shape')).toBeNull();
            expect(req.querySelector('.amount').textContent).toBe('15');
        });

        it('renders amount-only without throwing when getShapeFromShortKey fails', () => {
            mockRoot.shapeDefinitionMgr.getShapeFromShortKey.mockImplementation(() => {
                throw new Error('bad key');
            });

            const cost = [{ shapeKey: 'BadKey', amount: 10 }];
            let el;
            expect(() => { el = renderBlueprintCostElement(mockRoot, cost); }).not.toThrow();
            const req = el.querySelector('.requirement');
            expect(req.querySelector('.shape')).toBeNull();
            expect(req.querySelector('.amount').textContent).toBe('10');
        });

        it('returns an empty .requirements container for null, undefined, and []', () => {
            for (const cost of [null, undefined, []]) {
                const el = renderBlueprintCostElement(mockRoot, cost);
                expect(el.classList.contains('requirements')).toBe(true);
                expect(el.querySelectorAll('.requirement').length).toBe(0);
            }
        });
    });

    describe('findModById', () => {
        it('returns the mod when found in the loader list', () => {
            const targetMod = { metadata: { id: 'target-mod' } };
            global.shapez.BlueprintLibraryModLoader = {
                mods: [mockBpMod, targetMod]
            };

            const result = findModById('target-mod');
            expect(result).toBe(targetMod);
        });

        it('returns null when mod is not found', () => {
            global.shapez.BlueprintLibraryModLoader = {
                mods: [mockBpMod]
            };

            const result = findModById('non-existent-mod');
            expect(result).toBeNull();
        });

        it('returns null when BlueprintLibraryModLoader is undefined', () => {
            delete global.shapez.BlueprintLibraryModLoader;

            const result = findModById('any-mod');
            expect(result).toBeNull();
        });

        it('returns null when mods array is not an array', () => {
            global.shapez.BlueprintLibraryModLoader = {
                mods: null
            };

            const result = findModById('any-mod');
            expect(result).toBeNull();
        });
    });

    describe('resolveCostShapeKeys', () => {
        it('returns single-element array with getBlueprintShapeKey() when no Industries mod is loaded', () => {
            global.shapez.BlueprintLibraryModLoader = {
                mods: [mockBpMod]
            };
            mockRoot.gameMode.getBlueprintShapeKey.mockReturnValue('CuCuCuCu');

            const result = resolveCostShapeKeys(mockRoot);
            expect(result).toEqual(['CuCuCuCu']);
        });

        it('falls back to "CuCuCuCu" when getBlueprintShapeKey is absent', () => {
            global.shapez.BlueprintLibraryModLoader = {
                mods: [mockBpMod]
            };
            mockRoot.gameMode = {};

            const result = resolveCostShapeKeys(mockRoot);
            expect(result).toEqual(['CuCuCuCu']);
        });

        it('falls back to "CuCuCuCu" when getBlueprintShapeKey throws', () => {
            global.shapez.BlueprintLibraryModLoader = {
                mods: [mockBpMod]
            };
            mockRoot.gameMode.getBlueprintShapeKey.mockImplementation(() => {
                throw new Error('getBlueprintShapeKey error');
            });

            const result = resolveCostShapeKeys(mockRoot);
            expect(result).toEqual(['CuCuCuCu']);
        });

        it('returns all three Industries cost shape keys when Industries mod is loaded', () => {
            const industriesMod = { metadata: { id: 'shapez-industries' } };
            global.shapez.BlueprintLibraryModLoader = {
                mods: [mockBpMod, industriesMod]
            };

            const result = resolveCostShapeKeys(mockRoot);
            expect(result).toEqual([
                'Sb----Sb:CbCbCbCb:--CwCw--',
                'Sb----Sb:3b3b3b3b:--3w3w--',
                'SbSbSbSb:1b1b1b1b:--CwCw--'
            ]);
        });

        it('returns single-element array when BlueprintLibraryModLoader is undefined', () => {
            delete global.shapez.BlueprintLibraryModLoader;
            mockRoot.gameMode.getBlueprintShapeKey.mockReturnValue('CuCuCuCu');

            const result = resolveCostShapeKeys(mockRoot);
            expect(result).toEqual(['CuCuCuCu']);
        });

        it('returns single-element array when BlueprintLibraryModLoader is undefined with fallback', () => {
            delete global.shapez.BlueprintLibraryModLoader;
            mockRoot.gameMode = {};

            const result = resolveCostShapeKeys(mockRoot);
            expect(result).toEqual(['CuCuCuCu']);
        });
    });

    describe('getBlueprintCost', () => {
        it('normalizes a numeric getCost() into a single-entry array using the blueprint shape key', () => {
            global.shapez.Blueprint = class {
                constructor(entities) { this.entities = entities; }
                getCost() { return 42; }
            };

            const result = getBlueprintCost(mockRoot, 'VALID_BP_STRING');
            expect(result).toEqual([{ shapeKey: 'CuCuCuCu', amount: 42 }]);
        });

        it('normalizes an array getCost() into entries with Industries keys, dropping zero amounts', () => {
            const industriesMod = { metadata: { id: 'shapez-industries' } };
            global.shapez.BlueprintLibraryModLoader = {
                mods: [mockBpMod, industriesMod]
            };
            global.shapez.Blueprint = class {
                constructor(entities) { this.entities = entities; }
                getCost() { return [30, 20, 0]; }
            };

            const result = getBlueprintCost(mockRoot, 'VALID_BP_STRING');
            expect(result).toEqual([
                { shapeKey: 'Sb----Sb:CbCbCbCb:--CwCw--', amount: 30 },
                { shapeKey: 'Sb----Sb:3b3b3b3b:--3w3w--', amount: 20 }
            ]);
        });

        it('collapses an all-zero cost array into a single zero entry so it still renders', () => {
            const industriesMod = { metadata: { id: 'shapez-industries' } };
            global.shapez.BlueprintLibraryModLoader = {
                mods: [mockBpMod, industriesMod]
            };
            global.shapez.Blueprint = class {
                constructor(entities) { this.entities = entities; }
                getCost() { return [0, 0, 0]; }
            };

            const result = getBlueprintCost(mockRoot, 'VALID_BP_STRING');
            expect(result).toEqual([
                { shapeKey: 'Sb----Sb:CbCbCbCb:--CwCw--', amount: 0 }
            ]);
        });

        it('returns a single zero entry for free copy/paste, matching prior zero-cost parity', () => {
            mockRoot.gameMode.getHasFreeCopyPaste.mockReturnValue(true);

            const result = getBlueprintCost(mockRoot, 'VALID_BP_STRING');
            expect(result).toEqual([{ shapeKey: 'CuCuCuCu', amount: 0 }]);
        });

        it('returns null when getCost() throws', () => {
            global.shapez.Blueprint = class {
                constructor(entities) { this.entities = entities; }
                getCost() { throw new Error('boom'); }
            };

            const result = getBlueprintCost(mockRoot, 'VALID_BP_STRING');
            expect(result).toBeNull();
        });

        it('returns null when entities fail to deserialize', () => {
            mockBpMod.constructor.deserialize.mockReturnValueOnce(null);

            const result = getBlueprintCost(mockRoot, 'INVALID_BP_STRING');
            expect(result).toBeNull();
        });

        it('returns null when getCost() returns a non-numeric, non-array value', () => {
            global.shapez.Blueprint = class {
                constructor(entities) { this.entities = entities; }
                getCost() { return { totally: 'not a cost' }; }
            };

            expect(getBlueprintCost(mockRoot, 'VALID_BP_STRING')).toBeNull();

            global.shapez.Blueprint = class {
                constructor(entities) { this.entities = entities; }
                getCost() { return NaN; }
            };

            expect(getBlueprintCost(mockRoot, 'VALID_BP_STRING')).toBeNull();
        });

        it('assigns shapeKey: null to surplus entries beyond the known key list', () => {
            const industriesMod = { metadata: { id: 'shapez-industries' } };
            global.shapez.BlueprintLibraryModLoader = {
                mods: [mockBpMod, industriesMod]
            };
            global.shapez.Blueprint = class {
                constructor(entities) { this.entities = entities; }
                getCost() { return [10, 10, 10, 10]; }
            };

            const result = getBlueprintCost(mockRoot, 'VALID_BP_STRING');
            expect(result).toEqual([
                { shapeKey: 'Sb----Sb:CbCbCbCb:--CwCw--', amount: 10 },
                { shapeKey: 'Sb----Sb:3b3b3b3b:--3w3w--', amount: 10 },
                { shapeKey: 'SbSbSbSb:1b1b1b1b:--CwCw--', amount: 10 },
                { shapeKey: null, amount: 10 }
            ]);
        });

        it('returns null when deserialize throws due to locked/unresearched content', () => {
            mockBpMod.constructor.deserialize.mockImplementationOnce(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            const result = getBlueprintCost(mockRoot, 'RESEARCH_GATED_BP_STRING');
            expect(result).toBeNull();
        });
    });

    describe('getBlueprintEntityCount', () => {
        it('returns the entity count on successful deserialize', () => {
            const result = getBlueprintEntityCount(mockRoot, 'VALID_BP_STRING');
            expect(result).toBe(mockEntities.length);
        });

        it('returns 0 when entities fail to deserialize', () => {
            mockBpMod.constructor.deserialize.mockReturnValueOnce(null);
            const result = getBlueprintEntityCount(mockRoot, 'INVALID_BP_STRING');
            expect(result).toBe(0);
        });

        it('returns 0 when deserialize throws due to locked/unresearched content', () => {
            mockBpMod.constructor.deserialize.mockImplementationOnce(() => {
                throw new Error('AssertionError: Unknown balancer variant: merger-inverse');
            });

            const result = getBlueprintEntityCount(mockRoot, 'RESEARCH_GATED_BP_STRING');
            expect(result).toBe(0);
        });
    });
});


