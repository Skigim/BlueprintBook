/**
 * Safely injects a custom button into the HUDGameMenu.
 * @param {shapez.ModInterface} modInterface
 * @param {string} buttonClass - CSS class to apply to the button
 * @param {string} title - Hover title for the button
 * @param {Function} clickHandler - Callback when clicked (receives HUDGameMenu instance as `this`)
 */
export function injectHUDGameMenuButton(modInterface, buttonClass, title, clickHandler) {
    modInterface.extendClass(shapez.HUDGameMenu, ({ $old }) => ({
        createElements(parent) {
            $old.createElements.call(this, parent);
            const button = document.createElement("div");
            button.classList.add("button", buttonClass);
            button.title = title;

            this.element.appendChild(button);
            // Dynamically adjust the grid template columns to support multiple mods safely
            // Assumption: earlier-loaded mods have already appended their buttons when this fires.
            this.element.style.gridTemplateColumns = `repeat(${this.element.children.length}, 1fr)`;

            this.trackClicks(button, () => {
                try {
                    clickHandler.call(this);
                } catch (err) {
                    alert(`Menu click error (${buttonClass}): ` + err.message + "\n" + err.stack);
                }
            });
        },
    }));
}

/**
 * Creates a custom Dialog form element that renders a large textarea.
 * @param {string} id 
 * @param {string} label 
 * @param {string} placeholder 
 * @param {string} defaultValue 
 * @returns {Object} A duck-typed FormElementInput compatible object
 */
export function createTextAreaFormElement(id, label, placeholder = "", defaultValue = "") {
    return {
        id,
        label,
        valueChosen: { add: () => {} }, // mock Signal
        getHtml() {
            const safeValue = (defaultValue || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `
                <div class="formElement">
                    <label>${this.label}</label>
                    <textarea id="custom-textarea-${this.id}" class="input-text" placeholder="${placeholder}" style="height: 150px; width: 100%; resize: vertical; box-sizing: border-box; background: rgba(0,0,0,0.2); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 4px;">${safeValue}</textarea>
                </div>
            `;
        },
        bindEvents(parent) {
            this.element = parent.querySelector(`#custom-textarea-${this.id}`);
        },
        focus() {
            if (this.element) this.element.focus();
        },
        isValid() { return true; },
        getValue() {
            return this.element ? this.element.value : "";
        }
    };
}
