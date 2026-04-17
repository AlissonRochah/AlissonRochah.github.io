// Background service worker.
//
// Two jobs:
//   1. Apply saved panel mode (popup vs side panel) on startup / install.
//   2. Match the current Airbnb listing title against the cached resort
//      list and publish the matched resort to storage so the content
//      script can inject a gate-code card and the popup can auto-open
//      the resort detail — even when the popup itself isn't running.
//
// The resort cache is written by the popup (extension/popup.js) whenever
// it loads the list from Supabase. The background worker only reads it.

import {
    getPreviousReservationByHouseCID,
    getReservationByCode,
    searchReservationsByGuestName,
} from "./js/mapro-client.js";

const MODE_KEY = "rm_panel_mode";
const LISTING_KEY = "rm_current_listing";
const RESORTS_CACHE_KEY = "rm_resorts_cache";
const MATCHED_KEY = "rm_matched_resort";
const RESERVATION_KEY = "rm_current_reservation";
const PREVIOUS_KEY = "rm_previous_reservation";
const PROPERTY_MANAGER_KEY = "rm_property_manager";
const GUEST_NAME_KEY = "rm_current_guest_name";

// ============ Panel mode ============

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

// ============ Resort matching ============

function findResortForText(text, resorts) {
    if (!text || !Array.isArray(resorts)) return null;
    const needle = text.toLowerCase();
    let best = null;
    let bestLen = 0;
    for (const r of resorts) {
        const candidates = [r.name, ...(r.aliases || [])].filter(Boolean);
        for (const c of candidates) {
            const s = String(c).toLowerCase().trim();
            if (s.length < 3) continue;
            if (needle.includes(s) && s.length > bestLen) {
                best = r;
                bestLen = s.length;
            }
        }
    }
    return best;
}

function toMatchedPayload(resort, listingText) {
    if (!resort) return null;
    return {
        id: resort.id,
        name: resort.name,
        gate_code: resort.gate_code || "",
        address: resort.address || "",
        listing_text: listingText,
        ts: Date.now(),
    };
}

async function recomputeMatch() {
    const obj = await chrome.storage.local.get([LISTING_KEY, RESORTS_CACHE_KEY, MATCHED_KEY]);
    const entry = obj[LISTING_KEY];
    const cache = obj[RESORTS_CACHE_KEY];
    const prev = obj[MATCHED_KEY] || null;

    const listingText = entry && entry.text ? entry.text : "";
    const resorts = cache && Array.isArray(cache.resorts) ? cache.resorts : [];

    const match = findResortForText(listingText, resorts);
    const next = toMatchedPayload(match, listingText);

    // Skip write if unchanged (same resort id, same gate code).
    const sameId = (prev && prev.id) === (next && next.id);
    const sameGate = (prev && prev.gate_code) === (next && next.gate_code);
    if (sameId && sameGate) return;

    if (next) {
        await chrome.storage.local.set({ [MATCHED_KEY]: next });
    } else {
        await chrome.storage.local.remove(MATCHED_KEY);
    }
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[LISTING_KEY] || changes[RESORTS_CACHE_KEY]) {
        recomputeMatch();
    }
    if (changes[RESERVATION_KEY]) {
        const next = changes[RESERVATION_KEY].newValue;
        if (next && next.confirmation_code) {
            resolveFromConfirmationCode(next.confirmation_code);
        }
    }
    if (changes[GUEST_NAME_KEY]) {
        const next = changes[GUEST_NAME_KEY].newValue;
        if (next && next.name) {
            resolveFromGuestName(next.name);
        }
    }
});

// On worker wake-up (install / startup / message), reconcile once so a
// stale matched value doesn't linger after the cache or listing changed
// while we were asleep.
chrome.runtime.onInstalled.addListener(recomputeMatch);
chrome.runtime.onStartup.addListener(recomputeMatch);

// ============ Previous reservation resolution ============
//
// Given the current reservation (full object from /booking/check-reservation,
// sent by the popup after its auto-lookup), find the most recent real guest
// reservation on the same property that ended at or before the current
// check-in. Blocks are skipped. The resolved previous stay — including its
// door code — is written to rm_previous_reservation so the content script
// can inject a "Previous Gate Code" card.

