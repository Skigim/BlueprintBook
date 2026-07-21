import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compareVersions, checkForUpdates } from '../src/updater.js';

describe('compareVersions', () => {
    it('correctly identifies newer patch versions', () => {
        expect(compareVersions('1.0.1', '1.0.2')).toBe(1);
        expect(compareVersions('v1.0.1', '1.0.2')).toBe(1);
        expect(compareVersions('1.0.1', 'v1.0.2')).toBe(1);
    });

    it('correctly identifies newer minor and major versions', () => {
        expect(compareVersions('1.0.1', '1.1.0')).toBe(1);
        expect(compareVersions('1.0.1', '2.0.0')).toBe(1);
    });

    it('correctly identifies equal or older versions', () => {
        expect(compareVersions('1.0.1', '1.0.1')).toBe(0);
        expect(compareVersions('1.0.2', '1.0.1')).toBe(-1);
        expect(compareVersions('1.1.0', '1.0.1')).toBe(-1);
    });

    it('handles missing or malformed version strings gracefully', () => {
        expect(compareVersions('', '1.0.0')).toBe(1);
        expect(compareVersions('1.0', '1.0.1')).toBe(1);
        expect(compareVersions('1.0.1', '')).toBe(-1);
    });
});

describe('checkForUpdates', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns updateAvailable: true when API reports a newer release', async () => {
        const mockRelease = {
            tag_name: 'v1.0.2',
            html_url: 'https://github.com/Skigim/BlueprintBook/releases/tag/v1.0.2',
            body: 'Bug fixes and performance improvements.',
        };

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockRelease,
        });

        const result = await checkForUpdates('1.0.1');

        expect(result.updateAvailable).toBe(true);
        expect(result.latestVersion).toBe('1.0.2');
        expect(result.downloadUrl).toBe('https://github.com/Skigim/BlueprintBook/releases/tag/v1.0.2');
        expect(result.releaseNotes).toBe('Bug fixes and performance improvements.');
    });

    it('returns updateAvailable: false when current version is up to date', async () => {
        const mockRelease = {
            tag_name: 'v1.0.1',
            html_url: 'https://github.com/Skigim/BlueprintBook/releases/tag/v1.0.1',
        };

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockRelease,
        });

        const result = await checkForUpdates('1.0.1');

        expect(result.updateAvailable).toBe(false);
    });

    it('handles network error gracefully without throwing', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const result = await checkForUpdates('1.0.1');

        expect(result.updateAvailable).toBe(false);
    });
});
