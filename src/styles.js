export const BUTTON_ICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20640%20640'%3E%3Cpath%20fill='%23000'%20d='M72.5%200L640%200L640%20490Q624.6%20489.8%20613.5%20495Q596%20502.5%20585%20516.5Q577.3%20525.8%20573%20538.5L570%20552.5L570%20568.5Q575.3%20600.2%20596.5%20616Q605.8%20623.7%20618.5%20628L632.5%20631L640%20631L640%20639.5L639.5%20640L65.5%20640Q34.7%20632.8%2018%20611.5L5%20589.5L0%20568.5L0%2072.5L3%2057.5L11%2039.5Q18.5%2027%2029.5%2018L51.5%205L72.5%200ZM160%2080L160%20160L190%20160L190%20110L240%20110L240%2080L160%2080ZM401%2080L401%20110L451%20110L451%20160L481%20160L481%2080L401%2080ZM160%20321L160%20401L240%20401L240%20371L190%20371L190%20321L160%20321ZM451%20321L451%20371L401%20371L401%20401L481%20401L481%20321L451%20321ZM73%20490L54%20495L37%20505Q15%20521%2010%20553L10%20569L13%20583Q17%20595%2025%20605Q41%20626%2073%20631L601%20631L590%20623Q578%20614%20571%20602L563%20584L560%20569L560%20553L563%20538Q568%20521%20578%20510Q587%20498%20601%20491L73%20490Z'/%3E%3C/svg%3E";

export const CSS = `
    #ingame_HUD_GameMenu > .button.blueprintLibrary,
    #ingame_HUD_GameMenu > button.blueprintLibrary {
        background-image: url("${BUTTON_ICON}");
        background-position: center center;
        background-repeat: no-repeat;
        background-size: 70%;
    }

    /* --- DIALOG OVERRIDES --- */
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
    .bplib-toolbar {
        display: flex; gap: 10px; margin-bottom: 20px; align-items: center;
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

    /* --- STATISTICS: TAGS FILTER HEADER --- */
    .bplib-filterHeader {
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 10px;
    }
    .bplib-filterHeader button {
        height: 20px;
        padding: 1px 10px;
        border: 0;
        box-shadow: none;
        min-width: 30px;
        color: #fff;
        opacity: 0.25;
        background: rgba(255,255,255,0.1);
        border-radius: 0;
        font-size: 11px;
        font-family: "GameFont", sans-serif;
        cursor: pointer;
    }
    html[data-theme="dark"] .bplib-filterHeader button {
        background: #474b58;
    }
    .bplib-filterHeader button:hover { opacity: 0.5; }
    .bplib-filterHeader button.active { opacity: 1; }
    .bplib-filterHeader button:first-child { border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
    .bplib-filterHeader button:last-child { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }

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
`;
