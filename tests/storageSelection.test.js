import { describe, it, expect } from 'vitest';
import { selectStorageImpls } from '../src/storageSelection.js';

describe('selectStorageImpls', () => {
    class FakeElectronStorage {}
    class FakeIndexedDBStorage {}

    function makeShapez(isStandalone) {
        return {
            BUILD_OPTIONS: { IS_STANDALONE: isStandalone },
            StorageImplElectron: FakeElectronStorage,
            StorageImplBrowserIndexedDB: FakeIndexedDBStorage,
        };
    }

    it('prefers Electron storage when shapez.BUILD_OPTIONS.IS_STANDALONE is true', () => {
        const { PreferredImpl, OtherImpl } = selectStorageImpls(makeShapez(true));
        expect(PreferredImpl).toBe(FakeElectronStorage);
        expect(OtherImpl).toBe(FakeIndexedDBStorage);
    });

    it('prefers IndexedDB storage when shapez.BUILD_OPTIONS.IS_STANDALONE is false', () => {
        const { PreferredImpl, OtherImpl } = selectStorageImpls(makeShapez(false));
        expect(PreferredImpl).toBe(FakeIndexedDBStorage);
        expect(OtherImpl).toBe(FakeElectronStorage);
    });

    it('throws if shapez.BUILD_OPTIONS is missing, instead of silently treating the platform as browser', () => {
        // shapez.BUILD_OPTIONS is populated unconditionally whenever mod code runs at all
        // (modloader.js's exposeExports() flattens it from core/globals.js before any mod's
        // init() executes). Its absence means something is genuinely wrong, so this must
        // surface as a thrown error - the call site in index.js already wraps this in a
        // try/catch - rather than silently defaulting isStandalone to false.
        const shapezWithoutBuildOptions = {
            StorageImplElectron: FakeElectronStorage,
            StorageImplBrowserIndexedDB: FakeIndexedDBStorage,
        };
        expect(() => selectStorageImpls(shapezWithoutBuildOptions)).toThrow();
    });
});
