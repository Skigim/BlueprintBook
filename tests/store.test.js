import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlueprintStore, getActiveVersion } from '../src/store.js';
import { METADATA } from '../src/metadata.js';

describe('BlueprintStore Logic', () => {
    let mockMod;

    beforeEach(async () => {
        mockMod = {
            settings: {},
            saveSettings: () => {}
        };
        await BlueprintStore.init(mockMod);
    });

    it('initializes with default values if settings are empty', () => {
        expect(mockMod.settings.blueprints).toEqual([]);
        expect(mockMod.settings.availableTags).toEqual([]);
        expect(mockMod.settings.nextBlueprintId).toBe(1);
    });

    it('cleans up orphaned tags on initialization', async () => {
        mockMod.settings = {
            blueprints: [
                { id: 1, name: "BP1", tags: ["keep"] }
            ],
            availableTags: ["keep", "orphan"],
            nextBlueprintId: 2
        };
        await BlueprintStore.init(mockMod);
        expect(mockMod.settings.availableTags).toEqual(["keep"]);
    });

    it('adds a new blueprint and auto-increments ID', () => {
        const entry = BlueprintStore.add("Test Base", "my-string-data", ["factory"]);
        
        expect(entry.id).toBe(1);
        expect(entry.name).toBe("Test Base");
        expect(entry.value).toBe("my-string-data");
        expect(entry.tags).toEqual(["factory"]);
        
        expect(mockMod.settings.nextBlueprintId).toBe(2);
        expect(mockMod.settings.blueprints).toHaveLength(1);
        expect(mockMod.settings.availableTags).toEqual(["factory"]);
    });

    it('updates a blueprint and prunes unused tags', () => {
        BlueprintStore.add("BP1", "string1", ["tag1", "tag2"]);
        expect(mockMod.settings.availableTags).toContain("tag1");
        
        // Update tags to only tag3
        BlueprintStore.update(1, { tags: ["tag3"] });
        
        expect(mockMod.settings.availableTags).toContain("tag3");
        expect(mockMod.settings.availableTags).not.toContain("tag1");
        expect(mockMod.settings.availableTags).not.toContain("tag2");
        
        const bp = BlueprintStore.getAll()[0];
        expect(bp.tags).toEqual(["tag3"]);
    });

    it('removes a blueprint and prunes tags', () => {
        BlueprintStore.add("BP1", "string1", ["tag1"]);
        expect(mockMod.settings.availableTags).toContain("tag1");
        
        const success = BlueprintStore.remove(1);
        expect(success).toBe(true);
        expect(mockMod.settings.blueprints).toHaveLength(0);
        expect(mockMod.settings.availableTags).not.toContain("tag1");
    });

    describe('Edge cases', () => {
        it('returns false when updating a non-existent blueprint', () => {
            expect(BlueprintStore.update(999, { name: "Ghost" })).toBe(false);
        });

        it('returns false when removing a non-existent blueprint', () => {
            expect(BlueprintStore.remove(999)).toBe(false);
        });

        it('handles adding a blueprint with an empty name', () => {
            const entry = BlueprintStore.add("   ", "my-string");
            expect(entry.name).toBe("Blueprint 1");
        });

        it('normalizes CRLF blueprint strings to LF', () => {
            const entry = BlueprintStore.add("Base", "line1\r\nline2\r\n   ");
            expect(entry.value).toBe("line1\nline2");
        });

        it('recovers corrupted settings on init', async () => {
            mockMod.settings = {
                blueprints: "not-an-array", // Invalid blueprints
                nextBlueprintId: -50,       // Invalid counter
                availableTags: null         // Invalid tags
            };
            await BlueprintStore.init(mockMod);
            
            expect(mockMod.settings.blueprints).toEqual([]);
            expect(mockMod.settings.nextBlueprintId).toBe(1);
            expect(mockMod.settings.availableTags).toEqual([]);
        });

        it('normalizes corrupted legacy blueprints on init', async () => {
            mockMod.settings = {
                blueprints: [
                    null,
                    "invalid-string-bp",
                    { id: 5, tags: "not-an-array" }, // name and value missing, tags invalid
                    { name: "  Valid Name  ", value: "val" } // Missing ID
                ],
                nextBlueprintId: 10
            };
            await BlueprintStore.init(mockMod);
            
            expect(mockMod.settings.blueprints).toHaveLength(2);
            
            const bp1 = mockMod.settings.blueprints[0];
            expect(bp1.id).toBe(5);
            expect(bp1.name).toBe("Blueprint 5"); // Fallback name
            expect(bp1.tags).toEqual([]);
            expect(bp1.value).toBe("");

            const bp2 = mockMod.settings.blueprints[1];
            expect(bp2.id).toBe(10); // Assigned from nextBlueprintId
            expect(bp2.name).toBe("Valid Name"); // Trimmed
            expect(bp2.value).toBe("val");
            
            // max ID is now 10, so nextBlueprintId should bump to 11
            expect(mockMod.settings.nextBlueprintId).toBe(11);
        });

        it('persists and retrieves lastSeenVersion and skippedVersion via mod settings', () => {
            BlueprintStore.setLastSeenVersion('1.0.1');
            expect(BlueprintStore.getLastSeenVersion()).toBe('1.0.1');
            expect(mockMod.settings.lastSeenVersion).toBe('1.0.1');

            BlueprintStore.setSkippedVersion('1.0.2');
            expect(BlueprintStore.getSkippedVersion()).toBe('1.0.2');
            expect(mockMod.settings.skippedVersion).toBe('1.0.2');
        });

        it('migrates blueprints from previous version storage file when current blueprints are empty', async () => {
            const mockReadFile = async (filename) => {
                if (filename === 'modsettings_bp-library__1.0.1.json') {
                    return JSON.stringify({
                        blueprints: [
                            { id: 10, name: "Legacy BP", value: "bp-str", tags: ["migrated"] }
                        ],
                        nextBlueprintId: 11,
                        availableTags: ["migrated"]
                    });
                }
                throw "file_not_found";
            };
            const modWithStorage = {
                settings: { blueprints: [] },
                saveSettings: () => {}
            };

            await BlueprintStore.init(modWithStorage, mockReadFile);

            expect(modWithStorage.settings.blueprints).toHaveLength(1);
            expect(modWithStorage.settings.blueprints[0].name).toBe("Legacy BP");
            expect(modWithStorage.settings.blueprints[0].tags).toEqual(["migrated"]);
            expect(modWithStorage.settings.nextBlueprintId).toBe(11);
        });

        it('migrates blueprints from legacy localStorage key when storage file is not available', async () => {
            const legacyBps = [
                { id: 1, name: "LS Blueprint", value: "ls-str", tags: ["ls"] }
            ];
            const store = {};
            const mockLocalStorage = {
                getItem: (k) => store[k] || null,
                setItem: (k, v) => { store[k] = String(v); },
                removeItem: (k) => { delete store[k]; }
            };
            const originalLS = globalThis.localStorage;
            try {
                globalThis.localStorage = mockLocalStorage;

                globalThis.localStorage.setItem('bplib_blueprints', JSON.stringify(legacyBps));

                const modEmpty = {
                    settings: { blueprints: [] },
                    saveSettings: () => {}
                };

                await BlueprintStore.init(modEmpty);

                expect(modEmpty.settings.blueprints).toHaveLength(1);
                expect(modEmpty.settings.blueprints[0].name).toBe("LS Blueprint");
            } finally {
                globalThis.localStorage = originalLS;
            }
        });

        it('merges missing legacy blueprints without duplicating existing blueprints when current blueprints array is non-empty', async () => {
            const mockReadFile = async (filename) => {
                if (filename === 'modsettings_bp-library__1.0.1.json') {
                    return JSON.stringify({
                        blueprints: [
                            { id: 1, name: "Current BP", value: "c-val" }, // Duplicate by name/value
                            { id: 2, name: "Legacy Old BP", value: "old-val" } // New item
                        ]
                    });
                }
                throw "file_not_found";
            };
            const modNonEmpty = {
                settings: { blueprints: [{ id: 1, name: "Current BP", value: "c-val" }] },
                saveSettings: () => {}
            };

            await BlueprintStore.init(modNonEmpty, mockReadFile);

            expect(modNonEmpty.settings.blueprints).toHaveLength(2);
            expect(modNonEmpty.settings.blueprints[0].name).toBe("Current BP");
            expect(modNonEmpty.settings.blueprints[1].name).toBe("Legacy Old BP");
        });

        it('dynamically generates candidate version filenames without hardcoding', async () => {
            const mockModFuture = {
                meta: { id: "bp-library", version: "1.0.3" }
            };
            const candidates = await BlueprintStore.getDynamicCandidateFiles(mockModFuture);
            expect(candidates).toContain('modsettings_bp-library__1.0.2.json');
            expect(candidates).toContain('modsettings_bp-library__1.0.1.json');
            expect(candidates).not.toContain('modsettings_bp-library__1.0.3.json');
        });

        it('sets migrationVersion on init and skips migration scan on subsequent inits', async () => {
            const mockReadFile = vi.fn().mockRejectedValue(new Error("file_not_found"));
            const mod = {
                meta: { id: "bp-library", version: "1.0.2" },
                settings: {},
                saveSettings: () => {}
            };

            await BlueprintStore.init(mod, mockReadFile);
            expect(mod.settings.migrationVersion).toBe("1.0.2");
            const firstCallCount = mockReadFile.mock.calls.length;
            expect(firstCallCount).toBeGreaterThan(0);

            // Re-init with migrationVersion present
            await BlueprintStore.init(mod, mockReadFile);
            expect(mockReadFile.mock.calls.length).toBe(firstCallCount);
        });

        describe('Tombstone & Deleted Metadata Handling', () => {
            it('includes default deletedValues and deletedNames arrays in METADATA.settings', () => {
                expect(METADATA.settings.deletedValues).toEqual([]);
                expect(METADATA.settings.deletedNames).toEqual([]);
            });

            it('initializes deletedValues and deletedNames to arrays on init if missing or invalid', async () => {
                const modCorrupted = {
                    settings: {
                        deletedValues: "not-an-array",
                        deletedNames: null
                    },
                    saveSettings: () => {}
                };
                await BlueprintStore.init(modCorrupted);
                expect(modCorrupted.settings.deletedValues).toEqual([]);
                expect(modCorrupted.settings.deletedNames).toEqual([]);
            });

            it('records deletedValues and deletedNames when removing a blueprint without duplicating', () => {
                BlueprintStore.add("BP1", "val1");
                BlueprintStore.add("BP1", "val1"); // Same name and value
                const bps = BlueprintStore.getAll();
                const id1 = bps[0].id;
                const id2 = bps[1].id;

                BlueprintStore.remove(id1);
                expect(mockMod.settings.deletedValues).toEqual(["val1"]);
                expect(mockMod.settings.deletedNames).toEqual(["BP1"]);

                // Removing second should not duplicate tombstone entries
                BlueprintStore.remove(id2);
                expect(mockMod.settings.deletedValues).toEqual(["val1"]);
                expect(mockMod.settings.deletedNames).toEqual(["BP1"]);
            });

            it('skips legacy candidates matching deletedValues or deletedNames during migration', async () => {
                const mockReadFile = async (filename) => {
                    if (filename === 'modsettings_bp-library__1.0.1.json') {
                        return JSON.stringify({
                            blueprints: [
                                { id: 1, name: "Deleted By Value", value: "del-val" },
                                { id: 2, name: "Deleted By Name", value: "del-name-val" },
                                { id: 3, name: "Valid Legacy BP", value: "valid-val" }
                            ]
                        });
                    }
                    throw "file_not_found";
                };

                const mod = {
                    settings: {
                        blueprints: [],
                        deletedValues: ["del-val"],
                        deletedNames: ["Deleted By Name"]
                    },
                    saveSettings: () => {}
                };

                await BlueprintStore.init(mod, mockReadFile);

                expect(mod.settings.blueprints).toHaveLength(1);
                expect(mod.settings.blueprints[0].name).toBe("Valid Legacy BP");
                expect(mod.settings.blueprints[0].value).toBe("valid-val");
            });

            it('prunes obsolete tombstones when candidate legacy scan executes successfully', async () => {
                const mockReadFile = async (filename) => {
                    if (filename === 'modsettings_bp-library__1.0.1.json') {
                        return JSON.stringify({
                            blueprints: [
                                { id: 1, name: "Keep Tombstone Name", value: "keep-tomb-val" }
                            ]
                        });
                    }
                    throw "file_not_found";
                };

                const mod = {
                    settings: {
                        blueprints: [],
                        deletedValues: ["keep-tomb-val", "obsolete-val"],
                        deletedNames: ["Keep Tombstone Name", "Obsolete Name"]
                    },
                    saveSettings: () => {}
                };

                await BlueprintStore.init(mod, mockReadFile);

                // "obsolete-val" and "Obsolete Name" were not found in any legacy file, so they are pruned
                expect(mod.settings.deletedValues).toEqual(["keep-tomb-val"]);
                expect(mod.settings.deletedNames).toEqual(["Keep Tombstone Name"]);
            });

            it('skips tombstone pruning if readFileAsync is not a function', async () => {
                const mod = {
                    settings: {
                        blueprints: [],
                        deletedValues: ["keep-val", "obsolete-val"],
                        deletedNames: ["keep-name", "obsolete-name"]
                    },
                    saveSettings: () => {}
                };

                // Init without readFileAsync
                await BlueprintStore.init(mod);

                expect(mod.settings.deletedValues).toEqual(["keep-val", "obsolete-val"]);
                expect(mod.settings.deletedNames).toEqual(["keep-name", "obsolete-name"]);
            });

            it('skips tombstone pruning if candidate legacy scan throws an error', async () => {
                const mockReadFile = vi.fn().mockImplementation(async () => {
                    throw new Error("Disk error during scan");
                });

                const mod = {
                    settings: {
                        blueprints: [],
                        deletedValues: ["obsolete-val"],
                        deletedNames: ["obsolete-name"]
                    },
                    saveSettings: () => {}
                };

                await BlueprintStore.init(mod, mockReadFile);

                expect(mod.settings.deletedValues).toEqual(["obsolete-val"]);
                expect(mod.settings.deletedNames).toEqual(["obsolete-name"]);
            });
        });

        describe('Null and undefined parameter safety', () => {
            it('handles init(null) or init(undefined) gracefully without throwing', async () => {
                await expect(BlueprintStore.init(null)).resolves.not.toThrow();
                await expect(BlueprintStore.init(undefined)).resolves.not.toThrow();
            });

            it('handles add("name", "val", null) by defaulting tags to an array', () => {
                const entry = BlueprintStore.add("Test Null Tags", "my-val", null);
                expect(entry.tags).toEqual([]);
            });

            it('handles ensureTags(null) or ensureTags(undefined) gracefully without throwing', () => {
                expect(() => BlueprintStore.ensureTags(null)).not.toThrow();
                expect(() => BlueprintStore.ensureTags(undefined)).not.toThrow();
            });

            it('handles null deletedValues and deletedNames in _mergeBlueprintIfNew', () => {
                const bp = { name: "Test", value: "val" };
                const currentBlueprints = [];
                const existingValues = new Set();
                const existingNames = new Set();

                const result = BlueprintStore._mergeBlueprintIfNew(
                    bp,
                    currentBlueprints,
                    existingValues,
                    existingNames,
                    null,
                    null
                );
                expect(result).toBe(true);
                expect(currentBlueprints).toHaveLength(1);
            });
        });
    });

    describe('Metadata Dev Configuration', () => {
        it('includes isDev and devForceFreshUpdate in METADATA', () => {
            expect(METADATA.isDev).toBe(false);
            expect(METADATA.settings.devForceFreshUpdate).toBe(false);
        });
    });

    describe('getActiveVersion', () => {
        it('returns base version when devForceFreshUpdate is false', () => {
            const mod = { meta: { version: '1.0.3' }, settings: { devForceFreshUpdate: false } };
            expect(getActiveVersion(mod)).toBe('1.0.3');
        });

        it('returns default base version 1.0.3 when mod or meta.version is missing', () => {
            expect(getActiveVersion(null)).toBe('1.0.3');
            expect(getActiveVersion({})).toBe('1.0.3');
        });

        it('returns dynamic baseVersion-dev.<timestamp> string when devForceFreshUpdate is true in dev mode', () => {
            const mod = { meta: { version: '1.0.3' }, settings: { devForceFreshUpdate: true } };
            const version = getActiveVersion(mod, true);
            expect(version).toMatch(/^1\.0\.3-dev\.\d+$/);
        });

        it('returns base version when devForceFreshUpdate is true but isDev is false', () => {
            const mod = { meta: { version: '1.0.3' }, settings: { devForceFreshUpdate: true } };
            const version = getActiveVersion(mod, false);
            expect(version).toBe('1.0.3');
        });
    });

    describe('devForceFreshUpdate & getActiveVersion store integration', () => {
        it('initializes devForceFreshUpdate to false if not present', async () => {
            const mod = { settings: {} };
            await BlueprintStore.init(mod);
            expect(mod.settings.devForceFreshUpdate).toBe(false);
        });

        it('triggers migrateLegacySettings when devForceFreshUpdate is true', async () => {
            const spy = vi.spyOn(BlueprintStore, 'migrateLegacySettings');
            const mod = {
                meta: { version: '1.0.3' },
                settings: { devForceFreshUpdate: true, migrationVersion: '1.0.3' },
                saveSettings: () => {}
            };
            await BlueprintStore.init(mod, null, null, true);
            expect(spy).toHaveBeenCalled();
            expect(mod.settings.migrationVersion).toMatch(/^1\.0\.3-dev\.\d+$/);
            spy.mockRestore();
        });
    });
});


