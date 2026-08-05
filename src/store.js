/**
 * @param {any} mod
 * @param {boolean|null} [forceIsDev]
 */
export function getActiveVersion(mod, forceIsDev = null) {
    const baseVersion = (mod && mod.meta && mod.meta.version) ? String(mod.meta.version) : "1.0.3";
    const isDev = forceIsDev !== null
        ? Boolean(forceIsDev)
        : (typeof IS_DEV !== "undefined" ? Boolean(IS_DEV) : Boolean(mod && mod.meta && mod.meta.isDev));
    if (isDev) {
        return `${baseVersion}-dev.${Date.now()}`;
    }
    return baseVersion;
}

export const BlueprintStore = {
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
            // migrationChecked is the true one-time gate: once the legacy-data scan has run
            // once (found nothing, or migrated everything it found), never scan again, even
            // across future version bumps. migrationVersion is still tracked for bookkeeping.
            if (!mod.settings.migrationChecked) {
                await this.migrateLegacySettings(mod, readFileAsync, listKeysAsync);
                mod.settings.migrationChecked = true;
            }
            mod.settings.migrationVersion = currentVersion;
        }

        if (typeof mod.settings.nextBlueprintId !== "number" || mod.settings.nextBlueprintId < 1) {
            mod.settings.nextBlueprintId = 1;
        }
        if (!Array.isArray(mod.settings.availableTags)) {
            mod.settings.availableTags = [];
        } else {
            // Cleanup old legacy tags (like "Belts", "Factories", etc.) if they aren't actually used by any blueprint
            const usedTags = new Set();
            (mod.settings.blueprints || []).forEach(bp => {
                if (bp && Array.isArray(bp.tags)) bp.tags.forEach(t => usedTags.add(t));
            });
            mod.settings.availableTags = mod.settings.availableTags.filter(t => usedTags.has(t));
        }

        // Normalize existing blueprints
        mod.settings.blueprints = mod.settings.blueprints.map(entry => {
            if (!entry || typeof entry !== "object") return null;
            const id = typeof entry.id === "number" ? entry.id : mod.settings.nextBlueprintId++;
            return {
                id,
                name: (typeof entry.name === "string" && entry.name.trim()) ? entry.name.trim() : "Blueprint " + id,
                value: typeof entry.value === "string" ? entry.value : "",
                tags: Array.isArray(entry.tags) ? entry.tags : [],
                createdAt: typeof entry.createdAt === "number" ? entry.createdAt : Date.now(),
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
        this.persist();
    },

    _mergeBlueprintIfNew(bp, currentBlueprints, existingValues, existingNames, deletedValues = [], deletedNames = []) {
        if (!bp || (!bp.value && !bp.name)) return false;
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

    async migrateLegacySettings(mod, readFileAsync, listKeysAsync) {
        const currentBlueprints = Array.isArray(mod.settings.blueprints) ? mod.settings.blueprints : [];
        const existingValues = new Set(currentBlueprints.map(bp => bp && bp.value).filter(Boolean));
        const existingNames = new Set(currentBlueprints.map(bp => bp && bp.name).filter(Boolean));

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
        const scannedLegacyValues = new Set();
        const scannedLegacyNames = new Set();

        // 1. Try reading from previous Shapez storage files via the storage reader
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
                                    parsed.deletedValues.forEach(v => {
                                        if (v && typeof v === "string" && !deletedValues.includes(v)) {
                                            deletedValues.push(v);
                                        }
                                    });
                                }
                                if (Array.isArray(parsed.deletedNames)) {
                                    parsed.deletedNames.forEach(n => {
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
                                        parsed.availableTags.forEach(t => {
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

        // 2. Fallback to localStorage keys
        try {
            if (typeof localStorage !== "undefined") {
                const legacyKeys = [
                    "bplib_blueprints",
                    "blueprint_library_blueprints",
                    "blueprints",
                    "bp_library_settings",
                ];
                for (const key of legacyKeys) {
                    const item = localStorage.getItem(key);
                    if (item) {
                        try {
                            const parsed = JSON.parse(item);
                            const bps = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.blueprints) ? parsed.blueprints : null);
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
        } catch (e) {}

        if (migratedAny) {
            mod.settings.blueprints = currentBlueprints;
        }

        mod.settings.deletedValues = deletedValues;
        mod.settings.deletedNames = deletedNames;
    },

    /**
     * @param {any} mod
     * @param {(() => Promise<string[]>)|null} [listKeysAsync]
     */
    async getDynamicCandidateFiles(mod, listKeysAsync = null) {
        const modId = (mod && mod.meta && mod.meta.id) ? mod.meta.id : "bp-library";
        const currentVersion = (mod && mod.meta && mod.meta.version) ? String(mod.meta.version) : "";
        const currentFile = `modsettings_${modId}__${currentVersion}.json`;

        const candidates = new Set();

        // 1. Dynamic key listing from IndexedDB
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

        // Semver-based version generator
        const knownIds = Array.from(new Set([
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
        const versionSet = new Set();

        if (currentVersion) {
            const parts = currentVersion.split(".").map(n => parseInt(n, 10));
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

        // Standard fallback versions
        ["1.0.3", "1.0.2", "1.0.1", "1.0.0", "1.0", "2.0", "0.1.0"].forEach(v => versionSet.add(v));

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
        } catch (e) {}
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
        } catch (e) {}
    },

    getSkippedVersion() {
        if (this.mod && this.mod.settings && typeof this.mod.settings.skippedVersion === "string" && this.mod.settings.skippedVersion) {
            return this.mod.settings.skippedVersion;
        }
        try {
            if (typeof localStorage !== "undefined") {
                return localStorage.getItem("bplib_skipped_version") || "";
            }
        } catch (e) {}
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
        } catch (e) {}
    },

    pruneTags() {
        const usedTags = new Set();
        (this.mod.settings.blueprints || []).forEach(bp => {
            if (bp && Array.isArray(bp.tags)) bp.tags.forEach(t => usedTags.add(t));
        });
        this.mod.settings.availableTags = this.mod.settings.availableTags.filter(t => usedTags.has(t));
    },

    getAll() { return this.mod.settings.blueprints; },
    getTags() { return this.mod.settings.availableTags; },
    
    ensureTags(tags) {
        if (!Array.isArray(tags)) return;
        let changed = false;
        tags.forEach(t => {
            if (!this.mod.settings.availableTags.includes(t)) {
                this.mod.settings.availableTags.push(t);
                changed = true;
            }
        });
        // False positive: the rule doesn't track that the forEach callback above can
        // mutate `changed` before this check runs.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
            createdAt: Date.now(),
        };
        this.mod.settings.blueprints.push(entry);
        this.ensureTags(safeTags);
        this.persist();
        return entry;
    },

    update(id, updates) {
        if (!updates || typeof updates !== "object") return false;
        const entry = this.mod.settings.blueprints.find(e => e.id === id);
        if (!entry) return false;

        if (updates.name !== undefined) {
            entry.name = typeof updates.name === "string" && updates.name.trim() ? updates.name.trim() : "Blueprint " + id;
        }
        if (updates.value !== undefined) {
            entry.value = String(updates.value || "").replace(/\r\n/g, "\n").trim();
        }
        if (updates.tags !== undefined) {
            entry.tags = Array.isArray(updates.tags) ? updates.tags : [];
            this.ensureTags(entry.tags);
        }

        this.pruneTags();
        this.persist();
        return true;
    },

    remove(id) {
        const idx = this.mod.settings.blueprints.findIndex(e => e.id === id);
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
    },
};
