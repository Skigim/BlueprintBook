export const MOD_CHANGELOG = [
    {
        version: "1.0.4",
        date: "2026-08-14",
        entries: [
            "<strong>Ctrl+P While Holding a Blueprint</strong>: Fixed Ctrl+P doing nothing when you had just copied a blueprint and were holding it ready to place.",
            "<strong>Stale Locked Status on Cards</strong>: Fixed cards staying EQUIP-disabled after you leveled up and unlocked the building they needed.",
            "<strong>Blueprint Cost With Shapez Industries</strong>: Fixed costs rendering as a run-together string like '30,20,0'. Each required shape now gets its own row and icon.",
            "<strong>Unresearched Blueprints Looked Empty</strong>: Blueprints containing content you have not researched yet no longer show up as empty and equippable. Cards show 'Cost: unknown', the preview shows 'Buildings: ?', and EQUIP stays disabled.",
            "<strong>Equipping an Unresearched Blueprint</strong>: Fixed a raw error on equip; you now get the normal locked-buildings warning.",
            "<strong>Cost Stuck on Unknown</strong>: Fixed cards keeping 'Cost: unknown' for the rest of the session after you researched the missing content.",
            "<strong>Hidden Variants Marked as Locked</strong>: Fixed blueprints being marked locked when another mod merely hides a building variant from the toolbar.",
            "<strong>Blueprints Lost on Update</strong>: Fixed blueprints disappearing on update when you reused the name of one you had deleted earlier. Deletions are now tracked by blueprint content, not by name."
        ]
    },
    {
        version: "1.0.3",
        date: "2026-07-28",
        entries: [
            "<strong>Native BaseHUDPart Architecture</strong>: Converted main window to native BaseHUDPart lifecycle, integrating smoothly with in-game overlays.",
            "<strong>Statistics-Style Segmented Tab Bar</strong>: Redesigned tag filter header into native segmented pill tabs with dynamic UI scale support.",
            "<strong>Horizontal Tag Scrolling</strong>: Added smooth horizontal scrolling with hidden scrollbar tracks for large tag collections.",
            "<strong>Compact Import Button & Right-Aligned Toolbar</strong>: Replaced wide import button with compact blue '+' button next to right-aligned search bar.",
            "<strong>Library Card Progression Lock Fix</strong>: Fixed several buildings not properly progression-locked from the library card view.",
            "<strong>Rapid Blueprint Deletion Sync Fix</strong>: Fixed multiple click requirement when rapidly deleting blueprints.",
            "<strong>Save Hotkey (Ctrl+P) Fix</strong>: Fixed Ctrl+P saving when copying un-saved blueprints from the world.",
            "<strong>Deleted Blueprint Resurfacing Fix</strong>: Fixed version migration tracking so deleted blueprints do not resurface on update."
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

/**
 * @param {string} version
 * @returns {string[]}
 */
export function getReleaseNotesForVersion(version) {
    const cleanVer = (version || "").toString().replace(/^v/i, "").trim();
    const entry = MOD_CHANGELOG.find(item => item.version.replace(/^v/i, "").trim() === cleanVer);
    return entry ? entry.entries : [];
}

export const RELEASE_NOTES_1_0_4 = getReleaseNotesForVersion("1.0.4");
export const RELEASE_NOTES_1_0_3 = getReleaseNotesForVersion("1.0.3");
export const RELEASE_NOTES_1_0_2 = getReleaseNotesForVersion("1.0.2");
export const RELEASE_NOTES_1_0_1 = getReleaseNotesForVersion("1.0.1");


