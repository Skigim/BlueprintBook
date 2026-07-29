export const BUTTON_ICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20640%20640'%3E%3Cpath%20fill='%23000'%20d='M72.5%200L640%200L640%20490Q624.6%20489.8%20613.5%20495Q596%20502.5%20585%20516.5Q577.3%20525.8%20573%20538.5L570%20552.5L570%20568.5Q575.3%20600.2%20596.5%20616Q605.8%20623.7%20618.5%20628L632.5%20631L640%20631L640%20639.5L639.5%20640L65.5%20640Q34.7%20632.8%2018%20611.5L5%20589.5L0%20568.5L0%2072.5L3%2057.5L11%2039.5Q18.5%2027%2029.5%2018L51.5%205L72.5%200ZM160%2080L160%20160L190%20160L190%20110L240%20110L240%2080L160%2080ZM401%2080L401%20110L451%20110L451%20160L481%20160L481%2080L401%2080ZM160%20321L160%20401L240%20401L240%20371L190%20371L190%20321L160%20321ZM451%20321L451%20371L401%20371L401%20401L481%20401L481%20321L451%20321ZM73%20490L54%20495L37%20505Q15%20521%2010%20553L10%20569L13%20583Q17%20595%2025%20605Q41%20626%2073%20631L601%20631L590%20623Q578%20614%20571%20602L563%20584L560%20569L560%20553L563%20538Q568%20521%20578%20510Q587%20498%20601%20491L73%20490Z'/%3E%3C/svg%3E";

