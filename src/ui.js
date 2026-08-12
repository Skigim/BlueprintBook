import { createTextAreaFormElement } from "../lib/ui.js";
import { BlueprintStore, getActiveVersion } from "./store.js";
import { METADATA } from "./metadata.js";
import { checkForUpdates } from "./updater.js";
import { runDeferredMigrationScan } from "./migrationScan.js";
import { openBlueprintPreviewDialog, getBlueprintCost, getBlueprintEntityCount, renderBlueprintCostElement, deserializeBlueprintEntities, getLockedEntitiesInBlueprint } from "./preview.js";

const NOTIFY = shapez.enumNotificationType;

import { MOD_CHANGELOG, RELEASE_NOTES_1_0_1, getReleaseNotesForVersion } from "./changelog.js";

export function registerNativeChangelogEntry() {
    const id = `Blueprint Book v${METADATA.version}`;
    if (!shapez.CHANGELOG.some(item => item.version === id)) {
        const cleanVer = (METADATA.version || "").toString().replace(/^v/i, "").trim();
        const matchingEntry = Array.isArray(MOD_CHANGELOG)
            ? MOD_CHANGELOG.find(item => (item.version || "").toString().replace(/^v/i, "").trim() === cleanVer)
            : null;
        const entries = getReleaseNotesForVersion(METADATA.version);
        const date = (matchingEntry && matchingEntry.date) || "2026-07-24";
        shapez.CHANGELOG.unshift({
            version: id,
            date,
            entries
        });
    }
}

export function isBlueprintsUnlocked(root) {
    if (root && root.hubGoals && typeof root.hubGoals.isRewardUnlocked === "function") {
        const reward = shapez.enumHubGoalRewards.reward_blueprints;
        return root.hubGoals.isRewardUnlocked(reward);
    }
    return true;
}

export class HUDBlueprintLibrary extends shapez.BaseHUDPart {
    static hasCheckedUpdate = false;
    static hasCheckedMigration = false;

    /** @type {HTMLDivElement|undefined} */
    background;
    visible = false;

    createElements(parent = document.body) {
        this.parent = parent;
        this.activeTagFilter = null;
        this.searchQuery = "";

        const makeDiv = shapez.makeDiv;

        this.background = makeDiv(parent, "ingame_HUD_BlueprintLibrary", ["ingameDialog"]);
        this.dialogInner = makeDiv(this.background, null, ["dialogInner", "dialogMods", "optionChooserDialog", "dialogUpgrades"]);
        this.title = makeDiv(this.dialogInner, null, ["title"], "Blueprint Book");
        this.closeButton = makeDiv(this.title, null, ["closeButton"]);

        if (typeof this.trackClicks === "function") {
            this.trackClicks(this.closeButton, this.close);
        }
        if (typeof this.closeOnBackgroundClick === "function") {
            this.closeOnBackgroundClick(this.background, this.close);
        }

        const toolbar = makeDiv(this.dialogInner, "bplib-toolbar", ["bplib-toolbar"]);
        toolbar.innerHTML = `
            <div class="bplib-filterHeader" id="bplib-filter-tags"></div>
            <div class="bplib-toolbar-right">
                <button class="button styledButton good bplib-btn-import" id="bplib-btn-import" title="Import Blueprint">+</button>
                <input type="text" class="input-text" placeholder="Search blueprints..." id="bplib-search">
            </div>
        `;

        this.filterHeader = toolbar.querySelector('#bplib-filter-tags');
        this.gridContainer = makeDiv(this.dialogInner, "bplib-grid", ["bplib-grid"]);

        this.overlay = this.dialogInner;
        this.bindEvents();
    }

