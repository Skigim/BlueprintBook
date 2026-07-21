(() => {
  // src/metadata.js
  var METADATA = {
    id: "bp-library",
    name: "Blueprint Library",
    author: "Skigim",
    version: "1.0",
    website: "",
    description: "A full rewrite of KiitikM's Blueprint Library mod. Features include: perfectly integrated native-style UI, custom tagging and filtering system, unified edit dialogs, and memory leak fixes.",
    minimumGameVersion: ">=1.5.0",
    doesNotAffectSavegame: true,
    dependencies: ["bp-string"],
    settings: {
      blueprints: [],
      nextBlueprintId: 1,
      availableTags: []
    }
  };

  // src/styles.js
  var BUTTON_ICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20640%20640'%3E%3Cpath%20fill='%23000'%20d='M72.5%200L640%200L640%20490Q624.6%20489.8%20613.5%20495Q596%20502.5%20585%20516.5Q577.3%20525.8%20573%20538.5L570%20552.5L570%20568.5Q575.3%20600.2%20596.5%20616Q605.8%20623.7%20618.5%20628L632.5%20631L640%20631L640%20639.5L639.5%20640L65.5%20640Q34.7%20632.8%2018%20611.5L5%20589.5L0%20568.5L0%2072.5L3%2057.5L11%2039.5Q18.5%2027%2029.5%2018L51.5%205L72.5%200ZM160%2080L160%20160L190%20160L190%20110L240%20110L240%2080L160%2080ZM401%2080L401%20110L451%20110L451%20160L481%20160L481%2080L401%2080ZM160%20321L160%20401L240%20401L240%20371L190%20371L190%20321L160%20321ZM451%20321L451%20371L401%20371L401%20401L481%20401L481%20321L451%20321ZM73%20490L54%20495L37%20505Q15%20521%2010%20553L10%20569L13%20583Q17%20595%2025%20605Q41%20626%2073%20631L601%20631L590%20623Q578%20614%20571%20602L563%20584L560%20569L560%20553L563%20538Q568%20521%20578%20510Q587%20498%20601%20491L73%20490Z'/%3E%3C/svg%3E";
  var CSS = `
    #ingame_HUD_GameMenu > .button.blueprintLibrary,
    #ingame_HUD_GameMenu > button.blueprintLibrary {
        background-image: url("${BUTTON_ICON}");
        background-position: center center;
        background-repeat: no-repeat;
        background-size: 70%;
    }

    /* --- DIALOG OVERRIDES --- */
    .dialogMods .dialogInner .content {
        width: 600px !important;
        max-width: 90vw;
    }

    /* --- DIALOG CONTAINER --- */
    .bplib-dialog-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 10px;
        box-sizing: border-box;
        width: 100%;
        height: 70vh;
        max-height: 800px;
    }
    .bplib-toolbar {
        display: flex; gap: 10px; margin-bottom: 20px; align-items: center;
    }
    .bplib-grid {
        flex: 1;
        overflow-y: auto;
        padding-right: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    /* --- STATISTICS: TAGS FILTER HEADER --- */
    .bplib-filterHeader {
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 10px;
    }
    .bplib-filterHeader button {
        height: 20px;
        padding: 1px 10px;
        border: 0;
        box-shadow: none;
        min-width: 30px;
        color: #fff;
        opacity: 0.25;
        background: rgba(255,255,255,0.1);
        border-radius: 0;
        font-size: 11px;
        font-family: "GameFont", sans-serif;
        cursor: pointer;
    }
    html[data-theme="dark"] .bplib-filterHeader button {
        background: #474b58;
    }
    .bplib-filterHeader button:hover { opacity: 0.5; }
    .bplib-filterHeader button.active { opacity: 1; }
    .bplib-filterHeader button:first-child { border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
    .bplib-filterHeader button:last-child { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }

    /* --- SHOP: UPGRADE CARDS --- */
    .bplib-upgrade {
        display: grid;
        grid-template-columns: auto 1fr auto;
        grid-template-rows: 20px auto;
        background: #eee;
        border-radius: 7px;
        padding: 5px 10px;
        height: 85px;
        grid-row-gap: 1px;
        margin-bottom: 4px;
    }
    html[data-theme="dark"] .bplib-upgrade {
        background: #474b58;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .bplib-upgrade .title {
        grid-column: 1 / 3;
        grid-row: 1 / 2;
        display: flex;
        flex-direction: row-reverse;
        align-items: center;
        justify-content: flex-end;
        color: #333;
    }
    html[data-theme="dark"] .bplib-upgrade .title { color: #fff; }

    .bplib-upgrade .title .name {
        font-size: 17px;
        font-weight: normal;
        font-family: "GameFont", sans-serif;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .bplib-upgrade .title .tier {
        margin-right: 9px;
        background: #49babe;
        border-radius: 12px;
        text-transform: uppercase;
        color: #fff;
        text-align: center;
        font-weight: bold;
        min-width: 50px;
        padding: 3px 8px;
        font-family: "GameFont", sans-serif;
        font-size: 14px;
        text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .bplib-upgrade .description {
        grid-column: 3 / 4;
        grid-row: 1 / 2;
        color: #aaa;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        font-family: "GameFont", sans-serif;
        gap: 10px;
    }

    .bplib-upgrade .icon {
        grid-column: 1 / 2;
        grid-row: 2 / 3;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .bplib-upgrade .requirements {
        grid-column: 2 / 3;
        grid-row: 2 / 3;
        display: flex;
        align-items: center;
        margin-left: 10px;
        color: #aaa;
        font-family: "GameFont", sans-serif;
    }

    .bplib-upgrade .bplib-upgrade-actions {
        grid-column: 3 / 4;
        grid-row: 2 / 3;
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: flex-end;
    }
    
    .bplib-action-delete {
        background: transparent;
        color: #ff6666;
        font-weight: bold;
        font-family: "GameFont", sans-serif;
        font-size: 14px;
        border: none;
        cursor: pointer;
    }
    .bplib-action-delete:hover {
        color: #ff0000;
    }
`;

  // src/store.js
  var BlueprintStore = {
    mod: null,
    init(mod) {
      this.mod = mod;
      if (!Array.isArray(mod.settings.blueprints)) mod.settings.blueprints = [];
      if (typeof mod.settings.nextBlueprintId !== "number" || mod.settings.nextBlueprintId < 1) {
        mod.settings.nextBlueprintId = 1;
      }
      if (!Array.isArray(mod.settings.availableTags)) {
        mod.settings.availableTags = [];
      } else {
        const usedTags = /* @__PURE__ */ new Set();
        (mod.settings.blueprints || []).forEach((bp) => {
          if (bp && Array.isArray(bp.tags)) bp.tags.forEach((t) => usedTags.add(t));
        });
        mod.settings.availableTags = mod.settings.availableTags.filter((t) => usedTags.has(t));
      }
      mod.settings.blueprints = mod.settings.blueprints.map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const id = typeof entry.id === "number" ? entry.id : mod.settings.nextBlueprintId++;
        return {
          id,
          name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : "Blueprint " + id,
          value: typeof entry.value === "string" ? entry.value : "",
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          createdAt: typeof entry.createdAt === "number" ? entry.createdAt : Date.now()
        };
      }).filter(Boolean);
      const maxId = mod.settings.blueprints.reduce((max, b) => Math.max(max, b.id || 0), 0);
      if (mod.settings.nextBlueprintId <= maxId) {
        mod.settings.nextBlueprintId = maxId + 1;
      }
      this.persist();
    },
    pruneTags() {
      const usedTags = /* @__PURE__ */ new Set();
      (this.mod.settings.blueprints || []).forEach((bp) => {
        if (bp && Array.isArray(bp.tags)) bp.tags.forEach((t) => usedTags.add(t));
      });
      this.mod.settings.availableTags = this.mod.settings.availableTags.filter((t) => usedTags.has(t));
    },
    getAll() {
      return this.mod.settings.blueprints;
    },
    getTags() {
      return this.mod.settings.availableTags;
    },
    ensureTags(tags) {
      let changed = false;
      tags.forEach((t) => {
        if (!this.mod.settings.availableTags.includes(t)) {
          this.mod.settings.availableTags.push(t);
          changed = true;
        }
      });
      if (changed) this.persist();
    },
    add(name, value, tags = []) {
      const cleanValue = String(value || "").replace(/\r\n/g, "\n").trim();
      const id = this.mod.settings.nextBlueprintId++;
      const entry = {
        id,
        name: name && name.trim() ? name.trim() : "Blueprint " + id,
        value: cleanValue,
        tags,
        createdAt: Date.now()
      };
      this.mod.settings.blueprints.push(entry);
      this.ensureTags(tags);
      this.persist();
      return entry;
    },
    update(id, updates) {
      const entry = this.mod.settings.blueprints.find((e) => e.id === id);
      if (!entry) return false;
      Object.assign(entry, updates);
      if (updates.tags) {
        this.ensureTags(updates.tags);
      }
      this.pruneTags();
      this.persist();
      return true;
    },
    remove(id) {
      const idx = this.mod.settings.blueprints.findIndex((e) => e.id === id);
      if (idx === -1) return false;
      this.mod.settings.blueprints.splice(idx, 1);
      this.pruneTags();
      this.persist();
      return true;
    },
    persist() {
      try {
        if (this.mod.saveSettings) this.mod.saveSettings();
      } catch (err) {
        console.error("[bp-book] Failed to save settings", err);
      }
    }
  };

  // lib/ui.js
  function injectHUDGameMenuButton(modInterface, buttonClass, title, clickHandler) {
    modInterface.extendClass(shapez.HUDGameMenu, ({ $old }) => ({
      createElements(parent) {
        $old.createElements.call(this, parent);
        const button = document.createElement("div");
        button.classList.add("button", buttonClass);
        button.title = title;
        this.element.appendChild(button);
        this.element.style.gridTemplateColumns = `repeat(${this.element.children.length}, 1fr)`;
        this.trackClicks(button, () => {
          try {
            clickHandler.call(this);
          } catch (err) {
            alert(`Menu click error (${buttonClass}): ` + err.message + "\n" + err.stack);
          }
        });
      }
    }));
  }
  function createTextAreaFormElement(id, label, placeholder = "", defaultValue = "") {
    return {
      id,
      label,
      valueChosen: { add: () => {
      } },
      // mock Signal
      getHtml() {
        const safeValue = (defaultValue || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `
                <div class="formElement">
                    <label>${this.label}</label>
                    <textarea id="custom-textarea-${this.id}" class="input-text" placeholder="${placeholder}" style="height: 150px; width: 100%; resize: vertical; box-sizing: border-box; background: rgba(0,0,0,0.2); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 4px;">${safeValue}</textarea>
                </div>
            `;
      },
      bindEvents(parent) {
        this.element = parent.querySelector(`#custom-textarea-${this.id}`);
      },
      focus() {
        if (this.element) this.element.focus();
      },
      isValid() {
        return true;
      },
      getValue() {
        return this.element ? this.element.value : "";
      }
    };
  }

  // src/ui.js
  var NOTIFY = shapez && shapez.enumNotificationType || {
    info: "info",
    warning: "warning",
    error: "error",
    success: "success"
  };
  var HUDBlueprintLibrary = class extends shapez.BaseHUDPart {
    createElements(parent) {
      this.parent = parent;
      this.activeTagFilter = null;
      this.searchQuery = "";
    }
    bindEvents() {
      const searchInput = this.overlay.querySelector("#bplib-search");
      searchInput.onpointerdown = () => searchInput.focus();
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.render();
      });
      this.dialog.trackClicks(this.overlay.querySelector("#bplib-btn-import"), () => {
        this.openImportDialog();
      });
    }
    _showBlueprintFormDialog({ title, desc, defaults = {}, textareaId = "string", onSubmit }) {
      const nameInput = new shapez.FormElementInput({
        id: "name",
        label: "Blueprint Name",
        placeholder: "New Blueprint",
        defaultValue: defaults.name || ""
      });
      const tagsInput = new shapez.FormElementInput({
        id: "tags",
        label: "Tags (comma-separated)",
        placeholder: "Belt, Factory",
        defaultValue: defaults.tags || ""
      });
      const stringInput = createTextAreaFormElement(textareaId, "Blueprint String", "Paste string here...", defaults.value || "");
      const dialog = new shapez.DialogWithForm({
        app: this.root.app,
        title,
        desc,
        formElements: [nameInput, tagsInput, stringInput],
        buttons: ["cancel:bad:escape", "ok:good:enter"],
        closeButton: false
      });
      this.root.hud.parts.dialogs.internalShowDialog(dialog);
      dialog.buttonSignals.ok.add(() => {
        const name = nameInput.getValue() || "New Blueprint";
        const str = stringInput.getValue();
        const tagsStr = tagsInput.getValue();
        if (!str.trim()) return this.notify("String cannot be empty", NOTIFY.warning);
        const newTags = tagsStr.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
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
        }
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
    handleSaveHotkey() {
      if (!this.root || !this.root.hud || !this.root.hud.parts.massSelector) return "stop_propagation";
      const selectedUids = this.root.hud.parts.massSelector.selectedUids;
      if (!selectedUids || selectedUids.size === 0) return "stop_propagation";
      const bpMod = shapez.BlueprintLibraryModLoader.mods.find((m) => m.metadata.id === "bp-string");
      if (!bpMod) return "stop_propagation";
      const selectedEntities = Array.from(selectedUids).map((uid) => this.root.entityMgr.findByUid(uid)).filter(Boolean);
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
        this.dialog.dialogElem.classList.add("dialogMods", "optionChooserDialog");
        this.visible = true;
        this.overlay = this.dialog.element || document.querySelector(".ingameDialog:last-child");
        this.bindEvents();
        this.render();
        this.dialog.closeRequested.add(() => {
          this.dialog = null;
          this.overlay = null;
          this.visible = false;
          this.cleanupDynamicClickDetectors();
        });
        this.overlay.querySelector("#bplib-search").focus();
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
        const bpMod = modLoader.mods.find((m) => m.metadata.id === "bp-string");
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
        const tagsContainer = this.overlay.querySelector("#bplib-filter-tags");
        if (tagsContainer) {
          tagsContainer.innerHTML = "";
          const allBtn = document.createElement("button");
          allBtn.className = this.activeTagFilter === null ? "active" : "";
          allBtn.innerText = "All";
          this.trackDynamicClick(allBtn, () => {
            this.activeTagFilter = null;
            this.render();
          });
          tagsContainer.appendChild(allBtn);
          BlueprintStore.getTags().forEach((tag) => {
            const btn = document.createElement("button");
            btn.className = this.activeTagFilter === tag ? "active" : "";
            btn.innerText = tag;
            this.trackDynamicClick(btn, () => {
              this.activeTagFilter = tag;
              this.render();
            });
            tagsContainer.appendChild(btn);
          });
        }
        this.renderGrid();
      } catch (err) {
        alert("Error in render(): " + err.message + "\n" + err.stack);
      }
    }
    _createBlueprintCard(bp, trackClick) {
      const card = document.createElement("div");
      card.className = "bplib-upgrade";
      const titleDiv = document.createElement("div");
      titleDiv.className = "title";
      const nameDiv = document.createElement("div");
      nameDiv.className = "name";
      nameDiv.innerText = bp.name;
      const tierDiv = document.createElement("div");
      tierDiv.className = "tier";
      tierDiv.innerText = "BP";
      titleDiv.appendChild(nameDiv);
      titleDiv.appendChild(tierDiv);
      const descDiv = document.createElement("div");
      descDiv.className = "description";
      descDiv.innerText = `Tags: ${(bp.tags || []).join(", ") || "None"}`;
      const delBtn = document.createElement("button");
      delBtn.className = "bplib-action-delete";
      delBtn.title = "Delete Blueprint";
      delBtn.innerText = "X";
      trackClick(delBtn, () => {
        this.deleteBlueprint(bp);
      });
      descDiv.appendChild(delBtn);
      const iconDiv = document.createElement("div");
      iconDiv.className = "icon";
      const reqDiv = document.createElement("div");
      reqDiv.className = "requirements";
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "bplib-upgrade-actions";
      const equipBtn = document.createElement("button");
      equipBtn.className = "button styledButton good bplib-btn-equip";
      equipBtn.innerText = "EQUIP";
      trackClick(equipBtn, () => {
        this.equipBlueprint(bp.value);
      });
      const editBtn = document.createElement("button");
      editBtn.className = "button styledButton bplib-btn-edit";
      editBtn.innerText = "EDIT";
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
        const grid = this.overlay.querySelector("#bplib-grid");
        grid.innerHTML = "";
        let blueprints = BlueprintStore.getAll();
        if (this.searchQuery) {
          blueprints = blueprints.filter((b) => b.name.toLowerCase().includes(this.searchQuery));
        }
        if (this.activeTagFilter) {
          blueprints = blueprints.filter((b) => (b.tags || []).includes(this.activeTagFilter));
        }
        if (blueprints.length === 0) {
          grid.innerHTML = '<div style="text-align: center; color: #777; padding: 40px;">No blueprints found.</div>';
          return;
        }
        const trackClick = this.trackDynamicClick.bind(this);
        blueprints.forEach((bp) => {
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
          value: bp.value
        },
        textareaId: "edit_string",
        onSubmit: (name, str, tags) => {
          BlueprintStore.update(bp.id, { name, value: str, tags });
          this.notify("Blueprint updated!", NOTIFY.success);
          if (this.visible) {
            this.render();
          }
        }
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
  };

  // src/index.js
  var BlueprintLibraryMod = class extends shapez.Mod {
    init() {
      shapez.BlueprintLibraryModLoader = this.modLoader;
      BlueprintStore.init(this);
      this.modInterface.registerCss(CSS);
      this.modInterface.registerHudElement("blueprintLibrary", HUDBlueprintLibrary);
      this.modInterface.registerIngameKeybinding({
        id: "blueprint_book_save",
        keyCode: 80,
        // 'P'
        translation: "Save Blueprint to Book",
        modifiers: { ctrl: true },
        handler: (root) => {
          const library = root.hud?.parts?.blueprintLibrary;
          if (!library) return;
          return library.handleSaveHotkey();
        }
      });
      this.modInterface.registerIngameKeybinding({
        id: "blueprint_book_toggle",
        keyCode: 80,
        // 'P'
        translation: "Open/Close Blueprint Book",
        handler: (root) => {
          const library = root.hud?.parts?.blueprintLibrary;
          if (!library) return;
          return library.handleToggleHotkey();
        }
      });
      injectHUDGameMenuButton(
        this.modInterface,
        "blueprintLibrary",
        "Blueprint Book",
        function() {
          const library = this.root?.hud?.parts?.blueprintLibrary;
          if (!library) {
            console.error("HUD Blueprint Library part is undefined!");
            return;
          }
          if (library.visible) {
            library.close();
          } else {
            library.show();
          }
        }
      );
    }
  };
  window.$shapez_registerMod(BlueprintLibraryMod, METADATA);
})();
