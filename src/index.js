import { METADATA } from "./metadata.js";
import { CSS } from "./styles.js";
import { BlueprintStore } from "./store.js";
import { HUDBlueprintLibrary } from "./ui.js";
import { extendHUDGameMenu, extendHUDKeybindingOverlay } from "../lib/ui.js";

class BlueprintLibraryMod extends shapez.Mod {
    async init() {
        // Expose the modLoader so the HUD component can access BPStrings for blueprint parsing
        shapez.BlueprintLibraryModLoader = this.modLoader;

        // Cheap, synchronous settings normalization only - no storage I/O here. init() is
        // awaited synchronously as part of the game's boot sequence (MODS.initMods() in the
        // host's application.js), so real storage-backend construction (StorageImplElectron /
        // StorageImplBrowserIndexedDB) and the one-time legacy-data migration scan are deferred
        // to HUDBlueprintLibrary.initialize() (src/ui.js) instead of running here. See
        // src/migrationScan.js for that deferred scan and why it's safe to split from this
        // cheap call without changing BlueprintStore.init()'s own contract.
        await BlueprintStore.init(this, null, null);

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


