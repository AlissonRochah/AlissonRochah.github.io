// Content script injected on airbnb.com.
//
// Two jobs:
//   1. Watch the "Reservation" details panel (#thread_details_panel) and
//      publish its listing-title line to chrome.storage.local so the
//      background worker can match it against our resort list.
//   2. Inject a "Gate Code" button matching Airbnb's native button styling
//      right after the "Suggested door code" button, reading the matched
//      resort's gate code from storage.

const LISTING_KEY = "rm_current_listing";
const MATCHED_KEY = "rm_matched_resort";
const BUTTON_ID = "rm-gate-code-btn";
const DIVIDER_ID = "rm-gate-code-divider";
const DEBOUNCE_MS = 250;
const SVG_NS = "http://www.w3.org/2000/svg";

// Material Design vpn_key — visually distinct from Airbnb's keypad icon.
const KEY_PATH = "M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z";

let lastText = "";
let debounceTimer = null;

// ============ Listing title extraction ============

function extractListingText() {
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return "";

    const heading = panel.querySelector("h3");
    if (!heading || !heading.parentElement) return "";

    const siblings = Array.from(heading.parentElement.children);
    const headingIdx = siblings.indexOf(heading);
    const titleEl = siblings[headingIdx + 2];
    if (!titleEl) return "";

    return (titleEl.textContent || "").trim();
}

async function publishListingTitle() {
    const text = extractListingText();
    if (!text || text === lastText) return;
    lastText = text;
    try {
        await chrome.storage.local.set({
            [LISTING_KEY]: { text, ts: Date.now() },
        });
    } catch (err) {
        console.warn("Resort Info: failed to write listing title", err);
    }
}

// ============ Gate code button injection ============

function findSuggestedDoorCodeButton() {
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return null;
    const buttons = panel.querySelectorAll("button");
    for (const btn of buttons) {
        if (btn.id === BUTTON_ID) continue;
        if (/suggested\s+door\s+code/i.test(btn.textContent || "")) return btn;
    }
    return null;
}

function buildGateCodeButton(sourceBtn, code) {
    const newBtn = sourceBtn.cloneNode(true);
    newBtn.id = BUTTON_ID;
    newBtn.dataset.gateCode = code;

    // Replace the label "Suggested door code" → "Gate Code" and update the
    // value div sitting next to it.
    let labelDiv = null;
    const divs = newBtn.querySelectorAll("div");
    for (const div of divs) {
        if (div.children.length === 0 &&
            /suggested\s+door\s+code/i.test((div.textContent || "").trim())) {
            labelDiv = div;
            break;
        }
    }
    if (labelDiv) {
        labelDiv.textContent = "Gate Code";
        const codeDiv = labelDiv.nextElementSibling;
        if (codeDiv) codeDiv.textContent = code;
    }

    // Swap the keypad icon for a key icon.
    const svg = newBtn.querySelector("svg");
    if (svg) {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        svg.setAttribute("viewBox", "0 0 24 24");
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", KEY_PATH);
        svg.appendChild(path);
    }

    return newBtn;
}

function removeInjected() {
    const existingBtn = document.getElementById(BUTTON_ID);
    const existingDivider = document.getElementById(DIVIDER_ID);
    if (existingBtn) existingBtn.remove();
    if (existingDivider) existingDivider.remove();
}

function injectGateCodeButton(match) {
    if (!match || !match.id) {
        removeInjected();
        return;
    }

    const sourceBtn = findSuggestedDoorCodeButton();
    if (!sourceBtn) {
        // Without the anchor we can't match the surrounding layout.
        removeInjected();
        return;
    }

    const codeValue = match.gate_code || "No gate code";
    const existing = document.getElementById(BUTTON_ID);

    // Already injected in the right place with the right value — skip.
    if (existing &&
        existing.parentNode === sourceBtn.parentNode &&
        existing.dataset.gateCode === codeValue) {
        return;
    }

    const newBtn = buildGateCodeButton(sourceBtn, codeValue);

    if (existing) {
        existing.replaceWith(newBtn);
        return;
    }

    // Clone the empty divider div that sits before the source button so the
    // visual rhythm matches the rest of the panel.
    const sourceDivider = sourceBtn.previousElementSibling;
    let divider = null;
    if (sourceDivider && sourceDivider.tagName === "DIV" &&
        sourceDivider.children.length === 0) {
        divider = sourceDivider.cloneNode(true);
        divider.id = DIVIDER_ID;
    }

    if (divider) {
        sourceBtn.after(divider, newBtn);
    } else {
        sourceBtn.after(newBtn);
    }
}

async function injectFromStorage() {
    try {
        const obj = await chrome.storage.local.get(MATCHED_KEY);
        injectGateCodeButton(obj[MATCHED_KEY]);
    } catch (err) {
        console.warn("Resort Info: failed to read matched resort", err);
    }
}

// ============ Mutation loop ============

function scheduleUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        publishListingTitle();
        // Re-inject in case Airbnb's SPA tore down or re-mounted the panel.
        injectFromStorage();
    }, DEBOUNCE_MS);
}

scheduleUpdate();

const observer = new MutationObserver(scheduleUpdate);
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[MATCHED_KEY]) {
        injectGateCodeButton(changes[MATCHED_KEY].newValue);
    }
});

// ============ Conversation scraping ============
//
// Airbnb renders messages in a container marked with
// data-testid="message-list". Each row is a div with role="group" and an
// aria-label of the form "Name sent Message. Sent Time" (or
// "Most Recent Message. Name sent Message. Sent Time").
//
// Host messages include the company name in parentheses, e.g.
// "Name (Master Vacation Homes)". Guest messages don't.

function scrapeMessages() {
    const messageList = document.querySelector('[data-testid="message-list"]');
    if (!messageList) {
        throw new Error("Could not find message thread on this page.");
    }

    const items = messageList.querySelectorAll('[role="group"][data-item-id]');
    if (!items || items.length === 0) {
        throw new Error("No messages found in the conversation.");
    }

    const messages = [];
    items.forEach((item) => {
        const label = item.getAttribute("aria-label");
        if (!label) return;

        // Skip system messages and conversation markers.
        if (label.indexOf("Airbnb service says") !== -1) return;
        if (label.indexOf("Start of Conversation") !== -1) return;

        const cleanLabel = label.replace(/^Most Recent Message\.\s*/, "");
        const sentMatch = cleanLabel.match(/^(.+?)\s+sent\s+(.+?)\.\s+Sent\s+/);
        if (!sentMatch) return;

        let senderName = sentMatch[1].trim();
        let messageText = sentMatch[2].trim();

        if (messageText.endsWith(".")) {
            messageText = messageText.slice(0, -1).trim();
        }

        // Clean up unicode bidi marks that Airbnb wraps around some names.
        senderName = senderName.replace(/[\u2068\u2069]/g, "");

        // Host messages contain "Master Vacation Homes" in the sender name.
        const isHost = senderName.toLowerCase().indexOf("master vacation homes") !== -1;

        // Airbnb collapses hard line breaks into ".." inside the aria-label.
        messageText = messageText.replace(/\.\./g, "\n");

        messages.push({
            role: isHost ? "host" : "guest",
            sender: senderName,
            text: messageText,
        });
    });

    if (messages.length === 0) {
        throw new Error("No messages found in the conversation.");
    }

    return messages;
}

// Respond to scrape requests relayed from the background worker.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === "scrapeConversation") {
        try {
            sendResponse({ success: true, messages: scrapeMessages() });
        } catch (err) {
            sendResponse({ success: false, error: err && err.message });
        }
        return true; // keep channel open for the sync response above
    }
    return false;
});
