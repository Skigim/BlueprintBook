# Changelog

All notable changes to the **Blueprint Book** mod will be documented in this file.

## [1.0.4] - 2026-08-14

### Bugs Squashed

- **Ctrl+P While Holding a Blueprint**: Fixed an issue where pressing `Ctrl+P` to save did nothing if you had just copied a blueprint and were holding it (ready to place). Saving now works whether you have buildings selected or a blueprint held.
- **Stale Locked Status on Cards**: Fixed an issue where a blueprint card could keep showing as "locked" (EQUIP disabled) after you leveled up and unlocked the building it needed, until you restarted or re-imported it.
- **Blueprint Cost With Shapez Industries**: Fixed blueprint costs rendering as a run-together string like `30,20,0` when Shapez Industries is installed. Each required shape now gets its own row with its own icon.
- **Unresearched Blueprints Looked Empty**: Fixed an issue where a blueprint containing content you had not researched yet showed up as an empty blueprint — no buildings, no cost, and a working EQUIP button. Cards now show `Cost: unknown`, the preview shows `Buildings: ?` and `Cost: unknown`, and EQUIP stays disabled.
- **Equipping an Unresearched Blueprint**: Fixed equipping one of those blueprints throwing a raw error instead of the normal "contains locked buildings" warning.
- **Cost Stuck on Unknown**: Fixed an issue where a card kept showing `Cost: unknown` for the rest of the session after you researched the missing content, instead of picking the real cost back up.
- **Hidden Variants Marked as Locked**: Fixed an issue where a blueprint was marked locked because another mod merely hides a building variant from the toolbar (for example `mirrored`) rather than actually locking it.

## [1.0.3] - 2026-07-28

### Added

- **Native BaseHUDPart Architecture**: Converted the Blueprint Book main window into a native shapez `BaseHUDPart`, eliminating lazy dialog instantiation and integrating seamlessly with native game HUD lifecycle hooks.
- **Statistics-Style Segmented Tab Bar**: Redesigned the tag filter header into a native segmented tab pill container (`ALL | PAINT | STACK | ...`) matching shapez's `HUDStatistics` panel.
- **Horizontal Tag Scrolling**: Added smooth horizontal scrolling with hidden scrollbar tracks for tag filter tabs when managing large blueprint tag collections.
- **Compact Import Button & Right-Aligned Toolbar**: Replaced the wide text import button with a compact blue `+` button positioned next to a right-aligned search bar.
- **Developer Helper Tools**: Exposed `window.BlueprintBookDev` with version testing helpers (`setVersion`, `resetVersion`, `setDevMode`) for dev workflows.

### Bugs Squashed

- **Library Card Progression Lock**: Fixed an issue where several buildings were not properly progression-locked from the library card view, despite being locked in the preview dialog.
- **Rapid Blueprint Deletion Sync**: Fixed an issue where rapidly deleting multiple blueprints could require multiple click attempts while the database file synchronized.
- **Save Hotkey (Ctrl+P) Triggers**: Fixed `Ctrl+P` hotkey saving so copying a new blueprint from the world properly triggers a new library save even if it does not yet exist in the library.
- **Deleted Migrated Blueprint Resurfacing**: Fixed version migration tracking so deleted migrated blueprints no longer resurface when updating to a new version of the mod.

## [1.0.2] - 2026-07-24

### Added

- **HUD Placement**: Moved Blueprint Book icon to the 3rd slot in the in-game menu.
- **Level 12 Reward Gate**: Blueprint Book functionality (opening UI, hotkeys, and equipping blueprints) is now gated behind the level 12 blueprint reward unlock, matching native game behavior.
- **Blueprint Preview**: Blueprint Book cards now show an interactive canvas preview of the blueprint with zoom, pan, and recenter capabilities.
- **Blueprint Cost**: Blueprint Book cards and preview dialogs now display blueprint costs matching player game mode settings.

### Bugs Squashed

- **Blueprint Persistence & Resurfacing**: Fixed migration version tracking so deleted migrated blueprints no longer resurface on save reload.
- **Blueprint Equip (`V` Key)**: Fixed equipping blueprints so `V` ("Paste Last Blueprint") places the equipped blueprint accurately without clipboard desynchronization.
- **Preview Canvas & Controls**: Fixed bounding box calculations (`b.w`/`b.h`), min-zoom limit (0.02), Recenter button placement, layout container decoupling, and belt corner rendering.
- **Unlock Progression Gating**: Disabled EQUIP buttons on cards and preview dialogs when blueprints contain locked buildings or variants based on player level progression.
- **Welcome Dialog**: Fixed an issue where the welcome popup would re-appear on every save load.
- **Library Scrolling**: Fixed scrolling and mouse wheel interaction inside the blueprint book dialog.

## [1.0.1] - 2026-07-21

### Added

- **Native Hotkey Support**: Full keybind integration (`P` to toggle book, `Ctrl+P` to save blueprint) with custom keybinding overlay hints and rebinding support in settings.
- **Automatic Update Notifications**: You will now be notified automatically when a new update is available, with a handy **VIEW ON MOD.IO** button to download the latest version in your browser.
- **Welcome Dialog**: A dialog that appears when running a new version for the first time, showing what changed.

### Improved

- **Cleaner Interface**: Rebuilt the blueprint library popups and card layouts for smoother performance and smaller mod file size.
