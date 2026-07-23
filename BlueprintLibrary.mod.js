(() => {
  // src/metadata.js
  var METADATA = {
    id: "bp-library",
    name: "Blueprint Library",
    author: "Skigim",
    version: "1.0.2",
    website: "",
    description: "A full rewrite of KiitikM's Blueprint Library mod. Features include: perfectly integrated native-style UI, custom tagging and filtering system, unified edit dialogs, and memory leak fixes.",
    minimumGameVersion: ">=1.5.0",
    doesNotAffectSavegame: true,
    dependencies: ["bp-string"],
    settings: {
      blueprints: [],
      nextBlueprintId: 1,
      availableTags: [],
      lastSeenVersion: "",
      skippedVersion: ""
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
    .updateAvailableDialog .dialogInner .content {
        width: 550px !important;
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
        pointer-events: auto;
    }
    .bplib-toolbar {
        display: flex; gap: 10px; margin-bottom: 20px; align-items: center;
    }
    .bplib-grid {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding-right: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: auto;
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
        grid-template-columns: 1fr auto;
        grid-template-rows: 24px 1fr;
        background: #eee;
        border-radius: 7px;
        padding: 8px 12px;
        height: 95px;
        grid-row-gap: 4px;
        margin-bottom: 4px;
        box-sizing: border-box;
    }
    html[data-theme="dark"] .bplib-upgrade {
        background: #474b58;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .bplib-upgrade .title {
        grid-column: 1 / 2;
        grid-row: 1 / 2;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        color: #333;
        overflow: hidden;
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

    .bplib-upgrade .description {
        grid-column: 2 / 3;
        grid-row: 1 / 2;
        color: #aaa;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        font-family: "GameFont", sans-serif;
        gap: 10px;
    }

    .bplib-upgrade .requirements {
        grid-column: 1 / 2;
        grid-row: 2 / 3;
        display: flex;
        align-items: center;
    }

    .bplib-upgrade .requirement {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
    }

    .bplib-upgrade .requirement .shape {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #2e3440;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 2px 4px rgba(0,0,0,0.3);
    }

    .bplib-upgrade .requirement .amount {
        background: #55c767;
        color: #ffffff;
        font-family: "GameFont", sans-serif;
        font-size: 13px;
        font-weight: bold;
        padding: 2px 10px;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
    }

    .bplib-upgrade .bplib-upgrade-actions {
        grid-column: 2 / 3;
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

    /* --- HUD OVERLAYS --- */
    #ingame_HUD_PinnedShapes {
        top: calc(210px * var(--ui-scale)) !important;
    }
`;

  // src/store.js
  var BlueprintStore = {
    mod: null,
    async init(mod, readFileAsync = null, listKeysAsync = null) {
      this.mod = mod;
      if (!mod.settings || typeof mod.settings !== "object") {
        mod.settings = {};
      }
      if (!Array.isArray(mod.settings.blueprints)) {
        mod.settings.blueprints = [];
      }
      console.log(`[BlueprintBook] BlueprintStore.init() - Current stored blueprints count: ${mod.settings.blueprints.length}`);
      console.log(`[BlueprintBook] readFileAsync helper available: ${typeof readFileAsync === "function"}`);
      await this.migrateLegacySettings(mod, readFileAsync, listKeysAsync);
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
      if (typeof mod.settings.lastSeenVersion !== "string") {
        mod.settings.lastSeenVersion = "";
      }
      if (typeof mod.settings.skippedVersion !== "string") {
        mod.settings.skippedVersion = "";
      }
      const maxId = mod.settings.blueprints.reduce((max, b) => Math.max(max, b.id || 0), 0);
      if (mod.settings.nextBlueprintId <= maxId) {
        mod.settings.nextBlueprintId = maxId + 1;
      }
      console.log(`[BlueprintBook] Init complete. Total blueprints in store: ${mod.settings.blueprints.length}, nextID: ${mod.settings.nextBlueprintId}`);
      this.persist();
    },
    async migrateLegacySettings(mod, readFileAsync, listKeysAsync) {
      console.log("[BlueprintBook] Starting legacy settings migration check...");
      const currentBlueprints = Array.isArray(mod.settings.blueprints) ? mod.settings.blueprints : [];
      const existingValues = new Set(currentBlueprints.map((bp) => bp && bp.value).filter(Boolean));
      const existingNames = new Set(currentBlueprints.map((bp) => bp && bp.name).filter(Boolean));
      let migratedAny = false;
      if (typeof readFileAsync === "function") {
        try {
          const candidateFiles = await this.getDynamicCandidateFiles(mod, listKeysAsync);
          console.log("[BlueprintBook] Candidate legacy storage files to check:", candidateFiles);
          for (const file of candidateFiles) {
            try {
              console.log(`[BlueprintBook] Attempting to read candidate file: "${file}"`);
              const raw = await readFileAsync(file);
              if (raw) {
                console.log(`[BlueprintBook] -> File "${file}" found! Content length: ${raw.length} bytes.`);
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.blueprints) && parsed.blueprints.length > 0) {
                  console.log(`[BlueprintBook] -> Found ${parsed.blueprints.length} blueprints in "${file}". Merging...`);
                  for (const bp of parsed.blueprints) {
                    if (bp && (bp.value || bp.name)) {
                      if (!existingValues.has(bp.value) && !existingNames.has(bp.name)) {
                        currentBlueprints.push(bp);
                        if (bp.value) existingValues.add(bp.value);
                        if (bp.name) existingNames.add(bp.name);
                        migratedAny = true;
                        console.log(`[BlueprintBook]   [MIGRATED] Blueprint "${bp.name}" (value len: ${bp.value ? bp.value.length : 0})`);
                      } else {
                        console.log(`[BlueprintBook]   [SKIPPED] Duplicate blueprint "${bp.name}"`);
                      }
                    }
                  }
                  if (Array.isArray(parsed.availableTags)) {
                    mod.settings.availableTags = mod.settings.availableTags || [];
                    parsed.availableTags.forEach((t) => {
                      if (!mod.settings.availableTags.includes(t)) {
                        mod.settings.availableTags.push(t);
                      }
                    });
                  }
                } else {
                  console.log(`[BlueprintBook] -> File "${file}" has no valid blueprints array.`);
                }
              } else {
                console.log(`[BlueprintBook] -> File "${file}" returned empty content.`);
              }
            } catch (e) {
              console.log(`[BlueprintBook] -> Candidate file "${file}" read result: not found or parse error (${e})`);
            }
          }
        } catch (err) {
          console.warn("[BlueprintBook] Migration read failure:", err);
        }
      } else {
        console.log("[BlueprintBook] No readFileAsync provided. Skipping storage file scan.");
      }
      try {
        if (typeof localStorage !== "undefined") {
          console.log("[BlueprintBook] ALL localStorage keys found:", Object.keys(localStorage));
          const legacyKeys = [
            "bplib_blueprints",
            "blueprint_library_blueprints",
            "blueprints",
            "bp_library_settings"
          ];
          console.log("[BlueprintBook] Checking localStorage legacy keys:", legacyKeys);
          for (const key of legacyKeys) {
            const item = localStorage.getItem(key);
            if (item) {
              console.log(`[BlueprintBook] -> Found item in localStorage key "${key}"!`);
              try {
                const parsed = JSON.parse(item);
                const bps = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.blueprints) ? parsed.blueprints : null;
                if (bps && bps.length > 0) {
                  console.log(`[BlueprintBook] -> Found ${bps.length} blueprints in localStorage key "${key}". Merging...`);
                  for (const bp of bps) {
                    if (bp && (bp.value || bp.name)) {
                      if (!existingValues.has(bp.value) && !existingNames.has(bp.name)) {
                        currentBlueprints.push(bp);
                        if (bp.value) existingValues.add(bp.value);
                        if (bp.name) existingNames.add(bp.name);
                        migratedAny = true;
                        console.log(`[BlueprintBook]   [MIGRATED] Blueprint "${bp.name}" from localStorage`);
                      }
                    }
                  }
                }
              } catch (e) {
                console.warn(`[BlueprintBook] Error parsing localStorage key "${key}":`, e);
              }
            }
          }
        }
      } catch (e) {
      }
      if (migratedAny) {
        console.log(`[BlueprintBook] Migration succeeded! Merged blueprints. Total now: ${currentBlueprints.length}`);
        mod.settings.blueprints = currentBlueprints;
      } else {
        console.log("[BlueprintBook] Migration finished. No new blueprints were added.");
      }
    },
    async getDynamicCandidateFiles(mod, listKeysAsync = null) {
      const modId = mod && mod.meta && mod.meta.id ? mod.meta.id : "bp-library";
      const currentVersion = mod && mod.meta && mod.meta.version ? String(mod.meta.version) : "";
      const currentFile = `modsettings_${modId}__${currentVersion}.json`;
      const candidates = /* @__PURE__ */ new Set();
      if (typeof listKeysAsync === "function") {
        try {
          const idbKeys = await listKeysAsync();
          console.log("[BlueprintBook] ALL IndexedDB storage keys found:", idbKeys);
          for (const key of idbKeys) {
            if (typeof key === "string" && key !== currentFile) {
              if (key.includes("modsettings") || key.includes("bp") || key.includes("blueprint") || key.includes("library")) {
                candidates.add(key);
              }
            }
          }
        } catch (e) {
          console.warn("[BlueprintBook] Failed to list IndexedDB keys:", e);
        }
      }
      const knownIds = Array.from(/* @__PURE__ */ new Set([
        modId,
        "bp-library",
        "bp_library",
        "BlueprintLibrary",
        "blueprint_library",
        "blueprint-library",
        "BlueprintBook",
        "bp-book",
        "bp_book",
        "blueprintbook"
      ]));
      const versionSet = /* @__PURE__ */ new Set();
      if (currentVersion) {
        const parts = currentVersion.split(".").map((n) => parseInt(n, 10));
        if (parts.length >= 3 && !parts.some(isNaN)) {
          const [major, minor, patch] = parts;
          for (let p = patch - 1; p >= 0; p--) {
            versionSet.add(`${major}.${minor}.${p}`);
            versionSet.add(`${major}.${minor}`);
          }
          for (let m = minor - 1; m >= 0; m--) {
            versionSet.add(`${major}.${m}.0`);
            versionSet.add(`${major}.${m}`);
          }
          for (let maj = major - 1; maj >= 0; maj--) {
            versionSet.add(`${maj}.0.0`);
            versionSet.add(`${maj}.0`);
          }
        } else if (parts.length === 2 && !parts.some(isNaN)) {
          const [major, minor] = parts;
          for (let m = minor - 1; m >= 0; m--) {
            versionSet.add(`${major}.${m}`);
          }
        }
      }
      ["1.0.1", "1.0.0", "1.0", "2.0", "0.1.0"].forEach((v) => versionSet.add(v));
      for (const id of knownIds) {
        for (const ver of versionSet) {
          const filename = `modsettings_${id}__${ver}.json`;
          if (filename !== currentFile) {
            candidates.add(filename);
          }
        }
      }
      return Array.from(candidates);
    },
    getLastSeenVersion() {
      if (this.mod && this.mod.settings && typeof this.mod.settings.lastSeenVersion === "string" && this.mod.settings.lastSeenVersion) {
        return this.mod.settings.lastSeenVersion;
      }
      try {
        if (typeof localStorage !== "undefined") {
          return localStorage.getItem("bplib_last_seen_version") || "";
        }
      } catch (e) {
      }
      return "";
    },
    setLastSeenVersion(version) {
      const v = String(version || "");
      if (this.mod && this.mod.settings) {
        this.mod.settings.lastSeenVersion = v;
        this.persist();
      }
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("bplib_last_seen_version", v);
        }
      } catch (e) {
      }
    },
    getSkippedVersion() {
      if (this.mod && this.mod.settings && typeof this.mod.settings.skippedVersion === "string" && this.mod.settings.skippedVersion) {
        return this.mod.settings.skippedVersion;
      }
      try {
        if (typeof localStorage !== "undefined") {
          return localStorage.getItem("bplib_skipped_version") || "";
        }
      } catch (e) {
      }
      return "";
    },
    setSkippedVersion(version) {
      const v = String(version || "");
      if (this.mod && this.mod.settings) {
        this.mod.settings.skippedVersion = v;
        this.persist();
      }
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("bplib_skipped_version", v);
        }
      } catch (e) {
      }
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
      if (!updates || typeof updates !== "object") return false;
      const entry = this.mod.settings.blueprints.find((e) => e.id === id);
      if (!entry) return false;
      if (updates.name !== void 0) {
        entry.name = typeof updates.name === "string" && updates.name.trim() ? updates.name.trim() : "Blueprint " + id;
      }
      if (updates.value !== void 0) {
        entry.value = String(updates.value || "").replace(/\r\n/g, "\n").trim();
      }
      if (updates.tags !== void 0) {
        entry.tags = Array.isArray(updates.tags) ? updates.tags : [];
        this.ensureTags(entry.tags);
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
        const count = this.mod && this.mod.settings && Array.isArray(this.mod.settings.blueprints) ? this.mod.settings.blueprints.length : 0;
        console.log(`[BlueprintBook] Persisting store settings to storage file... (Total blueprints: ${count})`);
        if (this.mod && this.mod.saveSettings) this.mod.saveSettings();
      } catch (err) {
        console.error("[BlueprintBook] Failed to save settings:", err);
      }
    }
  };

  // lib/ui.js
  function extendHUDGameMenu(modInterface, buttonClass, title, clickHandler) {
    modInterface.extendClass(shapez.HUDGameMenu, ({ $old }) => ({
      createElements(parent) {
        $old.createElements.call(this, parent);
        const button = document.createElement("div");
        button.classList.add("button", buttonClass);
        if (title) {
          button.title = title;
        }
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
  function extendHUDKeybindingOverlay(modInterface) {
    modInterface.extendClass(shapez.HUDKeybindingOverlay, ({ $old }) => ({
      createElements(parent) {
        $old.createElements.call(this, parent);
        const mapper = this.root.keyMapper;
        const k = shapez.KEYMAPPINGS;
        const customBindings = [
          {
            // [SELECTION ACTIVE] Save selected area to Blueprint Book
            label: "Save to Book",
            keys: [k?.massSelect?.massSelectStart || 17, "+", 80],
            condition: () => this.anythingSelectedOnMap
          },
          {
            // Open / Toggle Blueprint Book when not placing a blueprint
            label: "Blueprint Book",
            keys: [80],
            condition: () => !this.blueprintPlacementActive
          }
        ];
        for (let i = 0; i < customBindings.length; ++i) {
          let html = "";
          const handle = customBindings[i];
          for (let j = 0; j < handle.keys.length; ++j) {
            const key = handle.keys[j];
            if (key === "+") {
              html += "+";
            } else if (typeof key === "string") {
              html += `<code class="keybinding">${key}</code>`;
            } else {
              let code = key;
              if (typeof key === "object" && key !== null) {
                code = key.keyCode;
                if (!code && mapper && mapper.getBinding) {
                  try {
                    code = mapper.getBinding(key).keyCode;
                  } catch (e) {
                  }
                }
              }
              const keyString = shapez.getStringForKeyCode ? shapez.getStringForKeyCode(code || 80) : "P";
              html += `<code class="keybinding">${keyString}</code>`;
            }
          }
          html += `<label>${handle.label}</label>`;
          handle.cachedElement = shapez.makeDiv(this.element, null, ["binding"], html);
          handle.cachedVisibility = false;
          this.keybindings.push(handle);
        }
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

  // src/updater.js
  function compareVersions(current, latest) {
    const clean = (v) => (v || "").toString().replace(/^v/i, "").trim().split(".").map((n) => parseInt(n, 10) || 0);
    const cParts = clean(current);
    const lParts = clean(latest);
    const maxLength = Math.max(cParts.length, lParts.length);
    for (let i = 0; i < maxLength; i++) {
      const c = cParts[i] || 0;
      const l = lParts[i] || 0;
      if (l > c) return 1;
      if (c > l) return -1;
    }
    return 0;
  }
  async function checkForUpdates(currentVersion, repoSlug = "Skigim/BlueprintBook") {
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 5e3) : null;
      const response = await fetch(`https://api.github.com/repos/${repoSlug}/releases/latest`, {
        headers: { "Accept": "application/vnd.github.v3+json" },
        signal: controller ? controller.signal : void 0
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (!response.ok) return { updateAvailable: false };
      const data = await response.json();
      const latestTag = data.tag_name || data.name || "";
      const downloadUrl = data.html_url || `https://github.com/${repoSlug}/releases/latest`;
      const releaseNotes = data.body || "";
      if (compareVersions(currentVersion, latestTag) === 1) {
        return {
          updateAvailable: true,
          latestVersion: latestTag.replace(/^v/i, ""),
          downloadUrl,
          releaseNotes
        };
      }
    } catch (err) {
      console.log("[BlueprintBook] Update check skipped:", err.message || err);
    }
    return { updateAvailable: false };
  }

  // src/preview.js
  function getBlueprintEntityCount(root, blueprintString) {
    const gShapez = typeof globalThis !== "undefined" && globalThis.shapez || typeof window !== "undefined" && window.shapez;
    if (!gShapez || !root) return 0;
    const modLoader = gShapez.BlueprintLibraryModLoader;
    if (!modLoader || !Array.isArray(modLoader.mods)) return 0;
    const bpMod = modLoader.mods.find((m) => m.metadata?.id === "bp-string");
    if (!bpMod) return 0;
    try {
      const entities = bpMod.constructor.deserialize(root, blueprintString);
      return entities ? entities.length : 0;
    } catch {
      return 0;
    }
  }
  function getBlueprintCost(root, blueprintString) {
    const gShapez = typeof globalThis !== "undefined" && globalThis.shapez || typeof window !== "undefined" && window.shapez;
    if (!gShapez || !root) return null;
    if (root.gameMode && typeof root.gameMode.getHasFreeCopyPaste === "function" && root.gameMode.getHasFreeCopyPaste()) {
      return 0;
    }
    const modLoader = gShapez.BlueprintLibraryModLoader;
    if (!modLoader || !Array.isArray(modLoader.mods)) return null;
    const bpMod = modLoader.mods.find((m) => m.metadata?.id === "bp-string");
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
  var InteractiveBlueprintViewer = class {
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
      const gShapez = typeof globalThis !== "undefined" && globalThis.shapez || typeof window !== "undefined" && window.shapez;
      if (!gShapez || !this.root) return;
      const modLoader = gShapez.BlueprintLibraryModLoader;
      if (!modLoader || !Array.isArray(modLoader.mods)) return;
      const bpMod = modLoader.mods.find((m) => m.metadata?.id === "bp-string");
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
            minX,
            minY,
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
          try {
            e.target.setPointerCapture(e.pointerId);
          } catch (err) {
          }
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
          try {
            e.target.releasePointerCapture(e.pointerId);
          } catch (err) {
          }
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
      const gShapez = typeof globalThis !== "undefined" && globalThis.shapez || typeof window !== "undefined" && window.shapez;
      if (!gShapez) return;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const mapBgColor = gShapez.THEMES && gShapez.THEMES.dark && gShapez.THEMES.dark.map && gShapez.THEMES.dark.map.background || "#1c2333";
      this.ctx.fillStyle = mapBgColor;
      this.ctx.fillRect(0, 0, w, h);
      if (!this.entities || this.entities.length === 0) return;
      this.ctx.save();
      this.ctx.translate(this.panX, this.panY);
      const currentScale = this.baseScale * this.zoom;
      this.ctx.scale(currentScale, currentScale);
      const parameters = new gShapez.DrawParameters({
        context: this.ctx,
        visibleRect: new gShapez.Rectangle(-1e4, -1e4, 2e4, 2e4),
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
        const sprite = typeof staticComp.getSprite === "function" && staticComp.getSprite() || meta && typeof meta.getPreviewSprite === "function" && meta.getPreviewSprite(staticComp.rotationVariant || 0, staticComp.getVariant ? staticComp.getVariant() : void 0) || typeof staticComp.getBlueprintSprite === "function" && staticComp.getBlueprintSprite();
        if (sprite && typeof staticComp.drawSpriteOnBoundsClipped === "function") {
          staticComp.drawSpriteOnBoundsClipped(parameters, sprite, 0, relativeOrigin);
        }
      }
      this.ctx.restore();
    }
  };
  function renderBlueprintCostElement(root, cost, iconSize = 30) {
    const container = document.createElement("div");
    container.className = "requirements";
    if (cost === null || cost === void 0) {
      return container;
    }
    const req = document.createElement("div");
    req.className = "requirement";
    const shapeDiv = document.createElement("div");
    shapeDiv.className = "shape";
    if (root && root.shapeDefinitionMgr && root.gameMode) {
      try {
        const shapeKey = typeof root.gameMode.getBlueprintShapeKey === "function" ? root.gameMode.getBlueprintShapeKey() : "CuCuCuCu";
        const costShape = root.shapeDefinitionMgr.getShapeFromShortKey(shapeKey);
        if (costShape && typeof costShape.generateAsCanvas === "function") {
          const canvas = costShape.generateAsCanvas(iconSize);
          shapeDiv.appendChild(canvas);
        }
      } catch (e) {
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
  function openBlueprintPreviewDialog(root, blueprint, onEquip) {
    const gShapez = typeof globalThis !== "undefined" && globalThis.shapez || typeof window !== "undefined" && window.shapez;
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
    if (dialog.element) {
      const buttons = dialog.element.querySelectorAll(".buttons button, .button.good");
      buttons.forEach((btn) => {
        if (btn.classList.contains("good") || btn.dataset.button === "equip" || btn.textContent.includes("UNDEFINED")) {
          btn.textContent = "EQUIP";
        }
      });
    }
    if (dialog.element) {
      const costSlot = dialog.element.querySelector(".bplib-preview-cost-slot");
      if (costSlot && cost !== null && cost !== void 0) {
        const labelSpan = document.createElement("span");
        labelSpan.className = "label";
        labelSpan.textContent = "Cost:";
        labelSpan.style.marginRight = "6px";
        costSlot.appendChild(labelSpan);
        const costElem = renderBlueprintCostElement(root, cost, 28);
        costSlot.appendChild(costElem);
      }
    }
    const liveContainer = dialog.element.querySelector(".bplib-preview-canvas-container");
    if (liveContainer) {
      const viewer = new InteractiveBlueprintViewer(root, blueprint.value, liveContainer);
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
      dialog.closeRequested.add(() => {
        try {
          viewer.cleanup();
        } catch (e) {
        }
      });
    }
  }

  // src/changelog.js
  var MOD_CHANGELOG = [
    {
      version: "1.0.2",
      date: "2026-07-22",
      entries: [
        "<strong>Welcome Dialog Fix</strong>: Fixed an issue where the welcome popup would re-appear every time you loaded your save game.",
        "<strong>Library Scrolling Fix</strong>: Fixed scrolling issues in the blueprint book window.",
        "<strong>Blueprint Migration Fix</strong>: Fixed an issue where blueprints didn't persist across updated versions."
      ]
    },
    {
      version: "1.0.1",
      date: "2026-07-21",
      entries: [
        "<strong>Native Hotkey Support</strong>: Full keybind integration ('P' to toggle book, 'Ctrl+P' to save blueprint) with custom keybinding overlay hints and rebinding support in settings.",
        "<strong>Automatic Update Notifications</strong>: You will now be notified automatically when a new update is available, with a handy VIEW ON MOD.IO button to download the latest version in your browser.",
        "<strong>Welcome Dialog</strong>: A dialog that appears when running a new version for the first time, showing what changed.",
        "<strong>Cleaner Interface</strong>: Rebuilt the blueprint library popups and card layouts for smoother performance and smaller mod file size."
      ]
    }
  ];
  function getReleaseNotesForVersion(version) {
    const cleanVer = (version || "").toString().replace(/^v/i, "").trim();
    const entry = MOD_CHANGELOG.find((item) => item.version.replace(/^v/i, "").trim() === cleanVer);
    return entry ? entry.entries : [];
  }
  var RELEASE_NOTES_1_0_2 = getReleaseNotesForVersion("1.0.2");
  var RELEASE_NOTES_1_0_1 = getReleaseNotesForVersion("1.0.1");

  // src/ui.js
  var NOTIFY = shapez && shapez.enumNotificationType || {
    info: "info",
    warning: "warning",
    error: "error",
    success: "success"
  };
  function registerNativeChangelogEntry() {
    if (typeof shapez !== "undefined" && shapez.CHANGELOG && Array.isArray(shapez.CHANGELOG)) {
      const id = `Blueprint Book v${METADATA.version}`;
      if (!shapez.CHANGELOG.some((item) => item.version === id)) {
        shapez.CHANGELOG.unshift({
          version: id,
          date: "2026-07-21",
          entries: MOD_CHANGELOG[0].entries
        });
      }
    }
  }
  var HUDBlueprintLibrary = class _HUDBlueprintLibrary extends shapez.BaseHUDPart {
    createElements(parent) {
      this.parent = parent;
      this.activeTagFilter = null;
      this.searchQuery = "";
    }
    bindEvents() {
      const searchInput = this.overlay.querySelector("#bplib-search");
      if (searchInput) {
        searchInput.onpointerdown = () => searchInput.focus();
        searchInput.addEventListener("input", (e) => {
          this.searchQuery = e.target.value.toLowerCase();
          this.render();
        });
      }
      const grid = this.overlay.querySelector("#bplib-grid");
      if (grid) {
        grid.addEventListener("wheel", (e) => {
          e.stopPropagation();
        }, { passive: true });
      }
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
      if (dialog.buttonSignals && dialog.buttonSignals.ok) {
        dialog.buttonSignals.ok.add(() => {
          const name = nameInput.getValue() || "New Blueprint";
          const str = stringInput.getValue();
          const tagsStr = tagsInput.getValue();
          if (!str.trim()) return this.notify("String cannot be empty", NOTIFY.warning);
          const newTags = tagsStr.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
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
        }
      });
    }
    cleanupDynamicClickDetectors() {
      if (this.dynamicClickDetectors) {
        for (const d of this.dynamicClickDetectors) {
          if (d && typeof d.cleanup === "function") {
            d.cleanup();
          }
          if (this.clickDetectors) {
            const index = this.clickDetectors.indexOf(d);
            if (index >= 0) this.clickDetectors.splice(index, 1);
          }
        }
        this.dynamicClickDetectors = [];
      }
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
      if (_HUDBlueprintLibrary.hasCheckedUpdate) return;
      _HUDBlueprintLibrary.hasCheckedUpdate = true;
      const currentVersion = METADATA.version;
      const lastSeenVersion = BlueprintStore.getLastSeenVersion();
      const skippedVersion = BlueprintStore.getSkippedVersion();
      try {
        const update = await checkForUpdates(currentVersion);
        if (update.updateAvailable && update.latestVersion !== skippedVersion) {
          this.showUpdateDialog(update);
          BlueprintStore.setLastSeenVersion(currentVersion);
        } else if (lastSeenVersion !== currentVersion) {
          this.showWelcomeDialog(currentVersion);
          BlueprintStore.setLastSeenVersion(currentVersion);
        }
      } catch (err) {
        console.error("[BlueprintBook] Update check failed:", err);
      }
    }
    showWelcomeDialog(version) {
      const rawNotes = getReleaseNotesForVersion(version);
      const entries = Array.isArray(rawNotes) ? rawNotes : (rawNotes || "").split("\n").map((l) => l.trim()).filter(Boolean);
      const notesHtml = entries.map((entry) => `<div style="margin-bottom: 6px; line-height: 1.35; padding-left: 14px; position: relative;"><span style="position: absolute; left: 0; color: #4CAF50;">\u2022</span>${entry}</div>`).join("");
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
      const escapeHtml = (str) => String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const notesHtml = (releaseNotes || "").split("\n").map((line) => line.trim()).filter((line) => line.length > 0).map((line) => `<div style="margin-bottom: 6px; line-height: 1.3;">${escapeHtml(line)}</div>`).join("");
      const dialog = new shapez.Dialog({
        app: this.root.app,
        title: "Update Available!",
        contentHTML: `
                <div style="padding: 10px; text-align: center;">
                    <p style="font-size: 1.1em; margin-bottom: 12px;">A new version of <strong>Blueprint Book</strong> is available!</p>
                    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; text-align: left; margin-bottom: 16px;">
                        <div><strong>Installed Version:</strong> v${METADATA.version}</div>
                        <div><strong>Latest Version:</strong> <span style="color: #4CAF50;">v${latestVersion}</span></div>
                        ${notesHtml ? `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.85em; color: #ccc; max-height: 100px; overflow-y: auto; pointer-events: auto;">${notesHtml}</div>` : ""}
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
      this.cleanupDynamicClickDetectors();
      this.visible = false;
      this.dialog = null;
      this.overlay = null;
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
        this.dialog.dialogElem.classList.add("dialogMods", "optionChooserDialog", "dialogUpgrades");
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
      } catch (err) {
        console.error("Error in show():", err);
        this.notify("Error opening Blueprint Book. Check console.", NOTIFY.error);
      }
    }
    close() {
      if (this.dialog && this.root && this.root.hud && this.root.hud.parts && this.root.hud.parts.dialogs) {
        this.root.hud.parts.dialogs.closeDialog(this.dialog);
      }
      this.cleanup();
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
          if (this.root.hud.signals && this.root.hud.signals.pasteBlueprintRequested) {
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
        console.error("Error in render():", err);
        this.notify("Error rendering Blueprint Book. Check console.", NOTIFY.error);
      }
    }
    _createBlueprintCard(bp, trackClick) {
      const card = document.createElement("div");
      card.className = "bplib-upgrade shopCard";
      const titleDiv = document.createElement("div");
      titleDiv.className = "title";
      const nameDiv = document.createElement("div");
      nameDiv.className = "name";
      nameDiv.textContent = bp.name || "Untitled";
      titleDiv.appendChild(nameDiv);
      const descDiv = document.createElement("div");
      descDiv.className = "description";
      descDiv.textContent = `Tags: ${(bp.tags || []).join(", ") || "None"}`;
      const delBtn = document.createElement("button");
      delBtn.className = "bplib-action-delete";
      delBtn.title = "Delete Blueprint";
      delBtn.textContent = "X";
      trackClick(delBtn, () => {
        this.deleteBlueprint(bp);
      });
      descDiv.appendChild(delBtn);
      const reqDiv = document.createElement("div");
      reqDiv.className = "requirements";
      const cost = getBlueprintCost(this.root, bp.value);
      if (cost !== null && cost !== void 0) {
        const costElem = renderBlueprintCostElement(this.root, cost, 24);
        reqDiv.appendChild(costElem);
      }
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "bplib-upgrade-actions";
      const previewBtn = document.createElement("button");
      previewBtn.className = "button styledButton bplib-btn-preview";
      previewBtn.textContent = "PREVIEW";
      trackClick(previewBtn, () => {
        openBlueprintPreviewDialog(this.root, bp, () => this.equipBlueprint(bp.value));
      });
      const equipBtn = document.createElement("button");
      equipBtn.className = "button styledButton good bplib-btn-equip";
      equipBtn.textContent = "EQUIP";
      trackClick(equipBtn, () => {
        this.equipBlueprint(bp.value);
      });
      const editBtn = document.createElement("button");
      editBtn.className = "button styledButton bplib-btn-edit";
      editBtn.textContent = "EDIT";
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
    async init() {
      console.log("[BlueprintBook] BlueprintLibraryMod.init() called.");
      shapez.BlueprintLibraryModLoader = this.modLoader;
      let readFileAsync = null;
      let listKeysAsync = null;
      try {
        const isStandalone = typeof G_IS_STANDALONE !== "undefined" && G_IS_STANDALONE;
        console.log("[BlueprintBook] Setting up storage reader. G_IS_STANDALONE =", isStandalone);
        let idbStorage = null;
        let electronStorage = null;
        if (shapez.StorageImplBrowserIndexedDB) {
          try {
            idbStorage = new shapez.StorageImplBrowserIndexedDB(this.app);
            await idbStorage.initialize();
          } catch (e) {
            console.warn("[BlueprintBook] IDB storage init failed:", e);
          }
        }
        if (shapez.StorageImplElectron) {
          try {
            electronStorage = new shapez.StorageImplElectron(this.app);
            await electronStorage.initialize();
          } catch (e) {
            console.warn("[BlueprintBook] Electron storage init failed:", e);
          }
        }
        const mainStorage = isStandalone && electronStorage ? electronStorage : idbStorage || electronStorage;
        readFileAsync = async (filename) => {
          if (mainStorage) {
            try {
              const res = await mainStorage.readFileAsync(filename);
              if (res) return res;
            } catch (e) {
            }
          }
          const fallbackStorage = mainStorage === idbStorage ? electronStorage : idbStorage;
          if (fallbackStorage) {
            try {
              const res = await fallbackStorage.readFileAsync(filename);
              if (res) return res;
            } catch (e) {
            }
          }
          throw "file_not_found";
        };
        listKeysAsync = async () => {
          const keys = [];
          if (idbStorage && idbStorage.database) {
            try {
              const idbKeys = await new Promise((resolve) => {
                const tx = idbStorage.database.transaction(["files"], "readonly");
                const req = tx.objectStore("files").getAllKeys();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
              });
              keys.push(...idbKeys);
            } catch (e) {
            }
          }
          return keys;
        };
        console.log("[BlueprintBook] Storage readers created successfully.");
      } catch (e) {
        console.warn("[BlueprintBook] Could not build storage reader for migration:", e);
      }
      console.log("[BlueprintBook] Initializing BlueprintStore...");
      await BlueprintStore.init(this, readFileAsync, listKeysAsync);
      console.log("[BlueprintBook] BlueprintStore initialized.");
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
        handler: (root, event) => {
          if (event && (event.ctrlKey || event.metaKey)) return;
          const library = root.hud?.parts?.blueprintLibrary;
          if (!library) return;
          return library.handleToggleHotkey();
        }
      });
      extendHUDKeybindingOverlay(this.modInterface);
      extendHUDGameMenu(
        this.modInterface,
        "blueprintLibrary",
        "",
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
