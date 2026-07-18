import { preventGameInputs } from "../lib/dom.js";
import { createTextAreaFormElement } from "../lib/ui.js";
import { BlueprintStore } from "./store.js";

const NOTIFY = (shapez && shapez.enumNotificationType) || {
    info: "info", warning: "warning", error: "error", success: "success",
};

export class HUDBlueprintLibrary extends shapez.BaseHUDPart {
    createElements(parent) {
        this.parent = parent;
        this.activeTagFilter = null;
        this.searchQuery = "";
    }

    bindEvents() {
        const searchInput = this.overlay.querySelector('#bplib-search');
        preventGameInputs(searchInput);
        searchInput.onpointerdown = () => searchInput.focus();
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.render();
        });

        this.dialog.trackClicks(this.overlay.querySelector('#bplib-btn-import'), () => {
            const nameInput = new shapez.FormElementInput({
                id: "name",
                label: "Blueprint Name",
                placeholder: "New Blueprint",
                defaultValue: "",
            });
            const tagsInput = new shapez.FormElementInput({
                id: "tags",
                label: "Tags (comma-separated)",
                placeholder: "Belt, Factory",
                defaultValue: "",
            });
            const stringInput = createTextAreaFormElement("import_string", "Blueprint String", "Paste string here...", "");

            const dialog = new shapez.DialogWithForm({
                app: this.root.app,
                title: "Import Blueprint",
                desc: "Paste your blueprint string below and optionally give it a name and tags.",
                formElements: [nameInput, tagsInput, stringInput],
                buttons: ["cancel:bad:escape", "ok:good:enter"],
                closeButton: false
            });

            this.root.hud.parts.dialogs.internalShowDialog(dialog);

            dialog.buttonSignals.ok.add(() => {
                const name = nameInput.getValue() || 'New Blueprint';
                const str = stringInput.getValue();
                const tagsStr = tagsInput.getValue();

                if (!str.trim()) return this.notify("String cannot be empty", NOTIFY.warning);
                
                const newTags = tagsStr.split(',')
                    .map(t => t.trim())
                    .filter(t => t.length > 0);
                
                BlueprintStore.add(name, str, newTags);
                this.notify("Blueprint imported!", NOTIFY.success);
                this.render();
            });
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

            this.overlay.querySelector('#bplib-search').focus();
        } catch (err) {
            alert("Error in show(): " + err.message + "\n" + err.stack);
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
            alert("Error in render(): " + err.message + "\n" + err.stack);
        }
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

            blueprints.forEach(bp => {
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
                this.trackDynamicClick(delBtn, () => {
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
                this.trackDynamicClick(equipBtn, () => {
                    this.equipBlueprint(bp.value);
                });

                const editBtn = document.createElement('button');
                editBtn.className = 'button styledButton bplib-btn-edit';
                editBtn.innerText = 'EDIT';
                this.trackDynamicClick(editBtn, () => {
                    this.editBlueprint(bp);
                });

                actionsDiv.appendChild(equipBtn);
                actionsDiv.appendChild(editBtn);

                card.appendChild(titleDiv);
                card.appendChild(descDiv);
                card.appendChild(iconDiv);
                card.appendChild(reqDiv);
                card.appendChild(actionsDiv);

                grid.appendChild(card);
            });
        } catch (err) {
            console.error("Error in renderGrid():", err);
            this.notify("Error: Check console", NOTIFY.error);
        }
    }

    editBlueprint(bp) {
        const nameInput = new shapez.FormElementInput({
            id: "name",
            label: "Blueprint Name",
            placeholder: "New Blueprint",
            defaultValue: bp.name,
        });
        const tagsInput = new shapez.FormElementInput({
            id: "tags",
            label: "Tags (comma-separated)",
            placeholder: "Belt, Factory",
            defaultValue: (bp.tags || []).join(", "),
        });
        const stringInput = createTextAreaFormElement("edit_string", "Blueprint String", "Paste string here...", bp.value);

        const dialog = new shapez.DialogWithForm({
            app: this.root.app,
            title: "Edit Blueprint",
            desc: "Update your blueprint details below.",
            formElements: [nameInput, tagsInput, stringInput],
            buttons: ["cancel:bad:escape", "ok:good:enter"],
            closeButton: false
        });

        this.root.hud.parts.dialogs.internalShowDialog(dialog);

        dialog.buttonSignals.ok.add(() => {
            const name = nameInput.getValue() || 'New Blueprint';
            const str = stringInput.getValue();
            const tagsStr = tagsInput.getValue();

            if (!str.trim()) return this.notify("String cannot be empty", NOTIFY.warning);
            
            const newTags = tagsStr.split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0);
            
            BlueprintStore.update(bp.id, { name, value: str, tags: newTags });
            this.notify("Blueprint updated!", NOTIFY.success);
            this.render();
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
