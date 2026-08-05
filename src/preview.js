export function resolveBpStringMod(root) {
    if (!root) return null;
    const modLoader = shapez.BlueprintLibraryModLoader;
    if (!modLoader || !Array.isArray(modLoader.mods)) return null;
    return modLoader.mods.find(m => m.metadata.id === "bp-string") || null;
}

export function deserializeBlueprintEntities(root, blueprintInput) {
    if (!blueprintInput) return null;
    if (Array.isArray(blueprintInput)) return blueprintInput;
    const bpMod = resolveBpStringMod(root);
    if (!bpMod) return null;
    try {
        return bpMod.constructor.deserialize(root, blueprintInput) || null;
    } catch {
        return null;
    }
}

export function getBlueprintEntityCount(root, blueprintInput) {
    const entities = deserializeBlueprintEntities(root, blueprintInput);
    return entities ? entities.length : 0;
}

export function getBlueprintCost(root, blueprintInput) {
    if (!root) return null;
    if (root.gameMode && typeof root.gameMode.getHasFreeCopyPaste === "function" && root.gameMode.getHasFreeCopyPaste()) {
        return 0;
    }
    const entities = deserializeBlueprintEntities(root, blueprintInput);
    if (!entities) return null;
    try {
        const bp = new shapez.Blueprint(entities);
        return typeof bp.getCost === "function" ? bp.getCost() : null;
    } catch {
        return null;
    }
}

/**
 * Manages an interactive preview canvas supporting pan, zoom, and recenter.
 */
export class InteractiveBlueprintViewer {
    /** @type {(e: PointerEvent) => void} */
    onPointerDown;
    /** @type {(e: PointerEvent) => void} */
    onPointerMove;
    /** @type {(e: PointerEvent) => void} */
    onPointerUp;
    /** @type {(e: WheelEvent) => void} */
    onWheel;
    dragStartX = 0;
    dragStartY = 0;

    constructor(root, blueprintInput, containerElem) {
        this.root = root;
        this.blueprintInput = blueprintInput;
        this.containerElem = containerElem;

        this.canvas = document.createElement("canvas");
        if (this.containerElem) {
            this.containerElem.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext("2d");

        this.entities = [];
        this.bounds = { minX: 0, minY: 0, tilesW: 1, tilesH: 1 };

        this.panX = 0;
        this.panY = 0;
        this.zoom = 1;
        this.baseScale = 1;

        this.initEntities();
        this.setupEvents();
        this.resize();
        this.recenter();
    }

    initEntities() {
        if (!this.root) return;

        try {
            this.entities = deserializeBlueprintEntities(this.root, this.blueprintInput) || [];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < this.entities.length; ++i) {
                const staticComp = this.entities[i]?.components?.StaticMapEntity;
                if (!staticComp) continue;
                const b = staticComp.getTileSpaceBounds();
                if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
                const bw = typeof b.w === "number" ? b.w : (typeof b.width === "number" ? b.width : 1);
                const bh = typeof b.h === "number" ? b.h : (typeof b.height === "number" ? b.height : 1);
                minX = Math.min(minX, b.x);
                minY = Math.min(minY, b.y);
                maxX = Math.max(maxX, b.x + bw);
                maxY = Math.max(maxY, b.y + bh);
            }
            if (minX !== Infinity) {
                this.bounds = {
                    minX, minY,
                    tilesW: Math.max(1, maxX - minX),
                    tilesH: Math.max(1, maxY - minY)
                };
            }
        } catch (err) {
            console.error("[BlueprintBook] Error deserializing for viewer:", err);
        }
    }

    resize() {
        const rect = this.containerElem ? this.containerElem.getBoundingClientRect() : { width: 0, height: 0 };
        const clientW = this.containerElem ? (this.containerElem.clientWidth || rect.width) : rect.width;
        const clientH = this.containerElem ? (this.containerElem.clientHeight || rect.height) : rect.height;
        const newW = Math.max(300, Math.floor(clientW || 580));
        const newH = Math.max(200, Math.floor(clientH || 380));

        if (this.canvas.width !== newW || this.canvas.height !== newH) {
            this.canvas.width = newW;
            this.canvas.height = newH;
        }

        const tileSizePx = 32;
        const availableW = Math.max(1, this.canvas.width - 40);
        const availableH = Math.max(1, this.canvas.height - 40);
        this.baseScale = Math.min(
            availableW / (this.bounds.tilesW * tileSizePx),
            availableH / (this.bounds.tilesH * tileSizePx)
        );

        this.render();
    }

