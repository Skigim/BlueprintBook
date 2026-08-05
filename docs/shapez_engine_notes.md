# Shapez Engine Integration Notes

Engine-level conventions and gotchas for modding shapez.io, distinct from the Dialog-specific contracts in `shapez_dialog_api.md`. Verified against `shapez_source/` and this project's `src/`.

## HUD Extension Pattern (`extendClass`)
Shapez has no registration array for custom HUD items or keybinding hints. Instead, `this.modInterface.extendClass(NativeClass, ({ $old, $super }) => ({ ... }))` patches prototype methods (`createElements`, `update`, etc.) onto core HUD classes (`shapez.HUDKeybindingOverlay`, `shapez.HUDGameMenu`, ...).
- **Naming convention**: name helper wrappers `extend[ClassName]` (e.g. `extendHUDKeybindingOverlay`, `extendHUDGameMenu`), not `inject...`, to mirror the native API.

## Dialog Button Translations
`shapez.Dialog` looks up button labels in `shapez.T.dialogs.buttons[buttonKey]`. A custom button id (e.g. `viewOnModIo`) with no matching key renders as `"UNDEFINED"`. Register the translation before instantiating the dialog:
```javascript
if (shapez?.T?.dialogs?.buttons) {
    shapez.T.dialogs.buttons.viewOnModIo = "VIEW ON MOD.IO";
}
```

## Opening External Links
Use `this.root.app.platformWrapper.openExternalLink(url)`, falling back to `shapez.openStandaloneLink(url)` and then `window.open(url, "_blank")` — covers both the Electron standalone build and the browser wrapper.

## Storage & Mod Loader Scoping (`src/store.js`, `src/migrationScan.js`)
- `storage` is a closure-local variable inside `modloader.js`'s `initMods()` — it is **not** exposed as `mod.app.storage` or `mod.storage`. Reconstruct the storage backend (`StorageImplElectron` / `StorageImplBrowserIndexedDB`) from `mod.app` instead of assuming it's attached somewhere.
- Real storage-backend construction and the one-time legacy-data migration scan (`runDeferredMigrationScan` in `src/migrationScan.js`) do **not** run inside `mod.init()` - that path is awaited synchronously by the game's boot sequence (`MODS.initMods()`), so the scan is deferred to `HUDBlueprintLibrary.initialize()` (`src/ui.js`), which the HUD system calls exactly once per HUD part instance. `mod.init()` only runs the cheap, synchronous `BlueprintStore.init(mod, null, null)` settings normalization.
- Shapez runs in both desktop Electron (`G_IS_STANDALONE = true`) and browser/wrapper mode — storage code must handle both backends.
- IndexedDB keys live in the `"files"` object store; mod settings files follow `modsettings_<modId>__<version>.json`. Migration must scan candidate version and mod-id variants (`bp-library`, `BlueprintLibrary`, `bp_library`, ...) rather than assuming one fixed name.
- Migrations merge into existing settings (dedupe by `name`/`value`) rather than overwrite — see `_mergeBlueprintIfNew` in `src/store.js`.
- `mod.settings.migrationVersion` gates the candidate storage scan — only re-scan when it doesn't match `mod.meta.version`.

## UI Layout Collisions
- Extending `HUDKeybindingOverlay` grows the overlay's height when selection hints are active — pinned shapes need a downward offset (`#ingame_HUD_PinnedShapes { top: calc(210px * var(--ui-scale)) !important; }`) to leave room.
- Native `shapez.Dialog` caps `.dialogInner .content` at `350px`, which crowds multi-button dialogs against hotkey badges. Widen via a custom dialog class (e.g. `.updateAvailableDialog .dialogInner .content { width: 550px !important; max-width: 90vw; }`).

## Update/Welcome Dialog Lifecycle
State keys: `bplib_last_seen_version` (last version whose notes the player has seen), `bplib_skipped_version` (version explicitly skipped).
- New version available + not skipped → "Update Available" dialog (`CANCEL` / `SKIP VERSION` / `VIEW ON MOD.IO`), then save `bplib_last_seen_version`.
- `lastSeenVersion !== currentVersion` on launch → one-time "Welcome to vX" dialog with release notes, then save `bplib_last_seen_version = currentVersion`.
- Otherwise → no dialog.

> Note: an older internal note described an automated `.github/workflows/deploy-modio.yml` CI pipeline publishing releases to Mod.io. That workflow file does not exist in this repo as of 2026-08-04 — treat release packaging as manual unless/until such a workflow is actually added back.
