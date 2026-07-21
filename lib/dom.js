/**
 * Prevents game inputs when interacting with custom UI elements.
 * Note: Event propagation should not be stopped on mouse or keyboard events,
 * as Shapez relies on window-level listeners to keep InputDistributor.keysDown
 * and ClickDetector press-states in sync. Game keybindings are automatically
 * blocked by Shapez's InputReceiver stack whenever a Dialog is active.
 * @param {HTMLElement} element
 */
export function preventGameInputs(element) {
    // Native Shapez manages dialog input blocking via InputReceiver on top of InputDistributor stack.
    // Preserving event propagation prevents ClickDetector press-state desyncs and stuck keys in keysDown.
}

/**
 * Robust clipboard copy with fallback.
 * @param {string} text
 */
export async function copyToClipboard(text) {
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
