export const BlueprintStore = {
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

        const maxId = mod.settings.blueprints.reduce((max, b) => Math.max(max, b.id || 0), 0);
        if (mod.settings.nextBlueprintId <= maxId) {
            mod.settings.nextBlueprintId = maxId + 1;
        }
        this.persist();
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
        const entry = this.mod.settings.blueprints.find(e => e.id === id);
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
        const idx = this.mod.settings.blueprints.findIndex(e => e.id === id);
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
    },
};
