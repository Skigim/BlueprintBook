/**
 * Compares two semantic version strings (e.g. "1.0.1" and "1.0.2").
 * @param {string} current
 * @param {string} latest
 * @returns {number} 1 if latest > current, -1 if current > latest, 0 if equal
 */
export function compareVersions(current, latest) {
    const clean = v => (v || "").toString().replace(/^v/i, "").trim().split(".").map(n => parseInt(n, 10) || 0);
    const cParts = clean(current);
    const lParts = clean(latest);

    const maxLength = Math.max(cParts.length, lParts.length);
    for (let i = 0; i < maxLength; i++) {
        const c = cParts[i] || 0;
        const l = lParts[i] || 0;
        if (l > c) return 1;
        if (c > l) return -1;
    }
    return 0;
}

/**
 * Asynchronously checks for newer releases from GitHub API.
 * Non-blocking with 5s timeout and silent fallback on failure.
 * @param {string} currentVersion 
 * @param {string} repoSlug 
 * @returns {Promise<{ updateAvailable: boolean, latestVersion?: string, downloadUrl?: string, releaseNotes?: string }>}
 */
export async function checkForUpdates(currentVersion, repoSlug = "Skigim/BlueprintBook") {
    try {
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;

        const response = await fetch(`https://api.github.com/repos/${repoSlug}/releases/latest`, {
            headers: { "Accept": "application/vnd.github.v3+json" },
            signal: controller ? controller.signal : undefined,
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (!response.ok) return { updateAvailable: false };

        const data = await response.json();
        const latestTag = data.tag_name || data.name || "";
        const downloadUrl = data.html_url || `https://github.com/${repoSlug}/releases/latest`;
        const releaseNotes = data.body || "";

        if (compareVersions(currentVersion, latestTag) === 1) {
            return {
                updateAvailable: true,
                latestVersion: latestTag.replace(/^v/i, ""),
                downloadUrl,
                releaseNotes,
            };
        }
    } catch (err) {
        // Silently swallow network / offline / timeout errors so game load is never affected
        console.log("[BlueprintBook] Update check skipped:", err.message || err);
    }

    return { updateAvailable: false };
}
