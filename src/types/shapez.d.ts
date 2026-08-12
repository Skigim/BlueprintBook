/**
 * Ambient declarations for the shapez.io modding API surface this codebase actually
 * touches. `shapez` is injected as a global by the host game before any mod code runs.
 *
 * Presence rules:
 * - Members this codebase already accesses with NO defensive guard (proving the
 *   codebase itself treats them as load-time guaranteed) are declared non-optional.
 * - Members this codebase still guards (e.g. `if (shapez.KEYMAPPINGS)`, or a specific
 *   translation leaf key that may legitimately be absent/locale-dependent) are declared
 *   optional, so that guard keeps being a real, necessary check under
 *   @typescript-eslint/no-unnecessary-condition.
 */

interface ShapezNotificationType {
    info: string;
    warning: string;
    error: string;
    success: string;
}

interface ShapezHubGoalRewards {
    reward_blueprints: string;
    [key: string]: string;
}

interface ShapezSignal {
    add(callback: (...args: any[]) => void, receiver?: any): void;
    dispatch(...args: any[]): void;
}

interface ShapezChangelogEntry {
    version: string;
    date: string;
    entries: string[];
}

interface ShapezDialogButtons {
    viewOnModIo?: string;
    skipVersion?: string;
    equip?: string;
    [key: string]: string | undefined;
}

interface ShapezDialogTranslation {
    title?: string;
    desc?: string;
}

interface ShapezTranslations {
    dialogs: {
        buttons?: ShapezDialogButtons;
        blueprintsNotUnlocked?: ShapezDialogTranslation;
        [key: string]: unknown;
    };
}

interface ShapezKeyBinding {
    add(callback: (...args: any[]) => void, receiver?: any): void;
}

interface ShapezKeymappings {
    general?: { back?: unknown };
    ingame?: { menuClose?: unknown };
    [key: string]: any;
}

interface ShapezStorageImpl {
    initialize(): Promise<void>;
    readFileAsync(filename: string): Promise<string>;
    database?: {
        transaction(storeNames: string[], mode: string): {
            objectStore(name: string): {
                getAllKeys(): { onsuccess: (() => void) | null; onerror: (() => void) | null; result?: string[] };
            };
        };
    };
}

interface ShapezModMeta {
    id: string;
    version: string;
    [key: string]: unknown;
}

interface ShapezModLoader {
    mods: ShapezModInstance[];
}

interface ShapezModInstance {
    metadata: { id: string; [key: string]: unknown };
    constructor: { [key: string]: any };
    [key: string]: any;
}

interface ShapezModInterface {
    // Patches prototype methods onto a native HUD class (see docs/shapez_engine_notes.md's
    // "HUD Extension Pattern"); the factory receives `{ $old }` to call through to the
    // original implementation.
    extendClass(NativeClass: any, factory: (ctx: { $old: any }) => Record<string, any>): void;
    registerCss(css: string): void;
    registerHudElement(id: string, hudPartClass: any): void;
    registerIngameKeybinding(opts: {
        id: string;
        keyCode: number;
        translation: string;
        modifiers?: Record<string, boolean>;
        handler: (root: any, event?: any) => any;
    }): void;
}

declare class ShapezMod {
    app: any;
    modLoader: ShapezModLoader;
    modInterface: ShapezModInterface;
    // Optional: BlueprintStore.init itself defensively creates mod.settings when missing
    // (see src/store.js), proving it isn't guaranteed present before that runs.
    settings?: Record<string, any>;
    meta: ShapezModMeta;
    saveSettings(): void;
    init(): Promise<void> | void;
}

declare class ShapezBaseHUDPart {
    constructor(root: any);
    root: any;
    // Set by some BaseHUDPart subclasses that show a dialog; not every part has one.
    dialog?: { trackClicks?(element: Element, handler: (...args: any[]) => void): void };
    cleanup(): void;
    trackClicks?(element: Element, handler: (...args: any[]) => void): void;
    closeOnBackgroundClick?(element: Element, handler: (...args: any[]) => void): void;
    registerClickDetector?(detector: unknown): void;
}

declare class ShapezDynamicDomAttach {
    constructor(root: any, element: Element, opts: { attachClass: string });
    update(visible: boolean): void;
}

declare class ShapezInputReceiver {
    constructor(id: string);
}

declare class ShapezKeyActionMapper {
    constructor(root: any, receiver: ShapezInputReceiver);
    getBinding(binding: unknown): ShapezKeyBinding;
}

declare class ShapezClickDetector {
    constructor(element: Element, opts: Record<string, unknown>);
    click: ShapezSignal;
    cleanup(): void;
}

declare class ShapezFormElementInput {
    constructor(opts: { id: string; label: string; placeholder?: string; defaultValue?: string });
    getValue(): string;
}

