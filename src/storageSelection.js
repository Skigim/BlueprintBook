/**
 * @param {Shapez} shapezGlobal
 */
export function selectStorageImpls(shapezGlobal) {
    const isStandalone = Boolean(shapezGlobal.BUILD_OPTIONS.IS_STANDALONE);
    return {
        PreferredImpl: isStandalone ? shapezGlobal.StorageImplElectron : shapezGlobal.StorageImplBrowserIndexedDB,
        OtherImpl: isStandalone ? shapezGlobal.StorageImplBrowserIndexedDB : shapezGlobal.StorageImplElectron,
    };
}
