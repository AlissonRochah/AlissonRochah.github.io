// Background service worker
// 1. Opens MasterBot site when extension icon is clicked
// 2. Relays scrape requests from the website to the Airbnb content script

const MASTERBOT_URL = "https://alissonrochah.github.io/ai.html";

// Open MasterBot as a side window when icon clicked
chrome.action.onClicked.addListener(async () => {
    // Check if already open
    const existing = await chrome.tabs.query({ url: "https://alissonrochah.github.io/*" });

    if (existing.length > 0) {
        chrome.windows.update(existing[0].windowId, { focused: true });
        return;
    }

    // Get current window to position the new one beside it
    const currentWindow = await chrome.windows.getCurrent();
    const screenWidth = currentWindow.left + currentWindow.width;

    // Open as a narrow side window (400px wide, right side of screen)
    chrome.windows.create({
        url: MASTERBOT_URL,
        type: "popup",
        width: 420,
        height: currentWindow.height,
        left: screenWidth - 420,
        top: currentWindow.top
    });

    // Resize the current window to make room
    chrome.windows.update(currentWindow.id, {
        width: screenWidth - 420,
        left: currentWindow.left
    });
});

// Relay messages from website to content script
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action !== "scrapeConversation") return false;

    // Find the Airbnb inbox tab
    chrome.tabs.query({ url: "https://www.airbnb.com/hosting/messages/*" }, (tabs) => {
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
