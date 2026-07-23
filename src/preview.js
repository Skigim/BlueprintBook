export function getBlueprintEntityCount(root, blueprintString) {
    const gShapez = (typeof globalThis !== "undefined" && globalThis.shapez) || (typeof window !== "undefined" && window.shapez);
    if (!gShapez || !root) return 0;
    const modLoader = gShapez.BlueprintLibraryModLoader;
    if (!modLoader || !Array.isArray(modLoader.mods)) return 0;
    const bpMod = modLoader.mods.find(m => m.metadata?.id === "bp-string");
    if (!bpMod) return 0;
    try {
        const entities = bpMod.constructor.deserialize(root, blueprintString);
        return entities ? entities.length : 0;
    } catch {
        return 0;
    }
}

export function getBlueprintCost(root, blueprintString) {
    const gShapez = (typeof globalThis !== "undefined" && globalThis.shapez) || (typeof window !== "undefined" && window.shapez);
    if (!gShapez || !root) return null;
    if (root.gameMode && typeof root.gameMode.getHasFreeCopyPaste === "function" && root.gameMode.getHasFreeCopyPaste()) {
        return 0;
    }
    const modLoader = gShapez.BlueprintLibraryModLoader;
    if (!modLoader || !Array.isArray(modLoader.mods)) return null;
    const bpMod = modLoader.mods.find(m => m.metadata?.id === "bp-string");
    if (!bpMod) return null;
    try {
        const entities = bpMod.constructor.deserialize(root, blueprintString);
        if (!entities) return null;
        const bp = new gShapez.Blueprint(entities);
        return typeof bp.getCost === "function" ? bp.getCost() : null;
    } catch {
        return null;
    }
}

/**
 * Manages an interactive preview canvas supporting pan, zoom, and recenter.
 */
export class InteractiveBlueprintViewer {
    constructor(root, blueprintString, containerElem) {
        this.root = root;
        this.blueprintString = blueprintString;
        this.containerElem = containerElem;

        this.canvas = document.createElement("canvas");
        this.containerElem.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");

        this.entities = [];
        this.bounds = { minX: 0, minY: 0, tilesW: 1, tilesH: 1 };

        this.panX = 0;
        this.panY = 0;
        this.zoom = 1;
        this.baseScale = 1;

        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        this.initEntities();
        this.setupEvents();
        this.resize();
        this.recenter();
    }

    initEntities() {
        const gShapez = (typeof globalThis !== "undefined" && globalThis.shapez) || (typeof window !== "undefined" && window.shapez);
        if (!gShapez || !this.root) return;

        const modLoader = gShapez.BlueprintLibraryModLoader;
        if (!modLoader || !Array.isArray(modLoader.mods)) return;
        const bpMod = modLoader.mods.find(m => m.metadata?.id === "bp-string");
        if (!bpMod) return;

        try {
            this.entities = bpMod.constructor.deserialize(this.root, this.blueprintString) || [];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < this.entities.length; ++i) {
                const staticComp = this.entities[i].components?.StaticMapEntity;
                if (!staticComp) continue;
                const b = staticComp.getTileSpaceBounds();
                if (!b) continue;
                minX = Math.min(minX, b.x);
                minY = Math.min(minY, b.y);
                maxX = Math.max(maxX, b.x + b.width);
                maxY = Math.max(maxY, b.y + b.height);
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
        const rect = this.containerElem.getBoundingClientRect();
        this.canvas.width = Math.max(300, rect.width || 580);
        this.canvas.height = Math.max(200, rect.height || 380);

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
            if (e.target && typeof e.target.setPointerCapture === "function") {
                try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
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
            if (e.target && typeof e.target.releasePointerCapture === "function") {
                try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
            }
            this.canvas.style.cursor = "grab";
        };

        this.onWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
            const newZoom = Math.min(5, Math.max(0.2, this.zoom * zoomFactor));

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
            this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
            this.zoom = newZoom;

            this.render();
        };

        this.canvas.addEventListener("pointerdown", this.onPointerDown);
        window.addEventListener("pointermove", this.onPointerMove);
        window.addEventListener("pointerup", this.onPointerUp);
        this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    }

    cleanup() {
        this.canvas.removeEventListener("pointerdown", this.onPointerDown);
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("pointerup", this.onPointerUp);
        this.canvas.removeEventListener("wheel", this.onWheel);
    }

