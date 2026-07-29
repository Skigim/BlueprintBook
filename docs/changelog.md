# Changelog

All notable changes to the **Blueprint Book** mod will be documented in this file.

## [1.0.3] - 2026-07-28

### Added

- **Native BaseHUDPart Architecture**: Converted the Blueprint Book main window into a native shapez `BaseHUDPart`, eliminating lazy dialog instantiation and integrating seamlessly with native game HUD lifecycle hooks.
- **Statistics-Style Segmented Tab Bar**: Redesigned the tag filter header into a native segmented tab pill container (`ALL | PAINT | STACK | ...`) matching shapez's `HUDStatistics` panel.
- **Horizontal Tag Scrolling**: Added smooth horizontal scrolling with hidden scrollbar tracks for tag filter tabs when managing large blueprint tag collections.
- **Compact Import Button & Right-Aligned Toolbar**: Replaced the wide text import button with a compact blue `+` button positioned next to a right-aligned search bar.
- **Developer Helper Tools**: Exposed `window.BlueprintBookDev` with version testing helpers (`setVersion`, `resetVersion`, `setDevMode`) for dev workflows.

### Bugs Squashed

- **Z-Index Layering Overlap**: Fixed a layering conflict where the Blueprint Book window rendered above modal dialogs. Adjusted window layering so blueprint preview and edit dialogs pop up cleanly over the library window.
- **Dialog Input Theme Contrast**: Fixed contrast mismatch in custom textarea form elements by standardizing background (`#eee`) and text color (`#333438`) to match native shapez form inputs 1:1.
- **DOMException on Update Button Injection**: Fixed a DOM hierarchy error during update button injection when toolbar action buttons are nested inside sub-containers.
- **Memory Leak & Dynamic Click Detector Cleanup**: Fixed dynamic event listener accumulation by flushing stale click detectors prior to re-rendering grid cards.

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
