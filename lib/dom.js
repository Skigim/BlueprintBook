/**
 * Prevents key events and mouse events from bubbling up to the game.
 * Crucial for custom UI elements (like inputs/textareas) to prevent accidental game actions.
 * @param {HTMLElement} element
 */
export function preventGameInputs(element) {
    ["keydown", "keyup", "keypress", "mousedown", "mouseup", "pointerdown", "pointerup", "wheel", "contextmenu", "click"].forEach(evt => {
        element.addEventListener(evt, e => e.stopPropagation(), { capture: false });
    });
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
