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
const RESERVATION_KEY = "rm_current_reservation";
const PREVIOUS_KEY = "rm_previous_reservation";
const BUTTON_ID = "rm-gate-code-btn";
const DIVIDER_ID = "rm-gate-code-divider";
const PREV_BUTTON_ID = "rm-previous-gate-code-btn";
const PREV_DIVIDER_ID = "rm-previous-gate-code-divider";
const DEBOUNCE_MS = 250;
const SVG_NS = "http://www.w3.org/2000/svg";
const MORE_ACTIONS_SELECTOR = '[data-testid="hosting-details-header-section-actions-menu-entry-point"]';
const MANAGE_MODAL_SELECTOR = '[role="dialog"][aria-label="Manage reservation"]';
const MODAL_WAIT_MS = 2000;
const MODAL_POLL_MS = 50;

// Material Design vpn_key — visually distinct from Airbnb's keypad icon.
const KEY_PATH = "M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z";

let lastText = "";
let debounceTimer = null;
let lastReservationSignature = "";
let reservationInFlight = false;

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

// ============ Previous-stay gate code injection ============
//
// Same shape as the current gate-code button, placed immediately after it.
// The label is "Previous Gate Code" and the value is the door code MAPRO
// stored for the prior reservation on the same property.

function removePreviousInjected() {
    const btn = document.getElementById(PREV_BUTTON_ID);
    const div = document.getElementById(PREV_DIVIDER_ID);
    if (btn) btn.remove();
    if (div) div.remove();
}

function injectPreviousGateCodeButton(prev) {
    if (!prev) {
        removePreviousInjected();
        return;
    }

    // Anchor relative to the already-injected current gate-code button so
    // the previous card always sits right after it.
    const anchor = document.getElementById(BUTTON_ID);
    if (!anchor) {
        removePreviousInjected();
        return;
    }

    const codeValue = prev.door_code ? prev.door_code : "No Code";
    const existing = document.getElementById(PREV_BUTTON_ID);
    if (existing &&
        existing.parentNode === anchor.parentNode &&
        existing.dataset.gateCode === codeValue) {
        return;
    }

    const newBtn = anchor.cloneNode(true);
    newBtn.id = PREV_BUTTON_ID;
    newBtn.dataset.gateCode = codeValue;

    // Relabel.
    const divs = newBtn.querySelectorAll("div");
    for (const div of divs) {
        if (div.children.length === 0 &&
            /gate\s+code/i.test((div.textContent || "").trim())) {
            div.textContent = "Previous Gate Code";
            const codeDiv = div.nextElementSibling;
            if (codeDiv) codeDiv.textContent = codeValue;
            break;
        }
    }

    if (existing) {
        existing.replaceWith(newBtn);
        return;
    }

    // Clone the divider preceding the current gate-code button for rhythm.
    const sourceDivider = document.getElementById(DIVIDER_ID);
    let divider = null;
    if (sourceDivider) {
        divider = sourceDivider.cloneNode(true);
        divider.id = PREV_DIVIDER_ID;
    }

    if (divider) {
        anchor.after(divider, newBtn);
    } else {
        anchor.after(newBtn);
    }
}

async function injectPreviousFromStorage() {
    try {
        const obj = await chrome.storage.local.get(PREVIOUS_KEY);
        injectPreviousGateCodeButton(obj[PREVIOUS_KEY]);
    } catch (err) {
        console.warn("Resort Info: failed to read previous reservation", err);
    }
}

// ============ Reservation details capture ============
//
// The confirmation code, phone number, and booking date live inside the
// "Manage reservation" modal that only opens when the "..." button in the
// details panel header is clicked. We open it invisibly, read the rows,
// and close it. A signature check (listing text + guest panel text) prevents
// repeatedly re-opening the modal on every mutation.

function currentSignature() {
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return "";
    // Use the visible listing title + datespan as a stable key for the
    // currently open conversation.
    return (panel.textContent || "").slice(0, 300);
}

function waitFor(selector, timeout) {
    return new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
            const el = document.querySelector(selector);
            if (el) { resolve(el); return; }
            if (Date.now() - start >= timeout) { resolve(null); return; }
            setTimeout(tick, MODAL_POLL_MS);
        };
        tick();
    });
}

function waitForGone(selector, timeout) {
    return new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
            if (!document.querySelector(selector)) { resolve(true); return; }
            if (Date.now() - start >= timeout) { resolve(false); return; }
            setTimeout(tick, MODAL_POLL_MS);
        };
        tick();
    });
}

