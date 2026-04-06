// Background service worker
// 1. Opens MasterBot site when extension icon is clicked
// 2. Relays scrape requests from the website to the Airbnb content script

const MASTERBOT_URL = "https://alissonrochah.github.io/ai.html";

// Open MasterBot when icon clicked
chrome.action.onClicked.addListener(async () => {
    const tabs = await chrome.tabs.query({ url: "https://alissonrochah.github.io/*" });

    if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
        chrome.tabs.create({ url: MASTERBOT_URL });
    }
});

// Relay messages from website to content script
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action !== "scrapeConversation") return false;

    // Find the Airbnb inbox tab
    chrome.tabs.query({ url: "https://www.airbnb.com/hosting/inbox/*" }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            sendResponse({ success: false, error: "No Airbnb inbox tab found. Open the Airbnb messaging page first." });
            return;
        }

        // Send scrape request to content script
        chrome.tabs.sendMessage(tabs[0].id, { action: "scrapeConversation" }, (response) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: "Could not reach Airbnb tab. Try refreshing the page." });
                return;
            }
            sendResponse(response);
        });
    });

    return true; // keep channel open for async response
});
