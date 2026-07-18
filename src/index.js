import { METADATA } from "./metadata.js";
import { CSS } from "./styles.js";
import { BlueprintStore } from "./store.js";
import { HUDBlueprintLibrary } from "./ui.js";
import { injectHUDGameMenuButton } from "../lib/ui.js";

class BlueprintLibraryMod extends shapez.Mod {
    init() {
        // Expose the modLoader so the HUD component can access BPStrings for blueprint parsing
        shapez.BlueprintLibraryModLoader = this.modLoader;

        BlueprintStore.init(this);
        this.modInterface.registerCss(CSS);
        this.modInterface.registerHudElement("blueprintLibrary", HUDBlueprintLibrary);

        // Inject button into the game menu
        injectHUDGameMenuButton(
            this.modInterface,
            "blueprintLibrary",
            "Blueprint Book",
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