// End-to-end resolution driven by the content script. When the user opens
// the "Manage reservation" modal, content.js captures the confirmation code
// and writes rm_current_reservation. We pick it up here, resolve the full
// current reservation in MAPRO (to get maproHouseCID), then chase down the
// previous stay on the same property. All without the popup being open.
let resolveGuestInFlight = "";
async function resolveFromGuestName(name) {
    if (!name || name === resolveGuestInFlight) return;
    resolveGuestInFlight = name;
    try {
        // Skip if the user already opened the modal for this conversation
        // and we have a current reservation cached — the confirmation-code
        // path is authoritative.
        const existing = await chrome.storage.local.get(RESERVATION_KEY);
        if (existing[RESERVATION_KEY] && existing[RESERVATION_KEY].confirmation_code) {
            return;
        }
        const matches = await searchReservationsByGuestName(name);
        if (!Array.isArray(matches) || matches.length !== 1) {
            // Zero or ambiguous — bail and wait for the user to open the
            // Manage reservation modal.
            return;
        }
        const current = matches[0];
        if (!current || !current.maproHouseCID) return;
        // Publish the resolved current reservation so downstream handlers
        // and the Airbnb panel UI update. Use codReference as the
        // confirmation code so the existing pipeline recognises it as a
        // "current" reservation.
        await chrome.storage.local.set({
            [RESERVATION_KEY]: {
                confirmation_code: current.codReference || "",
                guest_name: current.guest || name,
                booking_date: null,
                listing_id: String(current.maproHouseCID),
                phone: current.guestPhone || "",
                source: "guest-name-lookup",
                ts: Date.now(),
            },
        });
        // We already have the full MAPRO row, so drive previous/PM directly
        // without round-tripping through /booking/check-reservation again.
        await Promise.all([
            resolvePreviousReservation(current),
            resolvePropertyManager(current),
        ]);
    } catch (err) {
        console.warn("Resort Info: resolve from guest name failed", err);
    } finally {
        if (resolveGuestInFlight === name) resolveGuestInFlight = "";
    }
}

let resolveInFlight = "";
async function resolveFromConfirmationCode(code) {
    if (!code || code === resolveInFlight) return;
    resolveInFlight = code;
    try {
        const current = await getReservationByCode(code);
        if (!current || !current.maproHouseCID || !current.checkin) return;

        // Fire the previous-stay chase and the property-manager lookup in
        // parallel — neither depends on the other.
        await Promise.all([
            resolvePreviousReservation(current),
            resolvePropertyManager(current),
        ]);
    } catch (err) {
        console.warn("Resort Info: resolve from confirmation code failed", err);
    } finally {
        if (resolveInFlight === code) resolveInFlight = "";
    }
}

async function resolvePropertyManager(currentRes) {
    const responsible = currentRes && currentRes.responsible;
    // MAPRO returns the responsible as the display name directly on the
    // check-reservation row — no extra lookup needed.
    if (!responsible) {
        await chrome.storage.local.remove(PROPERTY_MANAGER_KEY);
        return;
    }
    try {
        await chrome.storage.local.set({
            [PROPERTY_MANAGER_KEY]: { name: String(responsible), ts: Date.now() },
        });
    } catch (err) {
        console.warn("Resort Info: property manager write failed", err);
    }
}

async function resolvePreviousReservation(currentRes) {
    if (!currentRes) return;
    const houseCID = currentRes.maproHouseCID;
    const currentCheckin = currentRes.checkin;
    if (!houseCID || !currentCheckin) return;

    try {
        const prev = await getPreviousReservationByHouseCID(houseCID, currentCheckin);
        if (!prev) {
            await chrome.storage.local.remove(PREVIOUS_KEY);
            return;
        }
        const payload = {
            bookingID: prev.bookingID,
            checkin: prev.checkin,
            checkout: prev.checkout,
            guest: prev.guest,
            door_code: prev.doorCode || "",
            confirmation_code: prev.codReference || "",
            ts: Date.now(),
        };
        await chrome.storage.local.set({ [PREVIOUS_KEY]: payload });
    } catch (err) {
        console.warn("Resort Info: previous reservation lookup failed", err);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === "resolvePreviousReservation") {
        resolvePreviousReservation(request.reservation);
        sendResponse({ ok: true });
        return false;
    }
    return false;
});

// ============ External messaging (from the webapp) ============
//
// The AI page on https://alissonrochah.github.io/ai.html talks to this
// extension via chrome.runtime.sendMessage(EXTENSION_ID, ...). Two actions:
//
//   getMatchedResort    → returns chrome.storage.local.rm_matched_resort
//   scrapeConversation  → relays to the Airbnb tab's content script

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (!request || !request.action) return false;

    if (request.action === "getMatchedResort") {
        chrome.storage.local.get(MATCHED_KEY, (data) => {
            sendResponse({ success: true, resort: data[MATCHED_KEY] || null });
        });
        return true; // async
    }

    if (request.action === "getReservation") {
        chrome.storage.local.get(RESERVATION_KEY, (data) => {
            sendResponse({ success: true, reservation: data[RESERVATION_KEY] || null });
        });
        return true; // async
    }

    if (request.action === "getContext") {
        chrome.storage.local.get([MATCHED_KEY, RESERVATION_KEY], (data) => {
            sendResponse({
                success: true,
                resort: data[MATCHED_KEY] || null,
                reservation: data[RESERVATION_KEY] || null,
            });
        });
        return true; // async
    }

    if (request.action === "scrapeConversation") {
        chrome.tabs.query({ url: "https://*.airbnb.com/*" }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                sendResponse({
                    success: false,
                    error: "No Airbnb tab found. Open the Airbnb inbox first.",
                });
                return;
            }
            // Pick the most recently focused Airbnb tab.
            const tab = tabs.find((t) => t.active) || tabs[0];
            chrome.tabs.sendMessage(tab.id, { action: "scrapeConversation" }, (reply) => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        success: false,
                        error: "Could not reach Airbnb tab. Try refreshing the page.",
                    });
                    return;
                }
                sendResponse(reply);
            });
        });
        return true; // async
    }

    return false;
});
