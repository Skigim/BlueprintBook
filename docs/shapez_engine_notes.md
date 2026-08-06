# BlueprintBook Engine Notes

BlueprintBook-specific engine-integration details. Generic shapez-modding gotchas (HUD extension pattern, dialog translations, external links, storage scoping, `G_IS_STANDALONE`, dialog width caps) live in `../../docs/shapez_engine_notes.md` — read that first.

## Storage & Migration (`src/store.js`, `src/storageSelection.js`, `src/migrationScan.js`)
- Real storage-backend construction and the one-time legacy-data migration scan (`runDeferredMigrationScan` in `src/migrationScan.js`) do **not** run inside `mod.init()` — that path is awaited synchronously by the game's boot sequence (`MODS.initMods()`), so the scan is deferred to `HUDBlueprintLibrary.initialize()` (`src/ui.js`), which the HUD system calls exactly once per HUD part instance. `mod.init()` only runs the cheap, synchronous `BlueprintStore.init(mod, null, null)` settings normalization.
- The `G_IS_STANDALONE` bug (see shared notes) was fixed here by switching to `shapez.BUILD_OPTIONS.IS_STANDALONE` in `src/storageSelection.js`.
- Migration must scan candidate version and mod-id variants (`bp-library`, `BlueprintLibrary`, `bp_library`, ...) rather than assuming one fixed name.
- Migrations merge into existing settings (dedupe by `name`/`value`) rather than overwrite — see `_mergeBlueprintIfNew` in `src/store.js`.
- `mod.settings.migrationVersion` gates `BlueprintStore.init()`'s own inline scan path — only re-scan when it doesn't match `mod.meta.version`. The deferred path in `src/migrationScan.js` bypasses this gate entirely (it calls `migrateLegacySettings()` directly, not `init()`) and uses `mod.settings.migrationChecked` as its durable one-time gate instead; `migrationVersion` is bookkeeping only there. After a successful deferred scan, `BlueprintStore.normalizeSettings(mod)` must run before persisting so merged legacy entries get `id`/`createdAt`/fallback `name` and `nextBlueprintId` advances past them — the same normalization `init()` applies inline.

## UI Layout Collisions
- Extending `HUDKeybindingOverlay` grows the overlay's height when selection hints are active — pinned shapes need a downward offset (`#ingame_HUD_PinnedShapes { top: calc(210px * var(--ui-scale)) !important; }`) to leave room.
- Native `shapez.Dialog` caps `.dialogInner .content` at `350px`, which crowds multi-button dialogs against hotkey badges. Widen via a custom dialog class (e.g. `.updateAvailableDialog .dialogInner .content { width: 550px !important; max-width: 90vw; }`).

## Update/Welcome Dialog Lifecycle
State keys: `bplib_last_seen_version` (last version whose notes the player has seen), `bplib_skipped_version` (version explicitly skipped).
- New version available + not skipped → "Update Available" dialog (`CANCEL` / `SKIP VERSION` / `VIEW ON MOD.IO`), then save `bplib_last_seen_version`.
- `lastSeenVersion !== currentVersion` on launch → one-time "Welcome to vX" dialog with release notes, then save `bplib_last_seen_version = currentVersion`.
- Otherwise → no dialog.

> Note: an older internal note described an automated `.github/workflows/deploy-modio.yml` CI pipeline publishing releases to Mod.io. That workflow file does not exist in this repo as of 2026-08-04 — treat release packaging as manual unless/until such a workflow is actually added back.