    render() {
        if (!this.ctx) return;
        const gShapez = (typeof globalThis !== "undefined" && globalThis.shapez) || (typeof window !== "undefined" && window.shapez);
        if (!gShapez) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        const mapBgColor = (gShapez.THEMES && gShapez.THEMES.dark && gShapez.THEMES.dark.map && gShapez.THEMES.dark.map.background) || "#1c2333";
        this.ctx.fillStyle = mapBgColor;
        this.ctx.fillRect(0, 0, w, h);

        if (!this.entities || this.entities.length === 0) return;

        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);

        const currentScale = this.baseScale * this.zoom;
        this.ctx.scale(currentScale, currentScale);

        const parameters = new gShapez.DrawParameters({
            context: this.ctx,
            visibleRect: new gShapez.Rectangle(-10000, -10000, 20000, 20000),
            desiredAtlasScale: gShapez.ORIGINAL_SPRITE_SCALE || "0.75",
            zoomLevel: currentScale,
            root: this.root
        });

        const minVector = new gShapez.Vector(this.bounds.minX, this.bounds.minY);
        for (let i = 0; i < this.entities.length; ++i) {
            const staticComp = this.entities[i].components?.StaticMapEntity;
            if (!staticComp) continue;

            const relativeOrigin = staticComp.origin.sub(minVector);
            const meta = typeof staticComp.getMetaBuilding === "function" ? staticComp.getMetaBuilding() : null;
            const sprite = (typeof staticComp.getSprite === "function" && staticComp.getSprite()) ||
                (meta && typeof meta.getPreviewSprite === "function" && meta.getPreviewSprite(staticComp.rotationVariant || 0, staticComp.getVariant ? staticComp.getVariant() : undefined)) ||
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
 * @param {number|null} cost 
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
    const gShapez = (typeof globalThis !== "undefined" && globalThis.shapez) || (typeof window !== "undefined" && window.shapez);
    if (!gShapez || !root) return;

    const entityCount = getBlueprintEntityCount(root, blueprint.value);
    const cost = getBlueprintCost(root, blueprint.value);

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

    if (gShapez.T && gShapez.T.dialogs && gShapez.T.dialogs.buttons) {
        gShapez.T.dialogs.buttons.equip = "EQUIP";
    }

    const dialog = new gShapez.Dialog({
        app: root.app,
        title: blueprint.name || "Blueprint Preview",
        contentHTML: previewHtml,
        buttons: ["cancel:bad", "equip:good:EQUIP"]
    });

    if (dialog.buttonSignals && dialog.buttonSignals.equip) {
        dialog.buttonSignals.equip.add(() => {
            if (root.hud && root.hud.parts && root.hud.parts.dialogs) {
                root.hud.parts.dialogs.closeDialog(dialog);
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

    // Render upgrade-style cost element into slot after internalShowDialog
    if (dialog.element) {
        const costSlot = dialog.element.querySelector(".bplib-preview-cost-slot");
        if (costSlot && cost !== null && cost !== undefined) {
            const labelSpan = document.createElement("span");
            labelSpan.className = "label";
            labelSpan.textContent = "Cost:";
            labelSpan.style.marginRight = "6px";
            costSlot.appendChild(labelSpan);

            const costElem = renderBlueprintCostElement(root, cost, 28);
            costSlot.appendChild(costElem);
        }
    }

    // After internalShowDialog, dialog.element is the live DOM. Attach viewer to it.
    const liveContainer = dialog.element.querySelector(".bplib-preview-canvas-container");
    if (liveContainer) {
        const viewer = new InteractiveBlueprintViewer(root, blueprint.value, liveContainer);

        // Defer resize & recenter to next frame when container bounding box is rendered
        if (typeof window !== "undefined" && window.requestAnimationFrame) {
            window.requestAnimationFrame(() => {
                viewer.resize();
                viewer.recenter();
            });
        }

        const recenterBtn = dialog.element.querySelector(".bplib-preview-recenter-btn");
        if (recenterBtn) {
            recenterBtn.addEventListener("click", () => viewer.recenter());
        }

        // Clean up viewer when dialog closes
        dialog.closeRequested.add(() => {
            try { viewer.cleanup(); } catch (e) { /* ignore */ }
        });
    }
}
