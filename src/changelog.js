export const MOD_CHANGELOG = [
    {
        version: "1.0.3",
        date: "2026-07-24",
        entries: [
            "<strong>Development Version</strong>: Initializing 1.0.3 development release."
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

export function getReleaseNotesForVersion(version) {
    const cleanVer = (version || "").toString().replace(/^v/i, "").trim();
    const entry = MOD_CHANGELOG.find(item => item.version.replace(/^v/i, "").trim() === cleanVer);
    return entry ? entry.entries : [];
}

export const RELEASE_NOTES_1_0_2 = getReleaseNotesForVersion("1.0.2");
export const RELEASE_NOTES_1_0_1 = getReleaseNotesForVersion("1.0.1");


