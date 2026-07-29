# Shapez Mod Development Guidelines

## Shapez Mod UI & HUD Rules
- **Dynamic Scaling**: Always use `calc(PX * var(--ui-scale))` and `content-box` sizing for custom UI components to maintain native scale parity across resolutions and user UI scale settings (`application.js` `getEffectiveUiScale()`).
- **Layering & Z-Index Scoping**:
  - Modal-style `BaseHUDPart` overlays (windows meant to block interaction like dialogs) should slot between `420` and `460` (above regular dialogs like `HUDStatistics` at 410, below `HUDModalDialogs` at 470).
  - Non-modal HUD additions (toolbars, badges, overlays) should reference the earlier tiers in `main.scss` `$elements` (100–390).
- **DOM Insertion Safety**: Always use `target.parentNode.insertBefore(newElem, target.nextSibling)` when injecting elements adjacent to target nodes to avoid `DOMException` if the target is nested inside a sub-wrapper.