function parseManageModal(modal) {
    const out = {};

    const codeRow = modal.querySelector("#hosting-details-action-row-confirmation-code");
    if (codeRow) {
        const texts = Array.from(codeRow.querySelectorAll("div"))
            .map(d => (d.textContent || "").trim())
            .filter(Boolean);
        const idx = texts.indexOf("Confirmation code");
        if (idx >= 0 && texts[idx + 1]) {
            out.confirmation_code = texts[idx + 1];
        }
    }

    const phoneRows = modal.querySelectorAll('[id^="hosting-details-action-row-"][id$="-phone-number"]');
    for (const row of phoneRows) {
        const texts = Array.from(row.querySelectorAll("div"))
            .map(d => (d.textContent || "").trim())
            .filter(Boolean);
        // Title is "<Name>'s phone number" → next is the number.
        const titleIdx = texts.findIndex(t => /phone number$/i.test(t));
        if (titleIdx >= 0 && texts[titleIdx + 1]) {
            out.guest_name = texts[titleIdx].replace(/'s phone number$/i, "").trim();
            out.phone = texts[titleIdx + 1];
            break;
        }
    }

    const bookingRow = modal.querySelector("#hosting-details-action-row-booking-date");
    if (bookingRow) {
        const texts = Array.from(bookingRow.querySelectorAll("div"))
            .map(d => (d.textContent || "").trim())
            .filter(Boolean);
        const idx = texts.indexOf("Booking date");
        if (idx >= 0 && texts[idx + 1]) {
            out.booking_date = texts[idx + 1];
        }
    }

    // Listing id from the "View on calendar" link.
    const calLink = modal.querySelector('a[href^="/multicalendar/"]');
    if (calLink) {
        const m = calLink.getAttribute("href").match(/\/multicalendar\/(\d+)/);
        if (m) out.listing_id = m[1];
    }

    // Confirmation code also appears in /reservation/change?code=... — use as
    // a fallback if the row parse missed.
    if (!out.confirmation_code) {
        const changeLink = modal.querySelector('a[href*="/reservation/change?code="]');
        if (changeLink) {
            const m = changeLink.getAttribute("href").match(/code=([A-Z0-9]+)/);
            if (m) out.confirmation_code = m[1];
        }
    }

    return out;
}

async function captureReservationDetails() {
    if (reservationInFlight) return;
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return;

    const sig = currentSignature();
    if (!sig || sig === lastReservationSignature) return;

    const moreBtn = panel.querySelector(MORE_ACTIONS_SELECTOR);
    if (!moreBtn) return;

    // If the modal is already open (user opened it manually), just scrape.
    let modal = document.querySelector(MANAGE_MODAL_SELECTOR);
    let openedByUs = false;

    reservationInFlight = true;
    try {
        if (!modal) {
            moreBtn.click();
            modal = await waitFor(MANAGE_MODAL_SELECTOR, MODAL_WAIT_MS);
            openedByUs = true;
        }
        if (!modal) {
            reservationInFlight = false;
            return;
        }

        const details = parseManageModal(modal);

        if (openedByUs) {
            const closeBtn = modal.querySelector('button[aria-label="Close"]');
            if (closeBtn) closeBtn.click();
            // Wait until the modal is gone so the next mutation batch is clean.
            await waitForGone(MANAGE_MODAL_SELECTOR, MODAL_WAIT_MS);
        }

        if (details && details.confirmation_code) {
            lastReservationSignature = sig;
            await chrome.storage.local.set({
                [RESERVATION_KEY]: { ...details, ts: Date.now() },
            });
        }
    } catch (err) {
        console.warn("Resort Info: reservation capture failed", err);
    } finally {
        reservationInFlight = false;
    }
}

// ============ Mutation loop ============

function scheduleUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        publishListingTitle();
        // Re-inject in case Airbnb's SPA tore down or re-mounted the panel.
        injectFromStorage();
        injectPreviousFromStorage();
        // Fire-and-forget — it self-guards against concurrent runs.
        captureReservationDetails();
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
    if (changes[PREVIOUS_KEY]) {
        injectPreviousGateCodeButton(changes[PREVIOUS_KEY].newValue);
    }
    // When the current reservation changes, clear the stale previous one so
    // the UI doesn't show last conversation's previous code next to the new
    // current code until the background resolves the new previous.
    if (changes[RESERVATION_KEY]) {
        const next = changes[RESERVATION_KEY].newValue;
        const prev = changes[RESERVATION_KEY].oldValue;
        const nextCode = next && next.confirmation_code;
        const prevCode = prev && prev.confirmation_code;
        if (nextCode !== prevCode) {
            chrome.storage.local.remove(PREVIOUS_KEY);
        }
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
