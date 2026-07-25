# Changelog

All notable changes to the **Blueprint Book** mod will be documented in this file.

## [1.0.3] - Unreleased

### Added

- Initialized 1.0.3 development release.

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
