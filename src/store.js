export const BlueprintStore = {
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

        // Always check and merge legacy blueprints if any were missed
        await this.migrateLegacySettings(mod, readFileAsync, listKeysAsync);

        if (!Array.isArray(mod.settings.blueprints)) mod.settings.blueprints = [];
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
        console.log(`[BlueprintBook] Init complete. Total blueprints in store: ${mod.settings.blueprints.length}, nextID: ${mod.settings.nextBlueprintId}`);
        this.persist();
    },

    async migrateLegacySettings(mod, readFileAsync, listKeysAsync) {
        console.log("[BlueprintBook] Starting legacy settings migration check...");
        const currentBlueprints = Array.isArray(mod.settings.blueprints) ? mod.settings.blueprints : [];
        const existingValues = new Set(currentBlueprints.map(bp => bp && bp.value).filter(Boolean));
        const existingNames = new Set(currentBlueprints.map(bp => bp && bp.name).filter(Boolean));

        let migratedAny = false;

        // 1. Try reading from previous Shapez storage files via the injected readFileAsync
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
                                    parsed.availableTags.forEach(t => {
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

        // 2. Fallback to localStorage keys
        try {
            if (typeof localStorage !== "undefined") {
                console.log("[BlueprintBook] ALL localStorage keys found:", Object.keys(localStorage));
                const legacyKeys = [
                    "bplib_blueprints",
                    "blueprint_library_blueprints",
                    "blueprints",
                    "bp_library_settings",
                ];
                console.log("[BlueprintBook] Checking localStorage legacy keys:", legacyKeys);
                for (const key of legacyKeys) {
                    const item = localStorage.getItem(key);
                    if (item) {
                        console.log(`[BlueprintBook] -> Found item in localStorage key "${key}"!`);
                        try {
                            const parsed = JSON.parse(item);
                            const bps = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.blueprints) ? parsed.blueprints : null);
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
        } catch (e) {}

        if (migratedAny) {
            console.log(`[BlueprintBook] Migration succeeded! Merged blueprints. Total now: ${currentBlueprints.length}`);
            mod.settings.blueprints = currentBlueprints;
        } else {
            console.log("[BlueprintBook] Migration finished. No new blueprints were added.");
        }
    },

    async getDynamicCandidateFiles(mod, listKeysAsync = null) {
        const modId = (mod && mod.meta && mod.meta.id) ? mod.meta.id : "bp-library";
        const currentVersion = (mod && mod.meta && mod.meta.version) ? String(mod.meta.version) : "";
        const currentFile = `modsettings_${modId}__${currentVersion}.json`;

        const candidates = new Set();

        // 1. Dynamic key listing from IndexedDB
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
        ["1.0.1", "1.0.0", "1.0", "2.0", "0.1.0"].forEach(v => versionSet.add(v));

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
        let changed = false;
        tags.forEach(t => {
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
            createdAt: Date.now(),
        };
        this.mod.settings.blueprints.push(entry);
        this.ensureTags(tags);
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
    },
};
