(() => {
  // src/metadata.js
  var METADATA = {
    id: "bp-library",
    name: "Blueprint Library",
    author: "Skigim",
    version: "1.0.3",
    website: "",
    description: "A full rewrite of KiitikM's Blueprint Library mod. Features include: perfectly integrated native-style UI, custom tagging and filtering system, unified edit dialogs, and memory leak fixes.",
    minimumGameVersion: ">=1.5.0",
    doesNotAffectSavegame: true,
    dependencies: ["bp-string"],
    isDev: false,
    settings: {
      blueprints: [],
      nextBlueprintId: 1,
      availableTags: [],
      lastSeenVersion: "",
      skippedVersion: "",
      deletedValues: [],
      deletedNames: [],
      migrationChecked: false
    }
  };

  // src/styles.js
  var BUTTON_ICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20640%20640'%3E%3Cpath%20fill='%23000'%20d='M72.5%200L640%200L640%20490Q624.6%20489.8%20613.5%20495Q596%20502.5%20585%20516.5Q577.3%20525.8%20573%20538.5L570%20552.5L570%20568.5Q575.3%20600.2%20596.5%20616Q605.8%20623.7%20618.5%20628L632.5%20631L640%20631L640%20639.5L639.5%20640L65.5%20640Q34.7%20632.8%2018%20611.5L5%20589.5L0%20568.5L0%2072.5L3%2057.5L11%2039.5Q18.5%2027%2029.5%2018L51.5%205L72.5%200ZM160%2080L160%20160L190%20160L190%20110L240%20110L240%2080L160%2080ZM401%2080L401%20110L451%20110L451%20160L481%20160L481%2080L401%2080ZM160%20321L160%20401L240%20401L240%20371L190%20371L190%20321L160%20321ZM451%20321L451%20371L401%20371L401%20401L481%20401L481%20321L451%20321ZM73%20490L54%20495L37%20505Q15%20521%2010%20553L10%20569L13%20583Q17%20595%2025%20605Q41%20626%2073%20631L601%20631L590%20623Q578%20614%20571%20602L563%20584L560%20569L560%20553L563%20538Q568%20521%20578%20510Q587%20498%20601%20491L73%20490Z'/%3E%3C/svg%3E";
  var CSS = `
    #ingame_HUD_GameMenu > .button.blueprintLibrary,
    #ingame_HUD_GameMenu > button.blueprintLibrary {
        grid-column: 3;
        background-image: url("${BUTTON_ICON}");
        background-position: center center;
        background-repeat: no-repeat;
        background-size: 70%;
    }

    #ingame_HUD_GameMenu > .button.save,
    #ingame_HUD_GameMenu > button.save {
        grid-column: 4 !important;
    }

    #ingame_HUD_GameMenu > .button.settings,
    #ingame_HUD_GameMenu > button.settings {
        grid-column: 5 !important;
    }

    /* --- DIALOG OVERRIDES --- */
    #ingame_HUD_BlueprintLibrary {
        z-index: 430;
    }
    #ingame_HUD_BlueprintLibrary .dialogInner {
        width: 840px;
        max-width: 90vw;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        overflow: hidden;
    }
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
    /* --- TOOLBAR CONTAINER --- */
    .bplib-toolbar {
        display: flex;
        gap: calc(10px * var(--ui-scale));
        margin-bottom: calc(12px * var(--ui-scale));
        align-items: center;
    }

    /* --- STATISTICS TABS EXACT NATIVE MATCH --- */
    .bplib-filterHeader {
        display: flex;
        padding: 0;
        margin: 0;
        align-items: center;
        overflow-x: auto;
        max-width: calc(420px * var(--ui-scale));
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .bplib-filterHeader::-webkit-scrollbar {
        display: none;
    }
    .bplib-filterHeader button {
        flex-shrink: 0;
        height: calc(20px * var(--ui-scale));
        padding: calc(1px * var(--ui-scale)) calc(10px * var(--ui-scale));
        border: 0;
        box-shadow: none;
        min-width: calc(30px * var(--ui-scale));
        color: #fff;
        opacity: 0.25;
        border-radius: 0;
        font-size: calc(11px * var(--ui-scale));
        font-family: "GameFont", sans-serif;
        text-transform: uppercase;
        cursor: pointer;
        background-color: #44484a !important;
        transition: opacity 0.2s ease-in-out;
        margin: 0;
        box-sizing: content-box;
    }
    html[data-theme="dark"] .bplib-filterHeader button {
        background-color: #585e6d !important;
    }
    .bplib-filterHeader button:first-child {
        border-top-left-radius: calc(6px * var(--ui-scale));
        border-bottom-left-radius: calc(6px * var(--ui-scale));
    }
    .bplib-filterHeader button:last-child {
        border-top-right-radius: calc(6px * var(--ui-scale));
        border-bottom-right-radius: calc(6px * var(--ui-scale));
    }
    .bplib-filterHeader button:hover {
        opacity: 0.6;
    }
    .bplib-filterHeader button.active {
        opacity: 1 !important;
    }

    /* --- RIGHT-ALIGNED TOOLBAR ACTIONS (BLUE '+' BUTTON & SEARCHBAR) --- */
    .bplib-toolbar-right {
        margin-left: auto;
        display: flex;
        gap: calc(8px * var(--ui-scale));
        align-items: center;
    }

    /* --- BLUE '+' IMPORT BUTTON --- */
    .bplib-toolbar .bplib-btn-import {
        height: calc(20px * var(--ui-scale));
        width: calc(26px * var(--ui-scale));
        min-width: calc(26px * var(--ui-scale));
        padding: calc(1px * var(--ui-scale)) !important;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #4a97df !important;
        color: #ffffff !important;
        opacity: 0.9;
        font-size: calc(15px * var(--ui-scale));
        font-weight: bold;
        border: 0;
        border-radius: calc(6px * var(--ui-scale));
        cursor: pointer;
        box-shadow: none;
        line-height: 1;
        box-sizing: content-box;
        transition: opacity 0.2s ease-in-out, background-color 0.12s ease-in-out;
    }
    .bplib-toolbar .bplib-btn-import:hover {
        opacity: 1;
        background-color: #3b82c4 !important;
    }

    /* --- SEARCH BAR (MATCHING NATIVE HEIGHT) --- */
    .bplib-toolbar #bplib-search {
        height: calc(20px * var(--ui-scale));
        width: calc(180px * var(--ui-scale));
        padding: calc(1px * var(--ui-scale)) calc(8px * var(--ui-scale));
        box-sizing: content-box;
        font-size: calc(11px * var(--ui-scale));
        border-radius: calc(6px * var(--ui-scale));
        border: 0;
        background-color: #44484a;
        color: #fff;
        margin: 0;
    }
    html[data-theme="dark"] .bplib-toolbar #bplib-search {
        background-color: #585e6d;
        color: #fff;
    }
    .bplib-toolbar #bplib-search::placeholder {
        color: #fff;
        opacity: 0.4;
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

    /* --- FORM & TEXTAREA STYLING --- */
    .bplib-textarea {
        background: #eee !important;
        color: #333438 !important;
        border: 0 !important;
        border-radius: 6px;
        padding: 10px 12px;
        box-sizing: border-box;
        font-family: "GameFont", sans-serif;
    }
    .bplib-textarea::placeholder {
        color: #777;
        opacity: 0.8;
    }

    .dialogUpgrades .dialogInner .buttons {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
    }
    .bplib-preview-dialog-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }
    .bplib-preview-canvas-container {
        position: relative;
        min-height: 360px;
        flex: 1;
        overflow: hidden;
    }
    .bplib-preview-canvas-container canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100% !important;
        height: 100% !important;
        display: block;
    }
    .bplib-preview-stats {
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: "GameFont", sans-serif;
        font-size: 13px;
        color: #fff;
    }
    .bplib-preview-cost-slot {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .bplib-preview-cost-slot .requirements {
        display: inline-flex;
        align-items: center;
        margin: 0;
    }
    .bplib-preview-cost-slot .requirement {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .bplib-preview-cost-slot .shape {
        width: 24px;
        height: 24px;
    }
    .bplib-preview-cost-slot .amount {
        padding: 1px 8px;
        font-size: 12px;
    }
    .bplib-preview-locked-warning {
        color: #ff9800;
        font-family: "GameFont", sans-serif;
        font-size: 13px;
    }
    .bplib-preview-recenter-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 10;
        pointer-events: auto;
    }
    .button.styledButton.disabled,
    button.styledButton:disabled,
    button.styledButton.disabled {
        opacity: 0.4 !important;
        cursor: not-allowed !important;
    }
`;

  // src/store.js
  function getActiveVersion(mod, forceIsDev = null) {
    const baseVersion = mod && mod.meta && mod.meta.version ? String(mod.meta.version) : "1.0.3";
    const isDev = forceIsDev !== null ? Boolean(forceIsDev) : true ? Boolean(false) : Boolean(mod && mod.meta && mod.meta.isDev);
    if (isDev) {
      return `${baseVersion}-dev.${Date.now()}`;
    }
    return baseVersion;
  }
  var BlueprintStore = {
    /** @type {any} */
    mod: null,
    /**
     * @param {any} mod
     * @param {((filename: string) => Promise<string>)|null} readFileAsync
     * @param {(() => Promise<string[]>)|null} listKeysAsync
     * @param {boolean|null} forceIsDev
     */
    async init(mod, readFileAsync = null, listKeysAsync = null, forceIsDev = null) {
      if (!mod || typeof mod !== "object") return;
      this.mod = mod;
      if (!mod.settings || typeof mod.settings !== "object") {
        mod.settings = {};
      }
      if (!Array.isArray(mod.settings.blueprints)) {
        mod.settings.blueprints = [];
      }
      if (!Array.isArray(mod.settings.deletedValues)) {
        mod.settings.deletedValues = [];
      }
      if (!Array.isArray(mod.settings.deletedNames)) {
        mod.settings.deletedNames = [];
      }
      const currentVersion = getActiveVersion(mod, forceIsDev);
      if (!mod.settings.migrationVersion || mod.settings.migrationVersion !== currentVersion) {
        if (!mod.settings.migrationChecked) {
          const scanExecuted = await this.migrateLegacySettings(mod, readFileAsync, listKeysAsync);
          if (scanExecuted) {
            mod.settings.migrationChecked = true;
          }
        }
        mod.settings.migrationVersion = currentVersion;
      }
      this.normalizeSettings(mod);
      this.persist();
    },
    /**
     * Defaults/normalizes everything in `mod.settings` that isn't the migration scan itself:
     * `nextBlueprintId`, `availableTags` (pruned to tags actually in use), each blueprint entry
     * (assigning `id`/`createdAt`/fallback `name` where missing), and `lastSeenVersion` /
     * `skippedVersion`. Idempotent - safe to call again after entries have already been
     * normalized. Shared by `init()`'s inline path and `runDeferredMigrationScan()`
     * (`src/migrationScan.js`), which must re-run this after merging legacy blueprints so
     * merged entries get real ids/timestamps and `nextBlueprintId` advances past them.
     * @param {any} mod
     */
    normalizeSettings(mod) {
      if (!mod || typeof mod !== "object" || !mod.settings || typeof mod.settings !== "object") return;
      if (!Array.isArray(mod.settings.blueprints)) {
        mod.settings.blueprints = [];
      }
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
    },
    _mergeBlueprintIfNew(bp, currentBlueprints, existingValues, existingNames, deletedValues = [], deletedNames = []) {
      if (!bp || !bp.value && !bp.name) return false;
      const dVals = Array.isArray(deletedValues) ? deletedValues : [];
      const dNames = Array.isArray(deletedNames) ? deletedNames : [];
      if (bp.value && dVals.includes(bp.value)) return false;
      if (bp.name && dNames.includes(bp.name)) return false;
      if (!existingValues.has(bp.value) && !existingNames.has(bp.name)) {
        currentBlueprints.push(bp);
        if (bp.value) existingValues.add(bp.value);
        if (bp.name) existingNames.add(bp.name);
        return true;
      }
      return false;
    },
    /**
     * @param {any} mod
     * @param {((filename: string) => Promise<string>)|null} readFileAsync
     * @param {(() => Promise<string[]>)|null} listKeysAsync
     * @returns {Promise<boolean>} whether a legacy-data scan actually executed (a reader
     *   was available), regardless of whether it found anything to migrate - the caller
     *   uses this to decide whether it's safe to mark migration as checked-off for good.
     */
    async migrateLegacySettings(mod, readFileAsync, listKeysAsync) {
      const currentBlueprints = Array.isArray(mod.settings.blueprints) ? mod.settings.blueprints : [];
      const existingValues = new Set(currentBlueprints.map((bp) => bp && bp.value).filter(Boolean));
      const existingNames = new Set(currentBlueprints.map((bp) => bp && bp.name).filter(Boolean));
      const deletedValues = Array.isArray(mod.settings.deletedValues) ? mod.settings.deletedValues : [];
      const deletedNames = Array.isArray(mod.settings.deletedNames) ? mod.settings.deletedNames : [];
      let migratedAny = false;
      let reader = null;
      if (typeof readFileAsync === "function") {
        reader = readFileAsync;
      } else if (typeof app !== "undefined" && app && app.storage && typeof app.storage.readFileAsync === "function") {
        const appStorage = app.storage;
        reader = (file) => appStorage.readFileAsync(file);
      } else if (typeof window !== "undefined" && window.app && window.app.storage && typeof window.app.storage.readFileAsync === "function") {
        const windowAppStorage = window.app.storage;
        reader = (file) => windowAppStorage.readFileAsync(file);
      }
      let scanExecutedSuccessfully = false;
      const scannedLegacyValues = /* @__PURE__ */ new Set();
      const scannedLegacyNames = /* @__PURE__ */ new Set();
      if (reader) {
        try {
          scanExecutedSuccessfully = true;
          const candidateFiles = await this.getDynamicCandidateFiles(mod, listKeysAsync);
          for (const file of candidateFiles) {
            try {
              const raw = await reader(file);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                  if (Array.isArray(parsed.deletedValues)) {
                    parsed.deletedValues.forEach((v) => {
                      if (v && typeof v === "string" && !deletedValues.includes(v)) {
                        deletedValues.push(v);
                      }
                    });
                  }
                  if (Array.isArray(parsed.deletedNames)) {
                    parsed.deletedNames.forEach((n) => {
                      if (n && typeof n === "string" && !deletedNames.includes(n)) {
                        deletedNames.push(n);
                      }
                    });
                  }
                  if (Array.isArray(parsed.blueprints) && parsed.blueprints.length > 0) {
                    for (const bp of parsed.blueprints) {
                      if (this._mergeBlueprintIfNew(bp, currentBlueprints, existingValues, existingNames, deletedValues, deletedNames)) {
                        migratedAny = true;
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
                  }
                }
              }
            } catch (e) {
            }
          }
        } catch (err) {
          console.warn("[BlueprintBook] Migration read failure:", err);
        }
      }
      try {
        if (typeof localStorage !== "undefined") {
          const legacyKeys = [
            "bplib_blueprints",
            "blueprint_library_blueprints",
            "blueprints",
            "bp_library_settings"
          ];
          for (const key of legacyKeys) {
            const item = localStorage.getItem(key);
            if (item) {
              try {
                const parsed = JSON.parse(item);
                const bps = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.blueprints) ? parsed.blueprints : null;
                if (bps && bps.length > 0) {
                  for (const bp of bps) {
                    if (this._mergeBlueprintIfNew(bp, currentBlueprints, existingValues, existingNames, deletedValues, deletedNames)) {
                      migratedAny = true;
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
        mod.settings.blueprints = currentBlueprints;
      }
      mod.settings.deletedValues = deletedValues;
      mod.settings.deletedNames = deletedNames;
      return scanExecutedSuccessfully;
    },
    /**
     * @param {any} mod
     * @param {(() => Promise<string[]>)|null} [listKeysAsync]
     */
    async getDynamicCandidateFiles(mod, listKeysAsync = null) {
      const modId = mod && mod.meta && mod.meta.id ? mod.meta.id : "bp-library";
      const currentVersion = mod && mod.meta && mod.meta.version ? String(mod.meta.version) : "";
      const currentFile = `modsettings_${modId}__${currentVersion}.json`;
      const candidates = /* @__PURE__ */ new Set();
      if (typeof listKeysAsync === "function") {
        try {
          const idbKeys = await listKeysAsync();
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
      ["1.0.3", "1.0.2", "1.0.1", "1.0.0", "1.0", "2.0", "0.1.0"].forEach((v) => versionSet.add(v));
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
      if (!Array.isArray(tags)) return;
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
      const safeTags = Array.isArray(tags) ? tags : [];
      const entry = {
        id,
        name: name && name.trim() ? name.trim() : "Blueprint " + id,
        value: cleanValue,
        tags: safeTags,
        createdAt: Date.now()
      };
      this.mod.settings.blueprints.push(entry);
      this.ensureTags(safeTags);
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
      const entry = this.mod.settings.blueprints[idx];
      if (entry) {
        if (!Array.isArray(this.mod.settings.deletedValues)) {
          this.mod.settings.deletedValues = [];
        }
        if (!Array.isArray(this.mod.settings.deletedNames)) {
          this.mod.settings.deletedNames = [];
        }
        if (entry.value && typeof entry.value === "string" && !this.mod.settings.deletedValues.includes(entry.value)) {
          this.mod.settings.deletedValues.push(entry.value);
        }
        if (entry.name && typeof entry.name === "string" && !this.mod.settings.deletedNames.includes(entry.name)) {
          this.mod.settings.deletedNames.push(entry.name);
        }
      }
      this.mod.settings.blueprints.splice(idx, 1);
      this.pruneTags();
      this.persist();
      return true;
    },
    persist() {
      try {
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
        if (this.saveButton) {
          this.element.insertBefore(button, this.saveButton);
        } else {
          this.element.appendChild(button);
        }
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
            condition: () => this.anythingSelectedOnMap && isBlueprintsUnlocked(this.root)
          },
          {
            // Open / Toggle Blueprint Book when not placing a blueprint
            label: "Blueprint Book",
            keys: [80],
            condition: () => !this.blueprintPlacementActive && isBlueprintsUnlocked(this.root)
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
                    <textarea id="custom-textarea-${this.id}" class="input-text bplib-textarea" placeholder="${placeholder}" style="height: 150px; width: 100%; resize: vertical; box-sizing: border-box; padding: 10px; border-radius: 4px;">${safeValue}</textarea>
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

  // src/storageSelection.js
  function selectStorageImpls(shapezGlobal) {
    const isStandalone = Boolean(shapezGlobal.BUILD_OPTIONS.IS_STANDALONE);
    return {
      PreferredImpl: isStandalone ? shapezGlobal.StorageImplElectron : shapezGlobal.StorageImplBrowserIndexedDB,
      OtherImpl: isStandalone ? shapezGlobal.StorageImplBrowserIndexedDB : shapezGlobal.StorageImplElectron
    };
  }

  // src/migrationScan.js
  async function initStorageBackend(StorageImpl, app2, label) {
    if (!StorageImpl) return null;
    try {
      const storage = new StorageImpl(app2);
      await storage.initialize();
      return storage;
    } catch (e) {
      console.warn(`[BlueprintBook] ${label} storage init failed:`, e);
      return null;
    }
  }
  async function runDeferredMigrationScan(mod) {
    if (!mod || !mod.settings || mod.settings.migrationChecked) return;
    let readFileAsync = null;
    let listKeysAsync = null;
    let mainStorage = null;
    let otherStorage = null;
    try {
      const { PreferredImpl, OtherImpl } = selectStorageImpls(shapez);
      mainStorage = await initStorageBackend(PreferredImpl, mod.app, "Preferred");
      if (!mainStorage) {
        mainStorage = await initStorageBackend(OtherImpl, mod.app, "Fallback");
      } else {
        otherStorage = await initStorageBackend(OtherImpl, mod.app, "Secondary");
      }
      if (mainStorage || otherStorage) {
        readFileAsync = async (filename) => {
          for (const storage of [mainStorage, otherStorage]) {
            if (!storage) continue;
            try {
              const res = await storage.readFileAsync(filename);
              if (res) return res;
            } catch (e) {
            }
          }
          throw new Error("file_not_found");
        };
        listKeysAsync = async () => {
          const keys = [];
          for (const storage of [mainStorage, otherStorage]) {
            if (storage && storage.database) {
              try {
                const storedKeys = await new Promise((resolve) => {
                  const tx = storage.database.transaction(["files"], "readonly");
                  const req = tx.objectStore("files").getAllKeys();
                  req.onsuccess = () => resolve(req.result || []);
                  req.onerror = () => resolve([]);
                });
                keys.push(...storedKeys);
              } catch (e) {
              }
            }
          }
          return keys;
        };
      }
      if (readFileAsync) {
        const scanExecuted = await BlueprintStore.migrateLegacySettings(mod, readFileAsync, listKeysAsync);
        if (scanExecuted) {
          BlueprintStore.normalizeSettings(mod);
          mod.settings.migrationChecked = true;
          try {
            if (mod.saveSettings) mod.saveSettings();
          } catch (err) {
            console.error("[BlueprintBook] Failed to save settings:", err);
          }
        }
      }
    } catch (e) {
      console.warn("[BlueprintBook] Could not build storage reader for migration:", e);
    } finally {
      for (const storage of [mainStorage, otherStorage]) {
        if (storage && storage.database && typeof storage.database.close === "function") {
          try {
            storage.database.close();
          } catch (e) {
          }
        }
      }
    }
  }

  // src/preview.js
  function resolveBpStringMod(root) {
    if (!root) return null;
    const modLoader = shapez.BlueprintLibraryModLoader;
    if (!modLoader || !Array.isArray(modLoader.mods)) return null;
    return modLoader.mods.find((m) => m.metadata.id === "bp-string") || null;
  }
  function deserializeBlueprintEntities(root, blueprintInput) {
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
  function getBlueprintEntityCount(root, blueprintInput) {
    const entities = deserializeBlueprintEntities(root, blueprintInput);
    return entities ? entities.length : 0;
  }
  function getBlueprintCost(root, blueprintInput) {
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
  var InteractiveBlueprintViewer = class {
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
          const bw = typeof b.w === "number" ? b.w : typeof b.width === "number" ? b.width : 1;
          const bh = typeof b.h === "number" ? b.h : typeof b.height === "number" ? b.height : 1;
          minX = Math.min(minX, b.x);
          minY = Math.min(minY, b.y);
          maxX = Math.max(maxX, b.x + bw);
          maxY = Math.max(maxY, b.y + bh);
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
      const rect = this.containerElem ? this.containerElem.getBoundingClientRect() : { width: 0, height: 0 };
      const clientW = this.containerElem ? this.containerElem.clientWidth || rect.width : rect.width;
      const clientH = this.containerElem ? this.containerElem.clientHeight || rect.height : rect.height;
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
        const target = (
          /** @type {Element|null} */
          e.target
        );
        if (target && typeof target.setPointerCapture === "function") {
          try {
            target.setPointerCapture(e.pointerId);
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
        const target = (
          /** @type {Element|null} */
          e.target
        );
        if (target && typeof target.releasePointerCapture === "function") {
          try {
            target.releasePointerCapture(e.pointerId);
          } catch (err) {
          }
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
      const ResizeObserverCtor = typeof window !== "undefined" ? window.ResizeObserver : void 0;
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
      const mapBgColor = shapez.THEMES && shapez.THEMES.dark && shapez.THEMES.dark.map && shapez.THEMES.dark.map.background || "#1c2333";
      this.ctx.fillStyle = mapBgColor;
      this.ctx.fillRect(0, 0, w, h);
      if (this.entities.length === 0) return;
      this.ctx.save();
      this.ctx.translate(this.panX, this.panY);
      const currentScale = this.baseScale * this.zoom;
      this.ctx.scale(currentScale, currentScale);
      const parameters = new shapez.DrawParameters({
        context: this.ctx,
        visibleRect: new shapez.Rectangle(-1e4, -1e4, 2e4, 2e4),
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
        const sprite = typeof staticComp.getSprite === "function" && staticComp.getSprite() || meta && typeof meta.getPreviewSprite === "function" && meta.getPreviewSprite(rotationVariant, staticComp.getVariant ? staticComp.getVariant() : void 0) || typeof staticComp.getBlueprintSprite === "function" && staticComp.getBlueprintSprite();
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
          try {
            viewer.cleanup();
          } catch (e) {
          }
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
          warningElem.textContent = "\u26A0\uFE0F Contains locked buildings";
          statsContainer.appendChild(warningElem);
        }
        const equipBtn = Array.from(dialog.element.querySelectorAll(".buttons button, .button.good, button")).find(
          (btn) => btn.classList.contains("good") || btn.dataset.button === "equip" || btn.textContent.trim() === "EQUIP"
        );
        if (equipBtn) {
          equipBtn.disabled = true;
          equipBtn.classList.add("disabled");
          equipBtn.title = "Contains locked buildings (unlocked at higher level)";
        }
      }
    }
    const liveContainer = dialog.element.querySelector(".bplib-preview-canvas-container");
    if (liveContainer) {
      viewer = new InteractiveBlueprintViewer(root, entities || blueprint.value, liveContainer);
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
      if (dialog.closeRequested) {
        dialog.closeRequested.add(() => {
          try {
            viewer.cleanup();
          } catch (e) {
          }
        });
      }
    }
  }
  function getLockedEntitiesInBlueprint(root, blueprintInput) {
    const input = blueprintInput && typeof blueprintInput === "object" && !Array.isArray(blueprintInput) && blueprintInput.value ? blueprintInput.value : blueprintInput;
    const entities = deserializeBlueprintEntities(root, input);
    if (!entities || !Array.isArray(entities)) return [];
    const locked = [];
    for (let i = 0; i < entities.length; ++i) {
      const entity = entities[i];
      const staticComp = entity?.components?.StaticMapEntity;
      if (!staticComp) continue;
      const metaBuilding = typeof staticComp.getMetaBuilding === "function" ? staticComp.getMetaBuilding() : null;
      if (!metaBuilding) continue;
      const isUnlocked = typeof metaBuilding.getIsUnlocked === "function" ? metaBuilding.getIsUnlocked(root) : true;
      const variant = typeof staticComp.getVariant === "function" ? staticComp.getVariant() : staticComp.variant || "default";
      const availableVariants = typeof metaBuilding.getAvailableVariants === "function" ? metaBuilding.getAvailableVariants(root) : [variant];
      const isVariantUnlocked = Array.isArray(availableVariants) && availableVariants.includes(variant);
      if (!isUnlocked || !isVariantUnlocked) {
        locked.push(entity);
      }
    }
    return locked;
  }

  // src/changelog.js
  var MOD_CHANGELOG = [
    {
      version: "1.0.3",
      date: "2026-07-28",
      entries: [
        "<strong>Native BaseHUDPart Architecture</strong>: Converted main window to native BaseHUDPart lifecycle, integrating smoothly with in-game overlays.",
        "<strong>Statistics-Style Segmented Tab Bar</strong>: Redesigned tag filter header into native segmented pill tabs with dynamic UI scale support.",
        "<strong>Horizontal Tag Scrolling</strong>: Added smooth horizontal scrolling with hidden scrollbar tracks for large tag collections.",
        "<strong>Compact Import Button & Right-Aligned Toolbar</strong>: Replaced wide import button with compact blue '+' button next to right-aligned search bar.",
        "<strong>Library Card Progression Lock Fix</strong>: Fixed several buildings not properly progression-locked from the library card view.",
        "<strong>Rapid Blueprint Deletion Sync Fix</strong>: Fixed multiple click requirement when rapidly deleting blueprints.",
        "<strong>Save Hotkey (Ctrl+P) Fix</strong>: Fixed Ctrl+P saving when copying un-saved blueprints from the world.",
        "<strong>Deleted Blueprint Resurfacing Fix</strong>: Fixed version migration tracking so deleted blueprints do not resurface on update."
      ]
    },
    {
      version: "1.0.2",
      date: "2026-07-24",
      entries: [
        "<strong>HUD Placement</strong>: Moved Blueprint Book icon to the 3rd slot in the in-game menu.",
        "<strong>Level 12 Reward Gate</strong>: Blueprint Book functionality is now gated behind the level 12 blueprint reward unlock, matching native blueprint rules.",
        "<strong>Blueprint Preview</strong>: Blueprint Book cards now show an interactive canvas preview of the blueprint with zoom, pan, and recenter controls.",
        "<strong>Blueprint Cost</strong>: Blueprint Book cards and preview dialogs now show the cost of the blueprint.",
        "<strong>Resurfacing Blueprints Fix</strong>: Fixed migration version tracking so deleted blueprints do not resurface on reload.",
        "<strong>Blueprint Equip ('V' Key) Fix</strong>: Fixed equipping blueprints so 'V' ('Paste Last Blueprint') accurately places equipped blueprints without clipboard issues.",
        "<strong>Preview Canvas & Controls Fix</strong>: Fixed bounds calculations, min-zoom scaling (0.02 limit), Recenter button placement, and belt corner rendering.",
        "<strong>Unlock Progression Gating</strong>: EQUIP buttons are now disabled for blueprints containing locked buildings/variants based on player level progression.",
        "<strong>Welcome Dialog Fix</strong>: Fixed an issue where the welcome popup re-appeared on every save load.",
        "<strong>Library Scrolling Fix</strong>: Fixed scrolling and mouse wheel interaction inside the blueprint book window."
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
  var RELEASE_NOTES_1_0_3 = getReleaseNotesForVersion("1.0.3");
  var RELEASE_NOTES_1_0_2 = getReleaseNotesForVersion("1.0.2");
  var RELEASE_NOTES_1_0_1 = getReleaseNotesForVersion("1.0.1");

  // src/ui.js
  var NOTIFY = shapez.enumNotificationType;
  function registerNativeChangelogEntry() {
    const id = `Blueprint Book v${METADATA.version}`;
    if (!shapez.CHANGELOG.some((item) => item.version === id)) {
      const cleanVer = (METADATA.version || "").toString().replace(/^v/i, "").trim();
      const matchingEntry = Array.isArray(MOD_CHANGELOG) ? MOD_CHANGELOG.find((item) => (item.version || "").toString().replace(/^v/i, "").trim() === cleanVer) : null;
      const entries = getReleaseNotesForVersion(METADATA.version);
      const date = matchingEntry && matchingEntry.date || "2026-07-24";
      shapez.CHANGELOG.unshift({
        version: id,
        date,
        entries
      });
    }
  }
  function getLockedEntitiesInBlueprint2(root, entities) {
    if (!entities || !Array.isArray(entities) || !root) return [];
    const locked = [];
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const staticComp = entity.components?.StaticMapEntity;
      const meta = staticComp?.getMetaBuilding ? staticComp.getMetaBuilding() : null;
      if (meta) {
        let unlocked = true;
        if (root.hubGoals && typeof root.hubGoals.isBuildingUnlocked === "function") {
          unlocked = root.hubGoals.isBuildingUnlocked(meta);
        } else if (typeof meta.getIsUnlocked === "function") {
          unlocked = meta.getIsUnlocked(root);
        }
        if (!unlocked) {
          locked.push(entity);
        }
      }
    }
    return locked;
  }
  function isBlueprintsUnlocked(root) {
    if (root && root.hubGoals && typeof root.hubGoals.isRewardUnlocked === "function") {
      const reward = shapez.enumHubGoalRewards.reward_blueprints;
      return root.hubGoals.isRewardUnlocked(reward);
    }
    return true;
  }
  var HUDBlueprintLibrary = class _HUDBlueprintLibrary extends shapez.BaseHUDPart {
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
      this.filterHeader = toolbar.querySelector("#bplib-filter-tags");
      this.gridContainer = makeDiv(this.dialogInner, "bplib-grid", ["bplib-grid"]);
      this.overlay = this.dialogInner;
      this.bindEvents();
    }
    bindEvents() {
      if (!this.overlay) return;
      const searchInput = (
        /** @type {HTMLInputElement|null} */
        this.overlay.querySelector("#bplib-search")
      );
      if (searchInput) {
        searchInput.onpointerdown = () => searchInput.focus();
        searchInput.addEventListener("input", (e) => {
          this.searchQuery = /** @type {HTMLInputElement} */
          e.target.value.toLowerCase();
          this.render();
        });
      }
      const grid = this.overlay.querySelector("#bplib-grid");
      if (grid) {
        grid.addEventListener("wheel", (e) => {
          e.stopPropagation();
        }, { passive: true });
      }
      const importBtn = this.overlay.querySelector("#bplib-btn-import");
      if (importBtn) {
        if (typeof this.trackClicks === "function") {
          this.trackClicks(importBtn, () => this.openImportDialog());
        } else if (this.dialog && typeof this.dialog.trackClicks === "function") {
          this.dialog.trackClicks(importBtn, () => this.openImportDialog());
        } else {
          importBtn.addEventListener("click", () => this.openImportDialog());
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
      if (dialog.buttonSignals.ok) {
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
      this.domAttach = new shapez.DynamicDomAttach(
        this.root,
        /** @type {HTMLDivElement} */
        this.background,
        {
          attachClass: "visible"
        }
      );
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
      if (_HUDBlueprintLibrary.hasCheckedMigration) return;
      _HUDBlueprintLibrary.hasCheckedMigration = true;
      const mod = BlueprintStore.mod;
      if (!mod) return;
      runDeferredMigrationScan(mod).catch((err) => {
        console.error("[BlueprintBook] Deferred migration scan failed:", err);
      });
    }
    async checkUpdateOnce() {
      if (_HUDBlueprintLibrary.hasCheckedUpdate) return;
      _HUDBlueprintLibrary.hasCheckedUpdate = true;
      const currentVersion = getActiveVersion(this.root?.app?.modLoader?.mods?.find((m) => m?.metadata?.id === "bp-library") || BlueprintStore.mod);
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
        } catch (e) {
        }
        this.updateDialog = null;
      }
      if (shapez.T.dialogs.buttons) {
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
        const title = dialogsT && dialogsT.title || "Blueprints Locked";
        const desc = dialogsT && dialogsT.desc || "Unlocks at level 12!";
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
        selectedEntities = Array.from(selectedUids).map((uid) => this.root.entityMgr.findByUid(uid)).filter(Boolean);
      } else {
        const heldBlueprint = this.root.hud.parts.blueprintPlacer?.currentBlueprint?.get?.();
        selectedEntities = heldBlueprint?.entities;
      }
      if (!selectedEntities || selectedEntities.length === 0) return "stop_propagation";
      const modLoader = shapez.BlueprintLibraryModLoader;
      if (!modLoader || !Array.isArray(modLoader.mods)) return "stop_propagation";
      const bpMod = modLoader.mods.find((m) => m.metadata.id === "bp-string");
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
        const bpMod = modLoader.mods.find((m) => m.metadata.id === "bp-string");
        if (!bpMod || typeof bpMod.constructor.deserialize !== "function") {
          this.notify("Blueprint string deserializer unavailable.", NOTIFY.error);
          return;
        }
        const entities = bpMod.constructor.deserialize(this.root, blueprintString);
        if (entities) {
          const lockedEntities = getLockedEntitiesInBlueprint2(this.root, entities);
          if (lockedEntities.length > 0) {
            const warningMsg = "Blueprint contains locked buildings (unlocked at later levels)";
            if (this.root.hud?.parts?.notifications?.sendNotification) {
              this.root.hud.parts.notifications.sendNotification(warningMsg, NOTIFY.warning);
            } else {
              this.notify(warningMsg, NOTIFY.warning);
            }
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
        const searchInput = (
          /** @type {HTMLInputElement|null} */
          this.overlay ? this.overlay.querySelector("#bplib-search") : null
        );
        if (searchInput && searchInput.value !== (this.searchQuery || "")) {
          searchInput.value = this.searchQuery || "";
        }
        const toolbar = this.overlay ? this.overlay.querySelector("#bplib-toolbar") : null;
        if (toolbar) {
          let updateBtn = (
            /** @type {HTMLButtonElement|null} */
            toolbar.querySelector("#bplib-btn-update")
          );
          const updateInfo = this.latestUpdateInfo;
          const showUpdateBtn = updateInfo && updateInfo.updateAvailable;
          if (showUpdateBtn) {
            if (!updateBtn) {
              updateBtn = document.createElement("button");
              updateBtn.className = "button styledButton bplib-btn-update";
              updateBtn.id = "bplib-btn-update";
              updateBtn.style.background = "#e65100";
              updateBtn.style.color = "#fff";
              updateBtn.textContent = `Update (v${updateInfo.latestVersion})`;
              const importBtn = toolbar.querySelector("#bplib-btn-import");
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
        const tagsContainer = this.overlay ? this.overlay.querySelector("#bplib-filter-tags") : null;
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
      if (!this._cardCache) {
        this._cardCache = /* @__PURE__ */ new Map();
      }
      const cacheKey = `${bp?.id || ""}:${bp?.value || ""}`;
      let cached = this._cardCache.get(cacheKey);
      if (!cached) {
        const entities2 = deserializeBlueprintEntities(this.root, bp?.value);
        const cost2 = getBlueprintCost(this.root, entities2);
        cached = { entities: entities2, cost: cost2 };
        this._cardCache.set(cacheKey, cached);
      }
      const { entities, cost } = cached;
      const lockedEntities = getLockedEntitiesInBlueprint2(this.root, entities);
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
        if (lockedEntities.length > 0) return;
        this.equipBlueprint(bp.value);
      });
      if (lockedEntities.length > 0) {
        equipBtn.classList.add("disabled");
        equipBtn.disabled = true;
        equipBtn.title = "Contains locked buildings (unlocked at higher level)";
      }
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
        const grid = this.overlay ? this.overlay.querySelector("#bplib-grid") : null;
        if (!grid) return;
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
      shapez.BlueprintLibraryModLoader = this.modLoader;
      await BlueprintStore.init(this, null, null);
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
