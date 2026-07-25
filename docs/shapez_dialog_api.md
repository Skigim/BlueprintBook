# Shapez UI Dialog API Reference

This document provides an exact reference for the native `shapez.io` UI Dialog API, detailing the class constructors, expected arguments, and lifecycle behaviors. It is designed to help modders avoid common API mismatches.

## `shapez.Dialog`

The base class for creating modal dialogs in Shapez.

### Constructor Arguments
The `shapez.Dialog` constructor accepts a single configuration object:

```javascript
const dialog = new shapez.Dialog({
    app: root.app,               // Required: Reference to the main Application instance
    title: "Dialog Title",       // Required: Title string displayed at the top
    contentHTML: "<div>...</div>",// Required: HTML string for the dialog body. DO NOT pass a DOM element.
    buttons: ["cancel:bad", "ok:good"], // Optional: Array of button definitions
    type: "info",                // Optional: "info" or "warning" (affects styling/sounds)
    closeButton: true            // Optional: Whether to show the top-right 'X' close button
});
```

> [!WARNING]
> **`contentHTML` is strictly a string.** Do not pass a `document.createElement(...)` node. Passing a DOM node to a property named `content` (a common mistake) results in `contentHTML` being `undefined`, rendering "undefined" inside the modal.

### Button Definitions
Buttons are defined as an array of colon-delimited strings in the format `"{id}:{style}"`.
- **`id`**: The identifier for the button (e.g., `ok`, `cancel`, `viewOnModIo`). This becomes the key in `dialog.buttonSignals`.
- **`style`**: The CSS class suffix for styling (e.g., `good` (green), `bad` (red)). If omitted, defaults to a neutral style.

Examples:
- `["ok"]`
- `["cancel:bad", "ok:good"]`
- `["delete:bad", "cancel", "ok:good"]`

### Event Signals
- **`dialog.buttonSignals.{id}.add(callback)`**: Bind a listener to a specific button click.
- **`dialog.closeRequested.add(callback)`**: Bind a listener to the dialog closing.

---

## `shapez.DialogWithForm`

An extension of `Dialog` designed for user input forms. It automatically handles validation shaking and focus.

### Constructor Arguments
The constructor accepts a configuration object with specific keys differing from standard `Dialog`:

```javascript
const dialog = new shapez.DialogWithForm({
    app: root.app,               // Required: Reference to the Application instance
    title: "Form Title",         // Required: Title string
    desc: "Description text",    // Required: Subtitle/description text below title (NOT "description")
    formElements: [input1, ...], // Required: Array of FormElement instances (NOT "elements")
    buttons: ["cancel", "ok:good"],// Optional: Array of button definitions
    confirmButtonId: "ok",       // Optional: Button ID that triggers validation/submit (default: "ok")
    closeButton: true            // Optional: Show close button (default: true)
});
```

> [!IMPORTANT]
> Use `desc` (not `description`) and `formElements` (not `elements`). Using incorrect keys will result in them being ignored.

---

## Form Elements

Form elements passed to `DialogWithForm` (or custom implementations) must adhere to a specific duck-typed interface to function correctly within the dialog lifecycle.

### Required Interface
```javascript
const myFormElement = {
    // 1. Returns the HTML structure as a string for initial rendering
    getHtml() {
        return `<div class="formElement"><input id="my-input" /></div>`;
    },
    
    // 2. Called AFTER the dialog DOM is created. Use this to find your element.
    bindEvents(parentContainer) {
        this.element = parentContainer.querySelector("#my-input");
    },
    
    // 3. Called to check if the input is valid when confirm button is pressed
    isValid() {
        return this.element.value.length > 0;
    },
    
    // 4. Called to retrieve the final value
    getValue() {
        return this.element.value;
    },
    
    // 5. Called to focus the element when dialog opens
    focus() {
        if (this.element) this.element.focus();
    },
    
    // 6. Signal dispatched when user presses 'Enter' within the input (optional but recommended)
    valueChosen: new shapez.Signal() 
};
```

---

## `shapez.HUDDialogs`

The HUD manager responsible for displaying dialogs onto the screen. Accessed via `root.hud.parts.dialogs`.

### Displaying a Dialog
Use `internalShowDialog(dialog)` to push a dialog onto the stack and render it.

```javascript
root.hud.parts.dialogs.internalShowDialog(dialog);
```

### The Live DOM Lifecycle Caveat
> [!CAUTION]
> `internalShowDialog` calls `dialog.createElement()`, which assigns `dialog.element.innerHTML = this.contentHTML`.
> 
> Because it uses `innerHTML`, any pre-existing DOM node references you created to build `contentHTML`, and any event listeners attached to them, are **destroyed and invalid**.
> 
> If you need to bind dynamic events (like click handlers, inputs, or canvas initialization) to elements inside your custom `Dialog`, you **must** query the live DOM *after* calling `internalShowDialog`.

**Correct Pattern:**
```javascript
// 1. Define HTML string
const html = `<button id="my-btn">Click Me</button>`;

const dialog = new shapez.Dialog({ app: root.app, title: "Test", contentHTML: html, buttons: ["ok"] });

// 2. Show dialog (renders HTML into DOM)
root.hud.parts.dialogs.internalShowDialog(dialog);

// 3. Query the LIVE DOM and attach listeners
const liveButton = dialog.element.querySelector("#my-btn");
liveButton.addEventListener("click", () => console.log("Clicked!"));
```

### Helper Methods
`HUDDialogs` also provides quick helper methods for simple prompts:
- `root.hud.parts.dialogs.showInfo(title, text, buttons = ["ok:good"])`
- `root.hud.parts.dialogs.showWarning(title, text, buttons = ["ok:good"])`
- `root.hud.parts.dialogs.showOptionChooser(title, options)`
- `root.hud.parts.dialogs.showLoadingDialog(text)`

*Example:*
```javascript
const signals = root.hud.parts.dialogs.showInfo("Notice", "Operation complete.");
signals.ok.add(() => console.log("Acknowledged"));
```
