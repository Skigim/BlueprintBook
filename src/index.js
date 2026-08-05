import { METADATA } from "./metadata.js";
import { CSS } from "./styles.js";
import { BlueprintStore } from "./store.js";
import { HUDBlueprintLibrary } from "./ui.js";
import { extendHUDGameMenu, extendHUDKeybindingOverlay } from "../lib/ui.js";
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

class BlueprintLibraryMod extends shapez.Mod {
    async init() {
        // Expose the modLoader so the HUD component can access BPStrings for blueprint parsing
        shapez.BlueprintLibraryModLoader = this.modLoader;

        let readFileAsync = null;
        let listKeysAsync = null;
        let mainStorage = null;
        let otherStorage = null;

        // BlueprintStore records migrationChecked = true the first time it has looked for
        // (and either found+merged, or ruled out) legacy save data. Once that's happened,
        // there's nothing left to migrate, so skip building storage backends entirely on
        // every subsequent load instead of constructing+initializing both backends eagerly.
        const migrationAlreadyChecked = Boolean(this.settings && this.settings.migrationChecked);

        if (!migrationAlreadyChecked) {
            try {
                const { PreferredImpl, OtherImpl } = selectStorageImpls(shapez);

                mainStorage = await initStorageBackend(PreferredImpl, this.app, "Preferred");

                if (!mainStorage) {
                    // Preferred backend failed to init entirely - use the other backend as the
                    // real fallback instead of just for the one-time legacy-data check below.
                    mainStorage = await initStorageBackend(OtherImpl, this.app, "Fallback");
                } else {
                    // Preferred backend is up. Still check the non-primary backend once, since
                    // old data may live there (e.g. player switched browser <-> standalone).
                    otherStorage = await initStorageBackend(OtherImpl, this.app, "Secondary");
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
            } catch (e) {
                console.warn("[BlueprintBook] Could not build storage reader for migration:", e);
            }
        }

        try {
            await BlueprintStore.init(this, readFileAsync, listKeysAsync);
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

        this.modInterface.registerCss(CSS);
        this.modInterface.registerHudElement("blueprintLibrary", HUDBlueprintLibrary);

        // Register native keybindings
        // MUST register the Save (Ctrl+P) hotkey BEFORE the Open/Close (P) hotkey!
        // Otherwise, Shapez's input mapper will match 'P' first and swallow the Ctrl+P event.
        this.modInterface.registerIngameKeybinding({
            id: "blueprint_book_save",
            keyCode: 80, // 'P'
            translation: "Save Blueprint to Book",
            modifiers: { ctrl: true },
            handler: root => {
                const library = root.hud?.parts?.blueprintLibrary;
                if (!library) return;
                return library.handleSaveHotkey();
            }
        });

        this.modInterface.registerIngameKeybinding({
            id: "blueprint_book_toggle",
            keyCode: 80, // 'P'
            translation: "Open/Close Blueprint Book",
            handler: (root, event) => {
                if (event && (event.ctrlKey || event.metaKey)) return;
                const library = root.hud?.parts?.blueprintLibrary;
                if (!library) return;
                return library.handleToggleHotkey();
            }
        });

        // Extend native keybinding hints in bottom-left HUD overlay
        extendHUDKeybindingOverlay(this.modInterface);

        // Extend native game menu button
        extendHUDGameMenu(
            this.modInterface,
            "blueprintLibrary",
            "",
            function () {
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
}

window.$shapez_registerMod(BlueprintLibraryMod, METADATA);