declare class ShapezDialogWithForm {
    constructor(opts: {
        app: any;
        title: string;
        desc: string;
        formElements: unknown[];
        buttons: string[];
        closeButton?: boolean;
        confirmButtonId?: string;
    });
    // Only the button ids actually passed to `buttons` in the constructor exist here -
    // an index signature can't express that, so each entry is possibly-undefined.
    buttonSignals: { [buttonId: string]: ShapezSignal | undefined };
    // The live DOM root for this dialog's arbitrary user-authored contentHTML -
    // loosely typed since its shape varies per call site (see shapez_dialog_api.md).
    element?: any;
    closeRequested?: ShapezSignal;
}

declare class ShapezDialog {
    constructor(opts: {
        app: any;
        title: string;
        contentHTML: string;
        buttons?: string[];
        type?: string;
        closeButton?: boolean;
    });
    // Only the button ids actually passed to `buttons` in the constructor exist here -
    // an index signature can't express that, so each entry is possibly-undefined.
    buttonSignals: { [buttonId: string]: ShapezSignal | undefined };
    dialogElem?: Element;
    element?: any;
    closeRequested?: ShapezSignal;
    trackClicks?(element: any, handler: (...args: any[]) => void): void;
}

declare class ShapezBlueprint {
    constructor(entities: unknown[]);
    getCost?(): number;
}

declare class ShapezStorageImplElectron implements ShapezStorageImpl {
    constructor(app: any);
    initialize(): Promise<void>;
    readFileAsync(filename: string): Promise<string>;
    database?: ShapezStorageImpl["database"];
}

declare class ShapezStorageImplBrowserIndexedDB implements ShapezStorageImpl {
    constructor(app: any);
    initialize(): Promise<void>;
    readFileAsync(filename: string): Promise<string>;
    database?: ShapezStorageImpl["database"];
}

interface Shapez {
    // Base classes - proven guaranteed present because this codebase extends them
    // at module load time (`class X extends shapez.Mod`, `extends shapez.BaseHUDPart`).
    Mod: typeof ShapezMod;
    BaseHUDPart: typeof ShapezBaseHUDPart;

    // Guaranteed-present frozen-API members (no CE-fork compatibility target for this mod).
    enumNotificationType: ShapezNotificationType;
    enumHubGoalRewards: ShapezHubGoalRewards;
    makeDiv: (parent: Element | { element: Element } | null, id?: string | null, classes?: string[], text?: string) => HTMLDivElement;
    DynamicDomAttach: typeof ShapezDynamicDomAttach;
    InputReceiver: typeof ShapezInputReceiver;
    KeyActionMapper: typeof ShapezKeyActionMapper;
    ClickDetector: typeof ShapezClickDetector;
    FormElementInput: typeof ShapezFormElementInput;
    DialogWithForm: typeof ShapezDialogWithForm;
    Dialog: typeof ShapezDialog;
    Blueprint: typeof ShapezBlueprint;
    StorageImplElectron: typeof ShapezStorageImplElectron;
    StorageImplBrowserIndexedDB: typeof ShapezStorageImplBrowserIndexedDB;
    // Re-exported from core/globals.js via modloader.js's exposeExports() - use this for
    // IS_STANDALONE, not the bare G_IS_STANDALONE identifier (vanilla-bundle-only, never
    // defined in a mod's own esbuild bundle).
    BUILD_OPTIONS: { IS_STANDALONE: boolean };
    T: ShapezTranslations;
    CHANGELOG: ShapezChangelogEntry[];

    // Mutable extension point this mod attaches to the host object itself in index.js.
    // Tests prove call sites must tolerate it being absent (e.g. the "bp-string"
    // companion mod not having loaded yet), so it stays optional/nullable.
    BlueprintLibraryModLoader?: ShapezModLoader | null;

    // Data-driven / locale-driven, or genuinely optional depending on build - the
    // existing code still guards these, so they stay optional.
    KEYMAPPINGS?: ShapezKeymappings;
    openStandaloneLink?: (url: string) => void;

    // Used dynamically via globalThis.shapez in preview.js; loosely typed since that
    // file treats the whole lookup as possibly absent.
    DrawParameters?: new (opts: Record<string, unknown>) => any;
    Vector?: new (x: number, y: number) => any;
    Rectangle?: new (x: number, y: number, w: number, h: number) => any;
    THEMES?: { dark?: { map?: { background?: string } } };
    ORIGINAL_SPRITE_SCALE?: string | number;
    gBuildingVariants?: Record<string | number, unknown>; // Live building-codes registry (dev/standalone-only).

    // lib/ui.js engine-extension surface.
    ModInterface: any;
    HUDGameMenu: any;
    HUDKeybindingOverlay: any;
    getStringForKeyCode?: (code: number) => string;
}

// `var` (not `const`) so this also types `window.shapez` / `globalThis.shapez`,
// which src/preview.js looks up dynamically instead of using the bare identifier.
declare var shapez: Shapez;
