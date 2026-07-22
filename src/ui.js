import { createTextAreaFormElement } from "../lib/ui.js";
import { BlueprintStore } from "./store.js";
import { METADATA } from "./metadata.js";
import { checkForUpdates } from "./updater.js";

const NOTIFY = (shapez && shapez.enumNotificationType) || {
    info: "info", warning: "warning", error: "error", success: "success",
};

import { MOD_CHANGELOG, RELEASE_NOTES_1_0_1, getReleaseNotesForVersion } from "./changelog.js";

export function registerNativeChangelogEntry() {
    if (typeof shapez !== "undefined" && shapez.CHANGELOG && Array.isArray(shapez.CHANGELOG)) {
        const id = `Blueprint Book v${METADATA.version}`;
        if (!shapez.CHANGELOG.some(item => item.version === id)) {
            shapez.CHANGELOG.unshift({
                version: id,
                date: "2026-07-21",
                entries: MOD_CHANGELOG[0].entries
            });
        }
    }
}

export class HUDBlueprintLibrary extends shapez.BaseHUDPart {
    createElements(parent) {
        this.parent = parent;
        this.activeTagFilter = null;
        this.searchQuery = "";
    }

    bindEvents() {
        const searchInput = this.overlay.querySelector('#bplib-search');
        searchInput.onpointerdown = () => searchInput.focus();
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.render();
        });

        const grid = this.overlay.querySelector('#bplib-grid');
        if (grid) {
            grid.addEventListener('wheel', (e) => {
                e.stopPropagation();
            }, { passive: true });
        }

        this.dialog.trackClicks(this.overlay.querySelector('#bplib-btn-import'), () => {
            this.openImportDialog();
        });
    }

    _showBlueprintFormDialog({ title, desc, defaults = {}, textareaId = "string", onSubmit }) {
        const nameInput = new shapez.FormElementInput({
            id: "name",
            label: "Blueprint Name",
            placeholder: "New Blueprint",
            defaultValue: defaults.name || "",
        });
        const tagsInput = new shapez.FormElementInput({
            id: "tags",
            label: "Tags (comma-separated)",
            placeholder: "Belt, Factory",
            defaultValue: defaults.tags || "",
        });
        const stringInput = createTextAreaFormElement(textareaId, "Blueprint String", "Paste string here...", defaults.value || "");

        const dialog = new shapez.DialogWithForm({
            app: this.root.app,
            title,
            desc,
            formElements: [nameInput, tagsInput, stringInput],
            buttons: ["cancel:bad:escape", "ok:good:enter"],
            closeButton: false,
        });

        this.root.hud.parts.dialogs.internalShowDialog(dialog);

        dialog.buttonSignals.ok.add(() => {
            const name = nameInput.getValue() || "New Blueprint";
            const str = stringInput.getValue();
            const tagsStr = tagsInput.getValue();

            if (!str.trim()) return this.notify("String cannot be empty", NOTIFY.warning);

            const newTags = tagsStr.split(",")
                .map(t => t.trim())
                .filter(t => t.length > 0);

            onSubmit(name, str, newTags);
        });
    }

    openImportDialog(initialString = "") {
        this._showBlueprintFormDialog({
            title: "Import Blueprint",
            desc: "Paste your blueprint string below and optionally give it a name and tags.",
            defaults: { value: initialString },
            textareaId: "import_string",
            onSubmit: (name, str, tags) => {
                BlueprintStore.add(name, str, tags);
                this.notify("Blueprint imported!", NOTIFY.success);
                if (this.visible) {
                    this.render();
                }
            },
        });
    }

    cleanupDynamicClickDetectors() {
        if (this.dynamicClickDetectors) {
            for (const d of this.dynamicClickDetectors) {
                d.cleanup();
                const index = this.clickDetectors.indexOf(d);
                if (index >= 0) this.clickDetectors.splice(index, 1);
            }
        }
        this.dynamicClickDetectors = [];
    }

    trackDynamicClick(element, handler) {
        if (!this.dynamicClickDetectors) this.dynamicClickDetectors = [];
        const detector = new shapez.ClickDetector(element, {});
        detector.click.add(handler, this);
        this.registerClickDetector(detector);
        this.dynamicClickDetectors.push(detector);
    }

    initialize() {
        this.visible = false;
        registerNativeChangelogEntry();
        this.checkUpdateOnce();
    }

    async checkUpdateOnce() {
        if (HUDBlueprintLibrary.hasCheckedUpdate) return;
        HUDBlueprintLibrary.hasCheckedUpdate = true;

        const currentVersion = METADATA.version;
        const lastSeenVersion = BlueprintStore.getLastSeenVersion();
        const skippedVersion = BlueprintStore.getSkippedVersion();

        try {
            const update = await checkForUpdates(currentVersion);

            if (update.updateAvailable && update.latestVersion !== skippedVersion) {
                // Scenario A: A newer version is published on GitHub / Mod.io
                this.showUpdateDialog(update);
                BlueprintStore.setLastSeenVersion(currentVersion);
            } else if (lastSeenVersion !== currentVersion) {
                // Scenario B: First time running this installed version (e.g. v1.0.1 welcome dialog)
                this.showWelcomeDialog(currentVersion);
                BlueprintStore.setLastSeenVersion(currentVersion);
            }
        } catch (err) {
            console.error("[BlueprintBook] Update check failed:", err);
        }
    }

    showWelcomeDialog(version) {
        const rawNotes = getReleaseNotesForVersion(version);
        const entries = Array.isArray(rawNotes)
            ? rawNotes
            : (rawNotes || "").split("\n").map(l => l.trim()).filter(Boolean);

        const notesHtml = entries
            .map(entry => `<div style="margin-bottom: 6px; line-height: 1.35; padding-left: 14px; position: relative;"><span style="position: absolute; left: 0; color: #4CAF50;">•</span>${entry}</div>`)
            .join("");

        const dialog = new shapez.Dialog({
            app: this.root.app,
            title: "Welcome to Blueprint Book!",
            contentHTML: `
                <div style="padding: 10px; text-align: center;">
                    <p style="font-size: 1.1em; margin-bottom: 12px;">Thank you for installing <strong>Blueprint Book v${version}</strong>!</p>
                    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; text-align: left; margin-bottom: 16px;">
                        <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">What's New:</div>
                        <div style="font-size: 0.85em; color: #ccc; max-height: 125px; overflow-y: auto; pointer-events: auto;">
                            ${notesHtml}
                        </div>
                    </div>
                </div>
            `,
            buttons: ["ok:good:enter"],
            closeButton: false
        });

        this.root.hud.parts.dialogs.internalShowDialog(dialog);
        if (dialog.dialogElem) {
            dialog.dialogElem.classList.add("dialogMods", "updateAvailableDialog");
        }
    }

    showUpdateDialog({ latestVersion, downloadUrl, releaseNotes }) {
        if (shapez?.T?.dialogs?.buttons) {
            shapez.T.dialogs.buttons.viewOnModIo = "VIEW ON MOD.IO";
            shapez.T.dialogs.buttons.skipVersion = "SKIP VERSION";
        }

        const escapeHtml = str => String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

        const notesHtml = (releaseNotes || "")
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => `<div style="margin-bottom: 6px; line-height: 1.3;">${escapeHtml(line)}</div>`)
            .join("");

        const dialog = new shapez.Dialog({
            app: this.root.app,
            title: "Update Available!",
            contentHTML: `
                <div style="padding: 10px; text-align: center;">
                    <p style="font-size: 1.1em; margin-bottom: 12px;">A new version of <strong>Blueprint Book</strong> is available!</p>
                    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; text-align: left; margin-bottom: 16px;">
                        <div><strong>Installed Version:</strong> v${METADATA.version}</div>
                        <div><strong>Latest Version:</strong> <span style="color: #4CAF50;">v${latestVersion}</span></div>
                        ${notesHtml ? `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.85em; color: #ccc; max-height: 100px; overflow-y: auto; pointer-events: auto;">${notesHtml}</div>` : ''}
                    </div>
                </div>
            `,
            buttons: ["cancel:bad:escape", "skipVersion:neutral", "viewOnModIo:good:enter"],
            closeButton: false
        });

        this.root.hud.parts.dialogs.internalShowDialog(dialog);
        if (dialog.dialogElem) {
            dialog.dialogElem.classList.add("dialogMods", "updateAvailableDialog");
        }

        if (dialog.buttonSignals.skipVersion) {
            dialog.buttonSignals.skipVersion.add(() => {
                try {
                    BlueprintStore.setSkippedVersion(latestVersion);
                } catch (e) {
                    console.error("[BlueprintBook] Failed to save skipped version:", e);
                }
            });
        }

        const targetUrl = downloadUrl || "https://mod.io/g/shapez/m/blueprint-book#description";

        if (dialog.buttonSignals.viewOnModIo) {
            dialog.buttonSignals.viewOnModIo.add(() => {
                if (this.root?.app?.platformWrapper?.openExternalLink) {
                    this.root.app.platformWrapper.openExternalLink(targetUrl);
                } else if (shapez.openStandaloneLink) {
                    shapez.openStandaloneLink(targetUrl);
                } else {
                    window.open(targetUrl, "_blank");
                }
            });
        }
    }

    handleSaveHotkey() {
        if (!this.root || !this.root.hud || !this.root.hud.parts.massSelector) return "stop_propagation";
        const selectedUids = this.root.hud.parts.massSelector.selectedUids;
        
        if (!selectedUids || selectedUids.size === 0) return "stop_propagation";

        const bpMod = shapez.BlueprintLibraryModLoader.mods.find(m => m.metadata.id === "bp-string");
        if (!bpMod) return "stop_propagation";

        // Get the actual entities from the UIDs
        const selectedEntities = Array.from(selectedUids)
            .map(uid => this.root.entityMgr.findByUid(uid))
            .filter(Boolean); // Remove any null/undefined

        const blueprintString = bpMod.constructor.serialize(selectedEntities);
        this.openImportDialog(blueprintString);
        return "stop_propagation";
    }

    handleToggleHotkey() {
        if (this.visible) {
            if (this.dialog) this.dialog.closeRequested.dispatch();
        } else {
            this.show();
        }
        return "stop_propagation";
    }

    cleanup() {
        super.cleanup();
        if (this.dialog) {
            this.dialog.closeRequested.dispatch();
        }
    }

    show() {
        try {
            if (this.dialog) return;

            this.dialog = new shapez.Dialog({
                app: this.root.app,
                title: "Blueprint Book",
                contentHTML: `
                    <div class="bplib-dialog-content">
                        <div class="bplib-toolbar">
                            <button class="button styledButton good bplib-btn-import" id="bplib-btn-import">+ Import Blueprint</button>
                            <input type="text" class="input-text" placeholder="Search blueprints..." id="bplib-search">
                        </div>
                        <div id="bplib-filter-tags" class="bplib-filterHeader"></div>
                        
                        <div id="bplib-grid" class="bplib-grid"></div>
                    </div>
                `,
                buttons: [],
                closeButton: true
            });

            this.root.hud.parts.dialogs.internalShowDialog(this.dialog);
            
            // Add required shapez CSS classes so our optionParent and dialogModsMod elements are styled correctly
            this.dialog.dialogElem.classList.add("dialogMods", "optionChooserDialog");
            
            this.visible = true;
            this.overlay = this.dialog.element || document.querySelector('.ingameDialog:last-child');
            
            this.bindEvents();
            this.render();

            this.dialog.closeRequested.add(() => {
                this.dialog = null;
                this.overlay = null;
                this.visible = false;
                this.cleanupDynamicClickDetectors();
            });
        } catch (err) {
            console.error("Error in show():", err);
            this.notify("Error opening Blueprint Book. Check console.", NOTIFY.error);
        }
    }

    close() {
        if (this.dialog) {
            this.dialog.closeRequested.dispatch();
        }
    }

    notify(message, type) {
        if (this.root && this.root.hud && this.root.hud.signals && this.root.hud.signals.notification) {
            this.root.hud.signals.notification.dispatch(message, type || NOTIFY.info);
        }
    }

    equipBlueprint(blueprintString) {
        try {
            const modLoader = shapez.BlueprintLibraryModLoader;
            const bpMod = modLoader.mods.find(m => m.metadata.id === "bp-string");
            const entities = bpMod.constructor.deserialize(this.root, blueprintString);
            
            if (entities) {
                const blueprint = new shapez.Blueprint(entities);
                this.root.hud.parts.blueprintPlacer.currentBlueprint.set(blueprint);
                this.root.hud.signals.pasteBlueprintRequested.dispatch();
                this.notify("Blueprint equipped!", NOTIFY.success);
                this.close();
            } else {
                this.notify("Failed to deserialize blueprint.", NOTIFY.error);
            }
        } catch (err) {
            console.error("Failed to equip blueprint", err);
            this.notify("Error equipping blueprint.", NOTIFY.error);
            this.close();
        }
    }

    render() {
        try {
            this.cleanupDynamicClickDetectors();
            
            const tagsContainer = this.overlay.querySelector('#bplib-filter-tags');
            if (tagsContainer) {
                tagsContainer.innerHTML = '';
                
                const allBtn = document.createElement('button');
                allBtn.className = '' + (this.activeTagFilter === null ? 'active' : '');
                allBtn.innerText = 'All';
                this.trackDynamicClick(allBtn, () => { this.activeTagFilter = null; this.render(); });
                tagsContainer.appendChild(allBtn);

                BlueprintStore.getTags().forEach(tag => {
                    const btn = document.createElement('button');
                    btn.className = '' + (this.activeTagFilter === tag ? 'active' : '');
                    btn.innerText = tag;
                    this.trackDynamicClick(btn, () => { this.activeTagFilter = tag; this.render(); });
                    tagsContainer.appendChild(btn);
                });
            }

            this.renderGrid();
        } catch (err) {
            console.error("Error in render():", err);
            this.notify("Error rendering Blueprint Book. Check console.", NOTIFY.error);
        }
    }

    _createBlueprintCard(bp, trackClick) {
        const card = document.createElement('div');
        card.className = 'bplib-upgrade';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'name';
        nameDiv.innerText = bp.name;
        
        const tierDiv = document.createElement('div');
        tierDiv.className = 'tier';
        tierDiv.innerText = 'BP';
        
        titleDiv.appendChild(nameDiv);
        titleDiv.appendChild(tierDiv);

        const descDiv = document.createElement('div');
        descDiv.className = 'description';
        descDiv.innerText = `Tags: ${(bp.tags || []).join(', ') || 'None'}`;
        
        const delBtn = document.createElement('button');
        delBtn.className = 'bplib-action-delete';
        delBtn.title = 'Delete Blueprint';
        delBtn.innerText = 'X';
        trackClick(delBtn, () => {
            this.deleteBlueprint(bp);
        });
        descDiv.appendChild(delBtn);

        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon';

        const reqDiv = document.createElement('div');
        reqDiv.className = 'requirements';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'bplib-upgrade-actions';

        const equipBtn = document.createElement('button');
        equipBtn.className = 'button styledButton good bplib-btn-equip';
        equipBtn.innerText = 'EQUIP';
        trackClick(equipBtn, () => {
            this.equipBlueprint(bp.value);
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'button styledButton bplib-btn-edit';
        editBtn.innerText = 'EDIT';
        trackClick(editBtn, () => {
            this.editBlueprint(bp);
        });

        actionsDiv.appendChild(equipBtn);
        actionsDiv.appendChild(editBtn);

        card.appendChild(titleDiv);
        card.appendChild(descDiv);
        card.appendChild(iconDiv);
        card.appendChild(reqDiv);
        card.appendChild(actionsDiv);

        return card;
    }

    renderGrid() {
        try {
            const grid = this.overlay.querySelector('#bplib-grid');
            grid.innerHTML = '';
            let blueprints = BlueprintStore.getAll();

            if (this.searchQuery) {
                blueprints = blueprints.filter(b => b.name.toLowerCase().includes(this.searchQuery));
            }
            if (this.activeTagFilter) {
                blueprints = blueprints.filter(b => (b.tags || []).includes(this.activeTagFilter));
            }

            if (blueprints.length === 0) {
                grid.innerHTML = '<div style="text-align: center; color: #777; padding: 40px;">No blueprints found.</div>';
                return;
            }

            const trackClick = this.trackDynamicClick.bind(this);
            blueprints.forEach(bp => {
                grid.appendChild(this._createBlueprintCard(bp, trackClick));
            });
        } catch (err) {
            console.error("Error in renderGrid():", err);
            this.notify("Error: Check console", NOTIFY.error);
        }
    }

    editBlueprint(bp) {
        this._showBlueprintFormDialog({
            title: "Edit Blueprint",
            desc: "Update your blueprint details below.",
            defaults: {
                name: bp.name,
                tags: (bp.tags || []).join(", "),
                value: bp.value,
            },
            textareaId: "edit_string",
            onSubmit: (name, str, tags) => {
                BlueprintStore.update(bp.id, { name, value: str, tags });
                this.notify("Blueprint updated!", NOTIFY.success);
                if (this.visible) {
                    this.render();
                }
            },
        });
    }

    deleteBlueprint(bp) {
        const signals = this.root.hud.parts.dialogs.showWarning(
            "Delete Blueprint",
            `Are you sure you want to delete '${bp.name}'?`,
            ["cancel:good", "delete:bad:enter"]
        );
        signals.delete.add(() => {
            BlueprintStore.remove(bp.id);
            this.render();
            this.notify("Blueprint deleted", NOTIFY.info);
        });
    }
}
