// Applies the saved panel mode ("popup" or "sidepanel") when Chrome starts
// or the extension is installed/updated. The toggle button in the popup
// flips the stored preference; this worker makes sure the behavior sticks
// across browser restarts.

const MODE_KEY = "rm_panel_mode";

async function applyMode() {
    const { [MODE_KEY]: mode } = await chrome.storage.local.get(MODE_KEY);
    const openOnClick = mode === "sidepanel";
    try {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: openOnClick });
    } catch (err) {
        console.warn("Resort Info: failed to set side panel behavior", err);
    }
}

chrome.runtime.onInstalled.addListener(applyMode);
chrome.runtime.onStartup.addListener(applyMode);