    bindEvents() {
        if (!this.overlay) return;
        const searchInput = /** @type {HTMLInputElement|null} */ (this.overlay.querySelector('#bplib-search'));
        if (searchInput) {
            searchInput.onpointerdown = () => searchInput.focus();
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = /** @type {HTMLInputElement} */ (e.target).value.toLowerCase();
                this.render();
            });
        }

        const grid = this.overlay.querySelector('#bplib-grid');
        if (grid) {
            grid.addEventListener('wheel', (e) => {
                e.stopPropagation();
            }, { passive: true });
        }

        const importBtn = this.overlay.querySelector('#bplib-btn-import');
        if (importBtn) {
            if (typeof this.trackClicks === "function") {
                this.trackClicks(importBtn, () => this.openImportDialog());
            } else if (this.dialog && typeof this.dialog.trackClicks === "function") {
                this.dialog.trackClicks(importBtn, () => this.openImportDialog());
            } else {
                importBtn.addEventListener('click', () => this.openImportDialog());
            }
        }
    }

    /**
     * @param {{ title: string, desc: string, defaults?: { name?: string, tags?: string, value?: string }, textareaId?: string, onSubmit: Function }} opts
     */
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

        if (dialog.buttonSignals.ok) {
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
                if (d && typeof d.cleanup === "function") {
                    d.cleanup();
                }
            }
            this.dynamicClickDetectors = [];
        }
    }

    trackDynamicClick(element, handler) {
        if (!this.dynamicClickDetectors) this.dynamicClickDetectors = [];
        const detector = new shapez.ClickDetector(element, {});
        detector.click.add(handler, this);
        if (typeof this.registerClickDetector === "function") {
            this.registerClickDetector(detector);
        }
        this.dynamicClickDetectors.push(detector);
    }

    initialize() {
        if (!this.background) {
            this.createElements(this.parent || document.body);
        }

        this.visible = false;
        this.updateDialog = null;
        this.latestUpdateInfo = null;

        this.domAttach = new shapez.DynamicDomAttach(this.root, /** @type {HTMLDivElement} */ (this.background), {
            attachClass: "visible",
        });

        this.inputReceiver = new shapez.InputReceiver("blueprintLibrary");
        this.keyActionMapper = new shapez.KeyActionMapper(this.root, this.inputReceiver);
        if (shapez.KEYMAPPINGS) {
            if (shapez.KEYMAPPINGS.general?.back) {
                this.keyActionMapper.getBinding(shapez.KEYMAPPINGS.general.back).add(this.close, this);
            }
            if (shapez.KEYMAPPINGS.ingame?.menuClose) {
                this.keyActionMapper.getBinding(shapez.KEYMAPPINGS.ingame.menuClose).add(this.close, this);
            }
        }

        registerNativeChangelogEntry();
        this.close();
        this.checkUpdateOnce();
        this.checkMigrationOnce();
    }

    /**
     * Triggers the one-time legacy-data migration scan (real storage backend I/O), deferred
     * here from the boot-blocking BlueprintLibraryMod.init() (src/index.js). shapez's HUD
     * system calls initialize() exactly once per HUD part instance - unlike show(), which
     * fires on every panel open - so this naturally runs only once per game session. The
     * static hasCheckedMigration flag is an extra guard against initialize() somehow firing
     * more than once on the same class (mirrors hasCheckedUpdate above); the durable
     * one-time gate that survives across sessions is mod.settings.migrationChecked, enforced
     * inside runDeferredMigrationScan() itself.
     */
    checkMigrationOnce() {
        if (HUDBlueprintLibrary.hasCheckedMigration) return;
        HUDBlueprintLibrary.hasCheckedMigration = true;

        const mod = BlueprintStore.mod;
        if (!mod) return;

        runDeferredMigrationScan(mod).catch(err => {
            console.error("[BlueprintBook] Deferred migration scan failed:", err);
        });
    }

    async checkUpdateOnce() {
        if (HUDBlueprintLibrary.hasCheckedUpdate) return;
        HUDBlueprintLibrary.hasCheckedUpdate = true;

        const currentVersion = getActiveVersion(this.root?.app?.modLoader?.mods?.find(m => m?.metadata?.id === "bp-library") || BlueprintStore.mod);
        const lastSeenVersion = BlueprintStore.getLastSeenVersion();
        const skippedVersion = BlueprintStore.getSkippedVersion();

        try {
            const update = await checkForUpdates(currentVersion);

            if (update.updateAvailable) {
                this.latestUpdateInfo = update;
                if (update.latestVersion !== skippedVersion) {
                    this.showUpdateDialog(update);
                    BlueprintStore.setLastSeenVersion(currentVersion);
                }
            } else if (lastSeenVersion !== currentVersion) {
                this.showWelcomeDialog(currentVersion);
                BlueprintStore.setLastSeenVersion(currentVersion);
            }
        } catch (err) {
            console.error("[BlueprintBook] Update check failed:", err);
        }
    }

    showWelcomeDialog(version) {
        const entries = getReleaseNotesForVersion(version);

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

    async toggleUpdateDialog() {
        if (this.updateDialog) {
            if (this.root?.hud?.parts?.dialogs) {
                this.root.hud.parts.dialogs.closeDialog(this.updateDialog);
            }
            this.updateDialog = null;
            return;
        }

        if (this.latestUpdateInfo && this.latestUpdateInfo.updateAvailable) {
            this.showUpdateDialog(this.latestUpdateInfo);
            return;
        }

        const update = await checkForUpdates(METADATA.version);
        if (update.updateAvailable) {
            this.latestUpdateInfo = update;
            this.showUpdateDialog(update);
        } else {
            this.notify(`Blueprint Book v${METADATA.version} is up to date!`, NOTIFY.info);
        }
    }

    /**
     * @param {{ latestVersion?: string, downloadUrl?: string, releaseNotes?: string }} update
     */
    showUpdateDialog({ latestVersion, downloadUrl, releaseNotes }) {
        this.latestUpdateInfo = { latestVersion, downloadUrl, releaseNotes, updateAvailable: true };

        if (this.updateDialog) {
            try {
                if (this.root?.hud?.parts?.dialogs) {
                    this.root.hud.parts.dialogs.closeDialog(this.updateDialog);
                }
            } catch (e) {}
            this.updateDialog = null;
        }

        if (shapez.T.dialogs.buttons) {
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

        this.updateDialog = dialog;

        if (dialog.closeRequested) {
            dialog.closeRequested.add(() => {
                if (this.updateDialog === dialog) {
                    this.updateDialog = null;
                }
            });
        }

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
                if (this.updateDialog === dialog) {
                    this.updateDialog = null;
                }
            });
        }

        if (dialog.buttonSignals.cancel) {
            dialog.buttonSignals.cancel.add(() => {
                if (this.updateDialog === dialog) {
                    this.updateDialog = null;
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
                if (this.updateDialog === dialog) {
                    this.updateDialog = null;
                }
            });
        }
    }

    isBlueprintsUnlocked() {
        return isBlueprintsUnlocked(this.root);
    }

    showBlueprintsNotUnlocked() {
        if (this.root && this.root.hud && this.root.hud.parts && this.root.hud.parts.dialogs) {
            const dialogsT = shapez.T.dialogs.blueprintsNotUnlocked;
            const title = (dialogsT && dialogsT.title) || "Blueprints Locked";
            const desc = (dialogsT && dialogsT.desc) || "Unlocks at level 12!";
            this.root.hud.parts.dialogs.showInfo(title, desc);
        }
    }

    isBlockingOverlay() {
        return Boolean(this.visible);
    }

    handleSaveHotkey() {
        if (!this.root || !this.root.hud || !this.root.hud.parts.massSelector) return "stop_propagation";
        
        if (!this.isBlueprintsUnlocked()) {
            this.showBlueprintsNotUnlocked();
            return "stop_propagation";
        }

        const selectedUids = this.root.hud.parts.massSelector.selectedUids;

        let selectedEntities;
        if (selectedUids && selectedUids.size > 0) {
            selectedEntities = Array.from(selectedUids)
                .map(uid => this.root.entityMgr.findByUid(uid))
                .filter(Boolean);
        } else {
            // Copying a selection clears massSelector.selectedUids the instant the blueprint
            // is created (native mass_selector.js), so fall back to the currently held blueprint.
            const heldBlueprint = this.root.hud.parts.blueprintPlacer?.currentBlueprint?.get?.();
            selectedEntities = heldBlueprint?.entities;
        }

        if (!selectedEntities || selectedEntities.length === 0) return "stop_propagation";

        const modLoader = shapez.BlueprintLibraryModLoader;
        if (!modLoader || !Array.isArray(modLoader.mods)) return "stop_propagation";

        const bpMod = modLoader.mods.find(m => m.metadata.id === "bp-string");
        if (!bpMod) return "stop_propagation";

        const blueprintString = bpMod.constructor.serialize(selectedEntities);
        this.openImportDialog(blueprintString);
        return "stop_propagation";
    }

    handleToggleHotkey() {
        if (this.visible) {
            this.close();
        } else {
            this.show();
        }
        return "stop_propagation";
    }

    cleanup() {
        super.cleanup();
        if (this.root?.app?.inputMgr && this.inputReceiver) {
            this.root.app.inputMgr.makeSureDetached(this.inputReceiver);
        }
        this.cleanupDynamicClickDetectors();
        this.visible = false;
    }

    show() {
        try {
            if (!this.background) {
                this.createElements(this.parent || document.body);
            }

            if (!this.isBlueprintsUnlocked()) {
                this.showBlueprintsNotUnlocked();
                return;
            }

            this.visible = true;
            if (this.root?.app?.inputMgr && this.inputReceiver) {
                this.root.app.inputMgr.makeSureAttachedAndOnTop(this.inputReceiver);
            }

            this.render();
            this.update();
        } catch (err) {
            console.error("Error in show():", err);
            this.notify("Error opening Blueprint Book. Check console.", NOTIFY.error);
        }
    }

    close() {
        this.visible = false;
        if (this.root?.app?.inputMgr && this.inputReceiver) {
            this.root.app.inputMgr.makeSureDetached(this.inputReceiver);
        }
        this.update();
    }

    update() {
        if (this.domAttach) {
            this.domAttach.update(this.visible);
        }
    }

    notify(message, type) {
        if (this.root && this.root.hud && this.root.hud.signals && this.root.hud.signals.notification) {
            this.root.hud.signals.notification.dispatch(message, type || NOTIFY.info);
        }
    }

    async equipBlueprint(blueprintString) {
        if (!this.isBlueprintsUnlocked()) {
            this.showBlueprintsNotUnlocked();
            return;
        }

        try {
            const modLoader = shapez.BlueprintLibraryModLoader;
            if (!modLoader || !Array.isArray(modLoader.mods)) {
                this.notify("Blueprint strings mod loader unavailable.", NOTIFY.error);
                return;
            }
            const bpMod = modLoader.mods.find(m => m.metadata.id === "bp-string");
            if (!bpMod || typeof bpMod.constructor.deserialize !== "function") {
                this.notify("Blueprint string deserializer unavailable.", NOTIFY.error);
                return;
            }

            const notifyLockedBuildings = () => {
                const warningMsg = "Blueprint contains locked buildings (unlocked at later levels)";
                if (this.root.hud?.parts?.notifications?.sendNotification) {
                    this.root.hud.parts.notifications.sendNotification(warningMsg, NOTIFY.warning);
                } else {
                    this.notify(warningMsg, NOTIFY.warning);
                }
            };

            let entities;
            try {
                entities = bpMod.constructor.deserialize(this.root, blueprintString);
            } catch (err) {
                // Some mods (e.g. shapez-industries) gate variants behind a research system and
                // only register them once unlocked, so deserializing a blueprint that references
                // an unresearched variant throws here rather than returning entities we could
                // inspect for lock status. Treat that the same as a detected locked building.
                console.warn("[BlueprintBook] Deserialize failed during equip, treating as locked buildings:", err);
                notifyLockedBuildings();
                return;
            }

            if (entities) {
                const lockedEntities = getLockedEntitiesInBlueprint(this.root, entities);
                if (lockedEntities.length > 0) {
                    notifyLockedBuildings();
                    return;
                }

                const blueprint = new shapez.Blueprint(entities);
                
                if (this.root.hud?.parts?.blueprintPlacer) {
                    this.root.hud.parts.blueprintPlacer.lastBlueprintUsed = blueprint;
                    if (this.root.hud.parts.blueprintPlacer.currentBlueprint?.set) {
                        this.root.hud.parts.blueprintPlacer.currentBlueprint.set(blueprint);
                    }
                }

                try {
                    // lib.dom.d.ts types navigator.clipboard as always-present, but it's
                    // genuinely absent in older browsers/non-secure contexts - real feature detection.
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                    if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(blueprintString);
                    }
                } catch (e) {
                    console.warn("[BlueprintBook] Clipboard write failed:", e);
                }

                if (this.root.hud?.signals?.pasteBlueprintRequested) {
                    this.root.hud.signals.pasteBlueprintRequested.dispatch();
                }

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

            const searchInput = /** @type {HTMLInputElement|null} */ (this.overlay ? this.overlay.querySelector('#bplib-search') : null);
            if (searchInput && searchInput.value !== (this.searchQuery || "")) {
                searchInput.value = this.searchQuery || "";
            }

            const toolbar = this.overlay ? this.overlay.querySelector('#bplib-toolbar') : null;
            if (toolbar) {
                let updateBtn = /** @type {HTMLButtonElement|null} */ (toolbar.querySelector('#bplib-btn-update'));
                const updateInfo = this.latestUpdateInfo;
                const showUpdateBtn = updateInfo && updateInfo.updateAvailable;
                if (showUpdateBtn) {
                    if (!updateBtn) {
                        updateBtn = document.createElement('button');
                        updateBtn.className = 'button styledButton bplib-btn-update';
                        updateBtn.id = 'bplib-btn-update';
                        updateBtn.style.background = '#e65100';
                        updateBtn.style.color = '#fff';
                        updateBtn.textContent = `Update (v${updateInfo.latestVersion})`;
                        const importBtn = toolbar.querySelector('#bplib-btn-import');
                        if (importBtn && importBtn.parentNode) {
                            if (importBtn.nextSibling) {
                                importBtn.parentNode.insertBefore(updateBtn, importBtn.nextSibling);
                            } else {
                                importBtn.parentNode.appendChild(updateBtn);
                            }
                        } else {
                            toolbar.appendChild(updateBtn);
                        }
                    } else {
                        updateBtn.textContent = `Update (v${updateInfo.latestVersion})`;
                    }
                    this.trackDynamicClick(updateBtn, () => {
                        this.toggleUpdateDialog();
                    });
                } else if (updateBtn) {
                    updateBtn.remove();
                }
            }

            const tagsContainer = this.overlay ? this.overlay.querySelector('#bplib-filter-tags') : null;
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
        card.className = 'bplib-upgrade shopCard';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'name';
        nameDiv.textContent = bp.name || 'Untitled';

        titleDiv.appendChild(nameDiv);

        const descDiv = document.createElement('div');
        descDiv.className = 'description';
        descDiv.textContent = `Tags: ${(bp.tags || []).join(', ') || 'None'}`;
        
        const delBtn = document.createElement('button');
        delBtn.className = 'bplib-action-delete';
        delBtn.title = 'Delete Blueprint';
        delBtn.textContent = 'X';
        trackClick(delBtn, () => {
            this.deleteBlueprint(bp);
        });
        descDiv.appendChild(delBtn);

        const reqDiv = document.createElement('div');
        reqDiv.className = 'requirements';

        if (!this._cardCache) {
            this._cardCache = new Map();
        }

        const cacheKey = `${bp?.id || ""}:${bp?.value || ""}`;
        let cached = this._cardCache.get(cacheKey);
        if (!cached || cached.failedDueToUnlock) {
            const { entities, failedDueToUnlock } = deserializeBlueprintEntities(this.root, bp?.value);
            const cost = getBlueprintCost(this.root, entities);
            cached = { entities, cost, failedDueToUnlock };
            this._cardCache.set(cacheKey, cached);
        }

        const { entities, cost, failedDueToUnlock } = cached;
        // Not cached: unlock state can change mid-session (e.g. leveling up), so this
        // must be recomputed on every render even though entities/cost/failedDueToUnlock
        // are stable. Falls back to the raw value when entities is null so a real
        // deserialize failure (locked/unresearched content) is re-detected instead of
        // silently reporting "not locked."
        const lockedEntities = getLockedEntitiesInBlueprint(this.root, entities || bp?.value);

        if (failedDueToUnlock) {
            const unknownDiv = document.createElement('div');
            unknownDiv.className = 'requirement bplib-cost-unknown';
            const labelSpan = document.createElement('span');
            labelSpan.className = 'label';
            labelSpan.textContent = 'Cost: unknown';
            unknownDiv.appendChild(labelSpan);
            reqDiv.appendChild(unknownDiv);
        } else if (cost && cost.length) {
            const costElem = renderBlueprintCostElement(this.root, cost, 24);
            reqDiv.appendChild(costElem);
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'bplib-upgrade-actions';

        const previewBtn = document.createElement('button');
        previewBtn.className = 'button styledButton bplib-btn-preview';
        previewBtn.textContent = 'PREVIEW';
        trackClick(previewBtn, () => {
            openBlueprintPreviewDialog(this.root, bp, () => this.equipBlueprint(bp.value));
        });

        const equipBtn = document.createElement('button');
        equipBtn.className = 'button styledButton good bplib-btn-equip';
        equipBtn.textContent = 'EQUIP';
        trackClick(equipBtn, () => {
            if (lockedEntities.length > 0) return;
            this.equipBlueprint(bp.value);
        });

        if (lockedEntities.length > 0) {
            equipBtn.classList.add("disabled");
            equipBtn.disabled = true;
            equipBtn.title = "Contains locked buildings (unlocked at higher level)";
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'button styledButton bplib-btn-edit';
        editBtn.textContent = 'EDIT';
        trackClick(editBtn, () => {
            this.editBlueprint(bp);
        });

        actionsDiv.appendChild(previewBtn);
        actionsDiv.appendChild(equipBtn);
        actionsDiv.appendChild(editBtn);

        card.appendChild(titleDiv);
        card.appendChild(descDiv);
        card.appendChild(reqDiv);
        card.appendChild(actionsDiv);

        return card;
    }

    renderGrid() {
        try {
            const grid = this.overlay ? this.overlay.querySelector('#bplib-grid') : null;
            if (!grid) return;
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