    recenter() {
        this.resize();
        this.zoom = 1;
        const tileSizePx = 32;
        const totalW = this.bounds.tilesW * tileSizePx * this.baseScale;
        const totalH = this.bounds.tilesH * tileSizePx * this.baseScale;

        this.panX = (this.canvas.width - totalW) / 2;
        this.panY = (this.canvas.height - totalH) / 2;
        this.render();
    }

    setupEvents() {
        this.canvas.style.pointerEvents = "auto";
        this.canvas.style.cursor = "grab";
        this.canvas.style.touchAction = "none";
        this.canvas.style.userSelect = "none";

        this.onPointerDown = (e) => {
            e.stopPropagation();
            const target = /** @type {Element|null} */ (e.target);
            if (target && typeof target.setPointerCapture === "function") {
                try { target.setPointerCapture(e.pointerId); } catch (err) {}
            }
            this.isDragging = true;
            this.dragStartX = e.clientX - this.panX;
            this.dragStartY = e.clientY - this.panY;
            this.canvas.style.cursor = "grabbing";
        };

        this.onPointerMove = (e) => {
            if (!this.isDragging) return;
            e.stopPropagation();
            this.panX = e.clientX - this.dragStartX;
            this.panY = e.clientY - this.dragStartY;
            this.render();
        };

        this.onPointerUp = (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            const target = /** @type {Element|null} */ (e.target);
            if (target && typeof target.releasePointerCapture === "function") {
                try { target.releasePointerCapture(e.pointerId); } catch (err) {}
            }
            this.canvas.style.cursor = "grab";
        };

        this.onWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
            const newZoom = Math.min(10, Math.max(0.02, this.zoom * zoomFactor));

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = rect.width > 0 ? this.canvas.width / rect.width : 1;
            const scaleY = rect.height > 0 ? this.canvas.height / rect.height : 1;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
            this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
            this.zoom = newZoom;

            this.render();
        };

        this.canvas.addEventListener("pointerdown", this.onPointerDown);
        window.addEventListener("pointermove", this.onPointerMove);
        window.addEventListener("pointerup", this.onPointerUp);
        this.canvas.addEventListener("wheel", this.onWheel, { passive: false });

        // Use the same constructor reference we checked for existence, rather than the
        // bare global, in case the two ever diverge (e.g. non-window global contexts).
        const ResizeObserverCtor = typeof window !== "undefined" ? window.ResizeObserver : undefined;
        if (ResizeObserverCtor && this.containerElem) {
            let lastW = 0;
            let lastH = 0;
            this.resizeObserver = new ResizeObserverCtor((entries) => {
                if (entries.length === 0) {
                    this.resize();
                    return;
                }
                for (const entry of entries) {
                    const w = Math.floor(entry.contentRect.width || 0);
                    const h = Math.floor(entry.contentRect.height || 0);
                    if (w > 0 && h > 0 && (Math.abs(w - lastW) > 5 || Math.abs(h - lastH) > 5)) {
                        lastW = w;
                        lastH = h;
                        this.resize();
                    }
                }
            });
            this.resizeObserver.observe(this.containerElem);
        }
    }

    cleanup() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        this.canvas.removeEventListener("pointerdown", this.onPointerDown);
        if (typeof window !== "undefined") {
            window.removeEventListener("pointermove", this.onPointerMove);
            window.removeEventListener("pointerup", this.onPointerUp);
        }
        this.canvas.removeEventListener("wheel", this.onWheel);
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }

    render() {
        if (!this.ctx) return;
        if (!shapez.DrawParameters || !shapez.Vector || !shapez.Rectangle) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        const mapBgColor = (shapez.THEMES && shapez.THEMES.dark && shapez.THEMES.dark.map && shapez.THEMES.dark.map.background) || "#1c2333";
        this.ctx.fillStyle = mapBgColor;
        this.ctx.fillRect(0, 0, w, h);

        if (this.entities.length === 0) return;

        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);

        const currentScale = this.baseScale * this.zoom;
        this.ctx.scale(currentScale, currentScale);

        const parameters = new shapez.DrawParameters({
            context: this.ctx,
            visibleRect: new shapez.Rectangle(-10000, -10000, 20000, 20000),
            desiredAtlasScale: shapez.ORIGINAL_SPRITE_SCALE || "0.75",
            zoomLevel: currentScale,
            root: this.root
        });

        const minVector = new shapez.Vector(this.bounds.minX, this.bounds.minY);
        for (let i = 0; i < this.entities.length; ++i) {
            const staticComp = this.entities[i]?.components?.StaticMapEntity;
            if (!staticComp) continue;
            if (!staticComp.origin || typeof staticComp.origin.sub !== "function") continue;

            const relativeOrigin = staticComp.origin.sub(minVector);
            const meta = typeof staticComp.getMetaBuilding === "function" ? staticComp.getMetaBuilding() : null;
            const rotationVariant = typeof staticComp.getRotationVariant === "function" ? staticComp.getRotationVariant() : 0;
            const sprite = (typeof staticComp.getSprite === "function" && staticComp.getSprite()) ||
                (meta && typeof meta.getPreviewSprite === "function" && meta.getPreviewSprite(rotationVariant, staticComp.getVariant ? staticComp.getVariant() : undefined)) ||
                (typeof staticComp.getBlueprintSprite === "function" && staticComp.getBlueprintSprite());

            if (sprite && typeof staticComp.drawSpriteOnBoundsClipped === "function") {
                staticComp.drawSpriteOnBoundsClipped(parameters, sprite, 0, relativeOrigin);
            }
        }

        this.ctx.restore();
    }
}

