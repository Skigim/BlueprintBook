/**
 * Safely injects a custom button into the HUDGameMenu.
 * @param {shapez.ModInterface} modInterface
 * @param {string} buttonClass - CSS class to apply to the button
 * @param {string} title - Hover title for the button
 * @param {Function} clickHandler - Callback when clicked (receives HUDGameMenu instance as `this`)
 */
export function extendHUDGameMenu(modInterface, buttonClass, title, clickHandler) {
    modInterface.extendClass(shapez.HUDGameMenu, ({ $old }) => ({
        createElements(parent) {
            $old.createElements.call(this, parent);
            const button = document.createElement("div");
            button.classList.add("button", buttonClass);
            if (title) {
                button.title = title;
            }

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
 * Safely extends the native HUDKeybindingOverlay class to display custom keybinding hints.
 * @param {shapez.ModInterface} modInterface
 */
export function extendHUDKeybindingOverlay(modInterface) {
    modInterface.extendClass(shapez.HUDKeybindingOverlay, ({ $old }) => ({
        createElements(parent) {
            $old.createElements.call(this, parent);

            const mapper = this.root.keyMapper;
            const k = shapez.KEYMAPPINGS;

            const customBindings = [
                {
                    // [SELECTION ACTIVE] Save selected area to Blueprint Book
                    label: "Save to Book",
                    keys: [k?.massSelect?.massSelectStart || 17, "+", 80],
                    condition: () => this.anythingSelectedOnMap,
                },
                {
                    // Open / Toggle Blueprint Book when not placing a blueprint
                    label: "Blueprint Book",
                    keys: [80],
                    condition: () => !this.blueprintPlacementActive,
                },
            ];

            for (let i = 0; i < customBindings.length; ++i) {
                let html = "";
                const handle = customBindings[i];

                for (let j = 0; j < handle.keys.length; ++j) {
                    const key = handle.keys[j];
                    if (key === "+") {
                        html += "+";
                    } else if (typeof key === "string") {
                        html += `<code class="keybinding">${key}</code>`;
                    } else {
                        let code = key;
                        if (typeof key === "object" && key !== null) {
                            code = key.keyCode;
                            if (!code && mapper && mapper.getBinding) {
                                try { code = mapper.getBinding(key).keyCode; } catch (e) {}
                            }
                        }
                        const keyString = shapez.getStringForKeyCode ? shapez.getStringForKeyCode(code || 80) : "P";
                        html += `<code class="keybinding">${keyString}</code>`;
                    }
                }
                html += `<label>${handle.label}</label>`;

                handle.cachedElement = shapez.makeDiv(this.element, null, ["binding"], html);
                handle.cachedVisibility = false;

                this.keybindings.push(handle);
            }
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
