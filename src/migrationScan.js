import { BlueprintStore } from "./store.js";
import { selectStorageImpls } from "./storageSelection.js";

async function initStorageBackend(StorageImpl, app, label) {
    if (!StorageImpl) return null;
    try {
        const storage = new StorageImpl(app);
        await storage.initialize();
        return storage;
    } catch (e) {
        console.warn(`[BlueprintBook] ${label} storage init failed:`, e);
        return null;
    }
}

/**
 * Builds the real storage-backend readers (IndexedDB/Electron I/O) and runs the one-time
 * legacy-data migration scan against them.
 *
 * This is deliberately NOT called from BlueprintLibraryMod.init() (src/index.js) - that path
 * is awaited synchronously as part of the game's boot sequence (MODS.initMods() in the host's
 * application.js), and this scan only ever matters the very first time this mod version has
 * loaded for a given player. Instead this is triggered lazily from
 * HUDBlueprintLibrary.initialize() (src/ui.js), which the shapez HUD system calls exactly once
 * per HUD part instance - unlike show(), which fires on every panel open.
 *
 * Deliberately bypasses BlueprintStore.init()'s own migrationVersion gate by calling
 * migrateLegacySettings() directly instead of going through init() again: mod.init() already
 * runs the cheap BlueprintStore.init(mod, null, null) synchronously, and that call stamps
 * mod.settings.migrationVersion to the current version as part of its own bookkeeping
 * (see store.js). A second BlueprintStore.init() call later in the same boot would see
 * migrationVersion already matching and skip the scan outright (the
 * `if (!mod.settings.migrationVersion || mod.settings.migrationVersion !== currentVersion)`
 * gate). The real one-time gate this function relies on instead is
 * mod.settings.migrationChecked, set only after a scan has genuinely executed with a real
 * reader - exactly matching store.js's own "retry on next load if no reader was available"
 * semantics, just invoked from a different call site/time.
 *
 * @param {any} mod
 * @returns {Promise<void>}
 */
export async function runDeferredMigrationScan(mod) {
    if (!mod || !mod.settings || mod.settings.migrationChecked) return;

    let readFileAsync = null;
    let listKeysAsync = null;
    let mainStorage = null;
    let otherStorage = null;

    try {
        const { PreferredImpl, OtherImpl } = selectStorageImpls(shapez);

        mainStorage = await initStorageBackend(PreferredImpl, mod.app, "Preferred");

        if (!mainStorage) {
            // Preferred backend failed to init entirely - use the other backend as the
            // real fallback instead of just for the one-time legacy-data check below.
            mainStorage = await initStorageBackend(OtherImpl, mod.app, "Fallback");
        } else {
            // Preferred backend is up. Still check the non-primary backend once, since
            // old data may live there (e.g. player switched browser <-> standalone).
            otherStorage = await initStorageBackend(OtherImpl, mod.app, "Secondary");
        }

        if (mainStorage || otherStorage) {
            readFileAsync = async (filename) => {
                for (const storage of [mainStorage, otherStorage]) {
                    if (!storage) continue;
                    try {
                        const res = await storage.readFileAsync(filename);
                        if (res) return res;
                    } catch (e) {}
                }
                throw new Error("file_not_found");
            };

            // Symmetric across both backends: whichever one exposes an IndexedDB-style
            // `.database` (only StorageImplBrowserIndexedDB does, regardless of whether
            // it ended up as mainStorage or otherStorage) gets its keys enumerated.
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
                        } catch (e) {}
                    }
                }
                return keys;
            };
        }

        if (readFileAsync) {
            const scanExecuted = await BlueprintStore.migrateLegacySettings(mod, readFileAsync, listKeysAsync);
            if (scanExecuted) {
                // migrateLegacySettings() only merges raw legacy entries - it doesn't assign
                // id/createdAt/fallback name or advance nextBlueprintId the way init()'s inline
                // path does. Re-run the same normalization here before persisting.
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
        // Release the migration-only IndexedDB connection now that we're done reading
        // from it. storage.database is a real IDBDatabase, and IDBDatabase.close() is a
        // standard Web API - safe to call directly, unlike guessing at a close/deinitialize
        // method on shapez's own storage classes, which isn't part of the documented API.
        for (const storage of [mainStorage, otherStorage]) {
            if (storage && storage.database && typeof storage.database.close === "function") {
                try {
                    storage.database.close();
                } catch (e) {}
            }
        }
    }
}