/**
 * Renders a blueprint cost element using the native Shapez HUD requirement pipeline.
 * @param {object} root
 * @param {number|null|undefined} cost
 * @param {number=} iconSize
 */
export function renderBlueprintCostElement(root, cost, iconSize = 30) {
    const container = document.createElement("div");
    container.className = "requirements";

    if (cost === null || cost === undefined) {
        return container;
    }

    const req = document.createElement("div");
    req.className = "requirement";

    const shapeDiv = document.createElement("div");
    shapeDiv.className = "shape";

    if (root && root.shapeDefinitionMgr && root.gameMode) {
        try {
            const shapeKey = typeof root.gameMode.getBlueprintShapeKey === "function"
                ? root.gameMode.getBlueprintShapeKey()
                : "CuCuCuCu";
            const costShape = root.shapeDefinitionMgr.getShapeFromShortKey(shapeKey);
            if (costShape && typeof costShape.generateAsCanvas === "function") {
                const canvas = costShape.generateAsCanvas(iconSize);
                shapeDiv.appendChild(canvas);
            }
        } catch (e) {
            // Ignore shape canvas errors
        }
    }

    const amountDiv = document.createElement("div");
    amountDiv.className = "amount";
    amountDiv.textContent = `${cost}`;

    req.appendChild(shapeDiv);
    req.appendChild(amountDiv);
    container.appendChild(req);

    return container;
}

/**
 * Opens a modal dialog showing an interactive canvas preview of a blueprint.
 * @param {object} root 
 * @param {object} blueprint 
 * @param {function=} onEquip 
 */
