/**
 * Robust clipboard copy with fallback.
 * @param {string} text
 */
export async function copyToClipboard(text) {
    // lib.dom.d.ts types navigator.clipboard as always-present, but it's genuinely absent
    // in older browsers and non-secure contexts - this is real feature detection, not dead code.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed"; 
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
}
