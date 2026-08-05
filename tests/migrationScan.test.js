import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlueprintStore } from '../src/store.js';

describe('runDeferredMigrationScan', () => {
    let FakeElectronStorage;
    let FakeIndexedDBStorage;
    let electronCtorSpy;
    let idbCtorSpy;

    beforeEach(() => {
        electronCtorSpy = vi.fn();
        idbCtorSpy = vi.fn();

        FakeElectronStorage = class {
            constructor(app) {
                electronCtorSpy(app);
                this.app = app;
            }
            async initialize() {}
            async readFileAsync() {
                throw new Error('file_not_found');
            }
        };
        FakeIndexedDBStorage = class {
            constructor(app) {
                idbCtorSpy(app);
                this.app = app;
            }
            async initialize() {}
            async readFileAsync() {
                throw new Error('file_not_found');
            }
        };

        // typeof G_IS_STANDALONE !== "undefined" is always false in this environment (no
        // esbuild --define), same as it is in the real bundled mod - see docs/shapez_engine_notes.md.
        // That makes StorageImplBrowserIndexedDB the "preferred" backend and
        // StorageImplElectron the "other" one, matching real runtime behavior.
        global.shapez = {
            StorageImplElectron: FakeElectronStorage,
            StorageImplBrowserIndexedDB: FakeIndexedDBStorage,
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does nothing and never touches storage when mod.settings.migrationChecked is already true', async () => {
        const { runDeferredMigrationScan } = await import('../src/migrationScan.js');
        const spy = vi.spyOn(BlueprintStore, 'migrateLegacySettings');
        const mod = { app: {}, settings: { migrationChecked: true }, saveSettings: vi.fn() };

        await runDeferredMigrationScan(mod);

        expect(spy).not.toHaveBeenCalled();
        expect(idbCtorSpy).not.toHaveBeenCalled();
        expect(electronCtorSpy).not.toHaveBeenCalled();
    });

    it('constructs the preferred storage backend and runs migrateLegacySettings with real readers', async () => {
        const { runDeferredMigrationScan } = await import('../src/migrationScan.js');
        const spy = vi.spyOn(BlueprintStore, 'migrateLegacySettings').mockResolvedValue(true);
        const mod = { app: { id: 'app' }, settings: { migrationChecked: false }, saveSettings: vi.fn() };

        await runDeferredMigrationScan(mod);

        expect(idbCtorSpy).toHaveBeenCalledWith(mod.app);
        expect(spy).toHaveBeenCalledTimes(1);
        const [modArg, readFileAsyncArg, listKeysAsyncArg] = spy.mock.calls[0];
        expect(modArg).toBe(mod);
        expect(typeof readFileAsyncArg).toBe('function');
        expect(typeof listKeysAsyncArg).toBe('function');
    });

    it('marks migrationChecked=true and persists via mod.saveSettings() when the scan actually executes', async () => {
        const { runDeferredMigrationScan } = await import('../src/migrationScan.js');
        vi.spyOn(BlueprintStore, 'migrateLegacySettings').mockResolvedValue(true);
        const mod = { app: {}, settings: { migrationChecked: false }, saveSettings: vi.fn() };

        await runDeferredMigrationScan(mod);

        expect(mod.settings.migrationChecked).toBe(true);
        expect(mod.saveSettings).toHaveBeenCalledTimes(1);
    });

    it('leaves migrationChecked false and does not persist when migrateLegacySettings reports the scan did not execute', async () => {
        const { runDeferredMigrationScan } = await import('../src/migrationScan.js');
        vi.spyOn(BlueprintStore, 'migrateLegacySettings').mockResolvedValue(false);
        const mod = { app: {}, settings: { migrationChecked: false }, saveSettings: vi.fn() };

        await runDeferredMigrationScan(mod);

        expect(mod.settings.migrationChecked).toBe(false);
        expect(mod.saveSettings).not.toHaveBeenCalled();
    });

    it('falls back to the other storage backend when the preferred backend fails to initialize', async () => {
        FakeIndexedDBStorage.prototype.initialize = async function () {
            throw new Error('preferred backend boom');
        };
        const spy = vi.spyOn(BlueprintStore, 'migrateLegacySettings').mockResolvedValue(true);
        const { runDeferredMigrationScan } = await import('../src/migrationScan.js');
        const mod = { app: {}, settings: { migrationChecked: false }, saveSettings: vi.fn() };

        await runDeferredMigrationScan(mod);

        expect(electronCtorSpy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(mod.settings.migrationChecked).toBe(true);
    });

    it('does not throw and leaves migrationChecked false when both storage backends fail', async () => {
        FakeIndexedDBStorage.prototype.initialize = async function () {
            throw new Error('boom');
        };
        FakeElectronStorage.prototype.initialize = async function () {
            throw new Error('boom too');
        };
        const spy = vi.spyOn(BlueprintStore, 'migrateLegacySettings');
        const { runDeferredMigrationScan } = await import('../src/migrationScan.js');
        const mod = { app: {}, settings: { migrationChecked: false }, saveSettings: vi.fn() };

        await expect(runDeferredMigrationScan(mod)).resolves.not.toThrow();

        expect(spy).not.toHaveBeenCalled();
        expect(mod.settings.migrationChecked).toBe(false);
    });

    it('closes any opened IndexedDB-style database connections once the scan finishes', async () => {
        const closeSpy = vi.fn();
        FakeIndexedDBStorage.prototype.initialize = async function () {
            this.database = { close: closeSpy };
        };
        vi.spyOn(BlueprintStore, 'migrateLegacySettings').mockResolvedValue(true);
        const { runDeferredMigrationScan } = await import('../src/migrationScan.js');
        const mod = { app: {}, settings: { migrationChecked: false }, saveSettings: vi.fn() };

        await runDeferredMigrationScan(mod);

        expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('merges a legacy blueprint found through the constructed storage backend end-to-end', async () => {
        FakeIndexedDBStorage.prototype.readFileAsync = async function (filename) {
            if (filename === 'modsettings_bp-library__1.0.2.json') {
                return JSON.stringify({ blueprints: [{ id: 1, name: 'Legacy BP', value: 'legacy-val' }] });
            }
            throw new Error('file_not_found');
        };
        const { runDeferredMigrationScan } = await import('../src/migrationScan.js');
        const mod = {
            app: {},
            meta: { version: '1.0.3' },
            settings: { migrationChecked: false, blueprints: [], deletedValues: [], deletedNames: [] },
            saveSettings: vi.fn(),
        };

        await runDeferredMigrationScan(mod);

        expect(mod.settings.blueprints.some(bp => bp.value === 'legacy-val')).toBe(true);
        expect(mod.settings.migrationChecked).toBe(true);
        expect(mod.saveSettings).toHaveBeenCalled();
    });
});