export function openBlueprintPreviewDialog(root, blueprint, onEquip) {
    if (!root || !blueprint) return;

    const entities = deserializeBlueprintEntities(root, blueprint.value || blueprint);
    const entityCount = getBlueprintEntityCount(root, entities);
    const cost = getBlueprintCost(root, entities);

    const previewHtml = `
        <div class="bplib-preview-dialog-content">
            <div class="bplib-preview-canvas-container">
                <button class="button styledButton bplib-preview-recenter-btn">Recenter</button>
            </div>
            <div class="bplib-preview-footer">
                <div class="bplib-preview-stats">
                    <div class="stat-item"><span class="label">Buildings:</span> <strong>${entityCount}</strong></div>
                    <div class="stat-item bplib-preview-cost-slot"></div>
                </div>
            </div>
        </div>
    `;

    if (shapez.T.dialogs.buttons) {
        shapez.T.dialogs.buttons.equip = "EQUIP";
    }

    let viewer = null;

    const dialog = new shapez.Dialog({
        app: root.app,
        title: blueprint.name || "Blueprint Preview",
        contentHTML: previewHtml,
        buttons: ["cancel:bad", "equip:good"]
    });

    if (dialog.buttonSignals.equip) {
        dialog.buttonSignals.equip.add(() => {
            const locked = getLockedEntitiesInBlueprint(root, entities || blueprint);
            if (locked.length > 0) return;
            if (viewer) {
                try { viewer.cleanup(); } catch (e) {}
            }
            if (typeof onEquip === "function") onEquip();
        });
    }

    if (root.hud && root.hud.parts && root.hud.parts.dialogs) {
        root.hud.parts.dialogs.internalShowDialog(dialog);
    }

    if (dialog.dialogElem) {
        dialog.dialogElem.classList.add("dialogUpgrades");
    }

    // Force equip button text if translation key fails in runtime
    if (dialog.element) {
        const buttons = dialog.element.querySelectorAll(".buttons button, .button.good");
        buttons.forEach(btn => {
            if (btn.classList.contains("good") || btn.dataset.button === "equip" || btn.textContent.includes("UNDEFINED")) {
                btn.textContent = "EQUIP";
            }
        });
    }

    // Move stats into bottom button row on the left side
    if (dialog.element) {
        const buttonsDiv = dialog.element.querySelector(".buttons");
        const statsElem = dialog.element.querySelector(".bplib-preview-stats");
        if (buttonsDiv && statsElem && statsElem.parentNode !== buttonsDiv) {
            buttonsDiv.insertBefore(statsElem, buttonsDiv.firstChild);
        }

        const costSlot = dialog.element.querySelector(".bplib-preview-cost-slot");
        if (costSlot && cost !== null) {
            const labelSpan = document.createElement("span");
            labelSpan.className = "label bplib-preview-cost-label";
            labelSpan.textContent = "Cost:";
            costSlot.appendChild(labelSpan);

            const costElem = renderBlueprintCostElement(root, cost, 24);
            costSlot.appendChild(costElem);
        }

        const lockedEntities = getLockedEntitiesInBlueprint(root, entities || blueprint);
        if (lockedEntities.length > 0) {
            const statsContainer = dialog.element.querySelector(".bplib-preview-stats");
            if (statsContainer) {
                const warningElem = document.createElement("span");
                warningElem.className = "bplib-preview-locked-warning";
                warningElem.textContent = "⚠️ Contains locked buildings";
                statsContainer.appendChild(warningElem);
            }

            const equipBtn = Array.from(dialog.element.querySelectorAll(".buttons button, .button.good, button")).find(btn =>
                btn.classList.contains("good") || btn.dataset.button === "equip" || btn.textContent.trim() === "EQUIP"
            );
            if (equipBtn) {
                equipBtn.disabled = true;
                equipBtn.classList.add("disabled");
                equipBtn.title = "Contains locked buildings (unlocked at higher level)";
            }
        }
    }

    // After internalShowDialog, dialog.element is the live DOM. Attach viewer to it.
    const liveContainer = dialog.element.querySelector(".bplib-preview-canvas-container");
    if (liveContainer) {
        viewer = new InteractiveBlueprintViewer(root, entities || blueprint.value, liveContainer);

        // Defer resize & recenter to next frame when container bounding box is rendered
        if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(() => {
                viewer.resize();
                viewer.recenter();
            });
        }

        const recenterBtn = dialog.element.querySelector(".bplib-preview-recenter-btn");
        if (recenterBtn) {
            if (typeof dialog.trackClicks === "function") {
                dialog.trackClicks(recenterBtn, () => viewer.recenter());
            } else {
                recenterBtn.addEventListener("click", () => viewer.recenter());
            }
        }

        // Clean up viewer when dialog closes
        if (dialog.closeRequested) {
            dialog.closeRequested.add(() => {
                try { viewer.cleanup(); } catch (e) { /* ignore */ }
            });
        }
    }
}

/**
 * Inspects blueprint entities and returns an array of locked building entities.
 * @param {object} root 
 * @param {any} blueprintInput 
 * @returns {Array}
 */
export function getLockedEntitiesInBlueprint(root, blueprintInput) {
    const input = (blueprintInput && typeof blueprintInput === "object" && !Array.isArray(blueprintInput) && blueprintInput.value)
        ? blueprintInput.value
        : blueprintInput;
    const entities = deserializeBlueprintEntities(root, input);
    if (!entities || !Array.isArray(entities)) return [];

    const locked = [];
    for (let i = 0; i < entities.length; ++i) {
        const entity = entities[i];
        const staticComp = entity?.components?.StaticMapEntity;
        if (!staticComp) continue;

        const metaBuilding = typeof staticComp.getMetaBuilding === "function"
            ? staticComp.getMetaBuilding()
            : null;
        if (!metaBuilding) continue;

        const isUnlocked = typeof metaBuilding.getIsUnlocked === "function"
            ? metaBuilding.getIsUnlocked(root)
            : true;

        const variant = typeof staticComp.getVariant === "function"
            ? staticComp.getVariant()
            : (staticComp.variant || "default");

        const availableVariants = typeof metaBuilding.getAvailableVariants === "function"
            ? metaBuilding.getAvailableVariants(root)
            : [variant];

        const isVariantUnlocked = Array.isArray(availableVariants) && availableVariants.includes(variant);

        if (!isUnlocked || !isVariantUnlocked) {
            locked.push(entity);
        }
    }
    return locked;
}

