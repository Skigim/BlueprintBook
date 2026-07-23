export const MOD_CHANGELOG = [
    {
        version: "1.0.2",
        date: "2026-07-23",
        entries: [
            "<strong>HUD Placement</strong>: Moved Blueprint Book icon to the 3rd slot in the in-game menu.",
            "<strong>Level 12 Reward Gate</strong>: Blueprint Book functionality is now gated behind the level 12 blueprint reward unlock, matching native blueprint rules.",
            "<strong>Blueprint Preview</strong>: Blueprint Book cards now show a preview of the blueprint.",
            "<strong>Blueprint Cost</strong>: Blueprint Book cards now show the cost of the blueprint.",
            "<strong>Welcome Dialog Fix</strong>: Fixed an issue where the welcome popup would re-appear every time you loaded your save game.",
            "<strong>Library Scrolling Fix</strong>: Fixed scrolling issues in the blueprint book window.",
            "<strong>Blueprint Migration Fix</strong>: Fixed an issue where blueprints didn't persist across updated versions."
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


