import { METADATA } from "./metadata.js";
import { CSS } from "./styles.js";
import { BlueprintStore } from "./store.js";
import { HUDBlueprintLibrary } from "./ui.js";
import { extendHUDGameMenu, extendHUDKeybindingOverlay } from "../lib/ui.js";

class BlueprintLibraryMod extends shapez.Mod {
    async init() {
        // Expose the modLoader so the HUD component can access BPStrings for blueprint parsing
        shapez.BlueprintLibraryModLoader = this.modLoader;

        let readFileAsync = null;
        let listKeysAsync = null;
        try {
            const isStandalone = typeof G_IS_STANDALONE !== "undefined" && G_IS_STANDALONE;

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

            const mainStorage = isStandalone && electronStorage ? electronStorage : (idbStorage || electronStorage);

            readFileAsync = async (filename) => {
                if (mainStorage) {
                    try {
                        const res = await mainStorage.readFileAsync(filename);
                        if (res) return res;
                    } catch (e) {}
                }
                const fallbackStorage = mainStorage === idbStorage ? electronStorage : idbStorage;
                if (fallbackStorage) {
                    try {
                        const res = await fallbackStorage.readFileAsync(filename);
                        if (res) return res;
                    } catch (e) {}
                }
                throw new Error("file_not_found");
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
                    } catch (e) {}
                }
                return keys;
            };
        } catch (e) {
            console.warn("[BlueprintBook] Could not build storage reader for migration:", e);
        }

        await BlueprintStore.init(this, readFileAsync, listKeysAsync);

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

const isDev = typeof IS_DEV !== "undefined" ? Boolean(IS_DEV) : Boolean(METADATA.isDev);
if (isDev) {
    window.BlueprintBookDev = {
        toggleFreshUpdate: () => {
            if (BlueprintStore.mod && BlueprintStore.mod.settings) {
                BlueprintStore.mod.settings.devForceFreshUpdate = !BlueprintStore.mod.settings.devForceFreshUpdate;
                BlueprintStore.persist();
                return BlueprintStore.mod.settings.devForceFreshUpdate;
            }
            return false;
        },
        isFreshUpdateEnabled: () => Boolean(BlueprintStore.mod?.settings?.devForceFreshUpdate)
    };
}

window.$shapez_registerMod(BlueprintLibraryMod, METADATA);

