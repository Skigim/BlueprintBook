import { describe, it, expect, afterEach } from 'vitest';
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

    afterEach(() => {
        delete globalThis.G_IS_STANDALONE;
    });

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

    it('ignores a bare G_IS_STANDALONE global and only trusts shapez.BUILD_OPTIONS', () => {
        // Regression guard for the actual bug: the vanilla game's own webpack bundle defines
        // a bare G_IS_STANDALONE identifier, but the mod's esbuild bundle never does. If some
        // environment happens to leak that identifier as a global, selection must still go by
        // shapez.BUILD_OPTIONS.IS_STANDALONE, not the stray global.
        globalThis.G_IS_STANDALONE = true;
        const { PreferredImpl } = selectStorageImpls(makeShapez(false));
        expect(PreferredImpl).toBe(FakeIndexedDBStorage);
    });
});
