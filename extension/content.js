// Content script injected on airbnb.com.
//
// Two jobs:
//   1. Watch the "Reservation" details panel (#thread_details_panel) and
//      publish its listing-title line to chrome.storage.local so the
//      background worker can match it against our resort list.
//   2. Inject a small card inside that same panel showing the matched
//      resort's gate code, reading the match result from storage.

const LISTING_KEY = "rm_current_listing";
const MATCHED_KEY = "rm_matched_resort";
const CARD_ID = "rm-gate-card";
const DEBOUNCE_MS = 250;

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

// ============ Gate-code card injection ============

function buildCard(match) {
    const card = document.createElement("div");
    card.id = CARD_ID;
    card.style.cssText = `
        margin: 16px 0;
        padding: 16px;
        border-radius: 12px;
        background: #f7f7f7;
        border: 1px solid #e4e4e4;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #222;
    `;

    const label = document.createElement("div");
    label.textContent = `Resort · ${match.name}`;
    label.style.cssText = "font-size: 12px; color: #717171; margin-bottom: 6px;";
    card.appendChild(label);

    if (match.gate_code) {
        const code = document.createElement("div");
        code.textContent = match.gate_code;
        code.style.cssText = "font-size: 22px; font-weight: 600; letter-spacing: 0.5px;";
        card.appendChild(code);

        const hint = document.createElement("div");
        hint.textContent = "Gate code";
        hint.style.cssText = "font-size: 12px; color: #717171; margin-top: 4px;";
        card.appendChild(hint);
    } else {
        const none = document.createElement("div");
        none.textContent = "No gate code on file";
        none.style.cssText = "font-size: 14px; color: #717171;";
        card.appendChild(none);
    }

    if (match.address) {
        const addr = document.createElement("div");
        addr.textContent = match.address;
        addr.style.cssText = "font-size: 12px; color: #717171; margin-top: 8px;";
        card.appendChild(addr);
    }

    return card;
}

function findInsertionPoint(panel) {
    // Prefer inserting after the payment card (the last card in the panel).
    const payment = panel.querySelector('[data-testid="hosting-details-payment-info"]');
    if (payment) {
        const wrapper = payment.closest('div[style*="display: contents"]') || payment.parentElement;
        return { parent: wrapper.parentElement, anchor: wrapper.nextSibling };
    }
    // Fallback: append to the scrollable content wrapper.
    return { parent: panel, anchor: null };
}

function renderCard(match) {
    const existing = document.getElementById(CARD_ID);
    const panel = document.getElementById("thread_details_panel");
    if (!panel) return;

    if (!match || !match.id) {
        if (existing) existing.remove();
        return;
    }

    const card = buildCard(match);
    if (existing) {
        existing.replaceWith(card);
        return;
    }
    const { parent, anchor } = findInsertionPoint(panel);
    if (!parent) return;
    parent.insertBefore(card, anchor);
}

async function renderCardFromStorage() {
    try {
        const obj = await chrome.storage.local.get(MATCHED_KEY);
        renderCard(obj[MATCHED_KEY]);
    } catch (err) {
        console.warn("Resort Info: failed to read matched resort", err);
    }
}

// ============ Mutation loop ============

function scheduleUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        publishListingTitle();
        // Re-render the card in case the panel was re-mounted (Airbnb SPA
        // routinely tears down the details panel when switching threads).
        renderCardFromStorage();
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
        renderCard(changes[MATCHED_KEY].newValue);
    }
});
