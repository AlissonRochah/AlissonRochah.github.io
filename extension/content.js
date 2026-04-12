// Watches Airbnb's hosting message thread panel for the current reservation's
// listing title and writes it to chrome.storage.local so the popup / side
// panel can auto-open the matching resort.
//
// The panel element is `#thread_details_panel`. Inside it, the listing title
// lives as the third child of the container that holds the guest's group
// name (`<h3>`) followed by the dates row and then the listing title row.

const STORAGE_KEY = "rm_current_listing";
const DEBOUNCE_MS = 250;

let lastText = "";
let debounceTimer = null;

function extractListingText() {
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return "";

    // The first <h3> inside the panel is the guest group name. Its siblings
    // inside the same wrapper are: [h3, dates row, listing title row].
    const heading = panel.querySelector("h3");
    if (!heading || !heading.parentElement) return "";

    const siblings = Array.from(heading.parentElement.children);
    const headingIdx = siblings.indexOf(heading);
    // Listing title is two siblings after the heading.
    const titleEl = siblings[headingIdx + 2];
    if (!titleEl) return "";

    return (titleEl.textContent || "").trim();
}

async function update() {
    const text = extractListingText();
    if (!text || text === lastText) return;
    lastText = text;
    try {
        await chrome.storage.local.set({
            [STORAGE_KEY]: { text, ts: Date.now() },
        });
    } catch (err) {
        console.warn("Resort Info: failed to write listing title", err);
    }
}

function scheduleUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, DEBOUNCE_MS);
}

// Initial scan after the SPA has had a chance to render.
scheduleUpdate();

// Airbnb is a single-page app; the panel content swaps without navigation.
// Observe the whole body so we catch panel mounts and in-place text swaps.
const observer = new MutationObserver(scheduleUpdate);
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
});

// Respond to direct pulls from the popup when it opens (belt and braces).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "rm-get-current-listing") {
        sendResponse({ text: extractListingText() });
        return true;
    }
});