export const CSS = `
    #ingame_HUD_GameMenu > .button.blueprintLibrary,
    #ingame_HUD_GameMenu > button.blueprintLibrary {
        grid-column: 3;
        background-image: url("${BUTTON_ICON}");
        background-position: center center;
        background-repeat: no-repeat;
        background-size: 70%;
    }

    #ingame_HUD_GameMenu > .button.save,
    #ingame_HUD_GameMenu > button.save {
        grid-column: 4 !important;
    }

    #ingame_HUD_GameMenu > .button.settings,
    #ingame_HUD_GameMenu > button.settings {
        grid-column: 5 !important;
    }

    /* --- DIALOG OVERRIDES --- */
    #ingame_HUD_BlueprintLibrary {
        z-index: 430;
    }
    #ingame_HUD_BlueprintLibrary .dialogInner {
        width: 840px;
        max-width: 90vw;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        overflow: hidden;
    }
    .dialogMods .dialogInner .content {
        width: 600px !important;
        max-width: 90vw;
    }
    .updateAvailableDialog .dialogInner .content {
        width: 550px !important;
        max-width: 90vw;
    }

    /* --- DIALOG CONTAINER --- */
    .bplib-dialog-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 10px;
        box-sizing: border-box;
        width: 100%;
        height: 70vh;
        max-height: 800px;
        pointer-events: auto;
    }
    /* --- TOOLBAR CONTAINER --- */
    .bplib-toolbar {
        display: flex;
        gap: calc(10px * var(--ui-scale));
        margin-bottom: calc(12px * var(--ui-scale));
        align-items: center;
    }

    /* --- STATISTICS TABS EXACT NATIVE MATCH --- */
    .bplib-filterHeader {
        display: flex;
        padding: 0;
        margin: 0;
        align-items: center;
        overflow-x: auto;
        max-width: calc(420px * var(--ui-scale));
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .bplib-filterHeader::-webkit-scrollbar {
        display: none;
    }
    .bplib-filterHeader button {
        flex-shrink: 0;
        height: calc(20px * var(--ui-scale));
        padding: calc(1px * var(--ui-scale)) calc(10px * var(--ui-scale));
        border: 0;
        box-shadow: none;
        min-width: calc(30px * var(--ui-scale));
        color: #fff;
        opacity: 0.25;
        border-radius: 0;
        font-size: calc(11px * var(--ui-scale));
        font-family: "GameFont", sans-serif;
        text-transform: uppercase;
        cursor: pointer;
        background-color: #44484a !important;
        transition: opacity 0.2s ease-in-out;
        margin: 0;
        box-sizing: content-box;
    }
    html[data-theme="dark"] .bplib-filterHeader button {
        background-color: #585e6d !important;
    }
    .bplib-filterHeader button:first-child {
        border-top-left-radius: calc(6px * var(--ui-scale));
        border-bottom-left-radius: calc(6px * var(--ui-scale));
    }
    .bplib-filterHeader button:last-child {
        border-top-right-radius: calc(6px * var(--ui-scale));
        border-bottom-right-radius: calc(6px * var(--ui-scale));
    }
    .bplib-filterHeader button:hover {
        opacity: 0.6;
    }
    .bplib-filterHeader button.active {
        opacity: 1 !important;
    }

    /* --- RIGHT-ALIGNED TOOLBAR ACTIONS (BLUE '+' BUTTON & SEARCHBAR) --- */
    .bplib-toolbar-right {
        margin-left: auto;
        display: flex;
        gap: calc(8px * var(--ui-scale));
        align-items: center;
    }

    /* --- BLUE '+' IMPORT BUTTON --- */
    .bplib-toolbar .bplib-btn-import {
        height: calc(20px * var(--ui-scale));
        width: calc(26px * var(--ui-scale));
        min-width: calc(26px * var(--ui-scale));
        padding: calc(1px * var(--ui-scale)) !important;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #4a97df !important;
        color: #ffffff !important;
        opacity: 0.9;
        font-size: calc(15px * var(--ui-scale));
        font-weight: bold;
        border: 0;
        border-radius: calc(6px * var(--ui-scale));
        cursor: pointer;
        box-shadow: none;
        line-height: 1;
        box-sizing: content-box;
        transition: opacity 0.2s ease-in-out, background-color 0.12s ease-in-out;
    }
    .bplib-toolbar .bplib-btn-import:hover {
        opacity: 1;
        background-color: #3b82c4 !important;
    }

    /* --- SEARCH BAR (MATCHING NATIVE HEIGHT) --- */
    .bplib-toolbar #bplib-search {
        height: calc(20px * var(--ui-scale));
        width: calc(180px * var(--ui-scale));
        padding: calc(1px * var(--ui-scale)) calc(8px * var(--ui-scale));
        box-sizing: content-box;
        font-size: calc(11px * var(--ui-scale));
        border-radius: calc(6px * var(--ui-scale));
        border: 0;
        background-color: #44484a;
        color: #fff;
        margin: 0;
    }
    html[data-theme="dark"] .bplib-toolbar #bplib-search {
        background-color: #585e6d;
        color: #fff;
    }
    .bplib-toolbar #bplib-search::placeholder {
        color: #fff;
        opacity: 0.4;
    }
    .bplib-grid {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding-right: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: auto;
    }

    /* --- SHOP: UPGRADE CARDS --- */
    .bplib-upgrade {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: 24px 1fr;
        background: #eee;
        border-radius: 7px;
        padding: 8px 12px;
        height: 95px;
        grid-row-gap: 4px;
        margin-bottom: 4px;
        box-sizing: border-box;
    }
    html[data-theme="dark"] .bplib-upgrade {
        background: #474b58;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .bplib-upgrade .title {
        grid-column: 1 / 2;
        grid-row: 1 / 2;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        color: #333;
        overflow: hidden;
    }
    html[data-theme="dark"] .bplib-upgrade .title { color: #fff; }

    .bplib-upgrade .title .name {
        font-size: 17px;
        font-weight: normal;
        font-family: "GameFont", sans-serif;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .bplib-upgrade .description {
        grid-column: 2 / 3;
        grid-row: 1 / 2;
        color: #aaa;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        font-family: "GameFont", sans-serif;
        gap: 10px;
    }

    .bplib-upgrade .requirements {
        grid-column: 1 / 2;
        grid-row: 2 / 3;
        display: flex;
        align-items: center;
    }

    .bplib-upgrade .requirement {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
    }

    .bplib-upgrade .requirement .shape {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #2e3440;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 2px 4px rgba(0,0,0,0.3);
    }

    .bplib-upgrade .requirement .amount {
        background: #55c767;
        color: #ffffff;
        font-family: "GameFont", sans-serif;
        font-size: 13px;
        font-weight: bold;
        padding: 2px 10px;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
    }

    .bplib-upgrade .bplib-upgrade-actions {
        grid-column: 2 / 3;
        grid-row: 2 / 3;
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: flex-end;
    }
    
    .bplib-action-delete {
        background: transparent;
        color: #ff6666;
        font-weight: bold;
        font-family: "GameFont", sans-serif;
        font-size: 14px;
        border: none;
        cursor: pointer;
    }
    .bplib-action-delete:hover {
        color: #ff0000;
    }

    /* --- HUD OVERLAYS --- */
    #ingame_HUD_PinnedShapes {
        top: calc(210px * var(--ui-scale)) !important;
    }

    /* --- PREVIEW DIALOG STYLES --- */
    .dialogUpgrades .dialogInner .buttons {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
    }
    .bplib-preview-dialog-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }
    .bplib-preview-canvas-container {
        position: relative;
        min-height: 360px;
        flex: 1;
        overflow: hidden;
    }
    .bplib-preview-canvas-container canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100% !important;
        height: 100% !important;
        display: block;
    }
    .bplib-preview-stats {
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: "GameFont", sans-serif;
        font-size: 13px;
        color: #fff;
    }
    .bplib-preview-cost-slot {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .bplib-preview-cost-slot .requirements {
        display: inline-flex;
        align-items: center;
        margin: 0;
    }
    .bplib-preview-cost-slot .requirement {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .bplib-preview-cost-slot .shape {
        width: 24px;
        height: 24px;
    }
    .bplib-preview-cost-slot .amount {
        padding: 1px 8px;
        font-size: 12px;
    }
    .bplib-preview-locked-warning {
        color: #ff9800;
        font-family: "GameFont", sans-serif;
        font-size: 13px;
    }
    .bplib-preview-recenter-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 10;
        pointer-events: auto;
    }
    .button.styledButton.disabled,
    button.styledButton:disabled,
    button.styledButton.disabled {
        opacity: 0.4 !important;
        cursor: not-allowed !important;
    }
`;


