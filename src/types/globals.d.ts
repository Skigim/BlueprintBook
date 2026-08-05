/**
 * Build-time and host-injected globals that aren't part of the shapez modding API
 * itself, but that this codebase relies on existing at runtime.
 */

// Injected by esbuild's --define at build time (see package.json build/build:dev scripts).
declare const IS_DEV: boolean | undefined;

// A bare `app` global some older shapez builds exposed; store.js probes for it
// defensively (via `typeof app !== "undefined"`) since docs/shapez_engine_notes.md
// confirms storage is normally closure-scoped, not attached here.
declare const app: { storage?: { readFileAsync(filename: string): Promise<string> } } | null | undefined;

interface Window {
    // Set by the host game before mod registration; used to register this mod class.
    $shapez_registerMod: (modClass: unknown, metadata: unknown) => void;
    // The running game's Application instance, exposed by the host at runtime.
    app?: { storage?: { readFileAsync(filename: string): Promise<string> } } | null;
}
