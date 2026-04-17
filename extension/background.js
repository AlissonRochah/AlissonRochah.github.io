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
    getPropertyUlidByHouseCID,
    getPreviousGuestReservation,
    getReservationByBookingId,
} from "./js/mapro-client.js";

const MODE_KEY = "rm_panel_mode";
const LISTING_KEY = "rm_current_listing";
const RESORTS_CACHE_KEY = "rm_resorts_cache";
const MATCHED_KEY = "rm_matched_resort";
const RESERVATION_KEY = "rm_current_reservation";
const PREVIOUS_KEY = "rm_previous_reservation";

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

async function resolvePreviousReservation(currentRes) {
    if (!currentRes) return;
    const houseCID = currentRes.maproHouseCID;
    const currentCheckin = currentRes.checkin;
    if (!houseCID || !currentCheckin) return;

    try {
        const propertyUlid = await getPropertyUlidByHouseCID(houseCID);
        if (!propertyUlid) {
            await chrome.storage.local.remove(PREVIOUS_KEY);
            return;
        }
        const prev = await getPreviousGuestReservation(propertyUlid, currentCheckin);
        if (!prev || !prev.bookingID) {
            await chrome.storage.local.remove(PREVIOUS_KEY);
            return;
        }

        // Publish a partial record immediately so the UI can show the card
        // (with "No Code" as a placeholder) while we wait on the slower
        // /booking/check-reservation call for the full doorCode.
        const partial = {
            bookingID: prev.bookingID,
            checkin: prev.checkin,
            checkout: prev.checkout,
            guest: prev.guest,
            door_code: "",
            confirmation_code: "",
            ts: Date.now(),
            partial: true,
        };
        await chrome.storage.local.set({ [PREVIOUS_KEY]: partial });

        const full = await getReservationByBookingId(prev.bookingID);
        const payload = {
            bookingID: prev.bookingID,
            checkin: prev.checkin,
            checkout: prev.checkout,
            guest: prev.guest,
            door_code: (full && full.doorCode) || "",
            confirmation_code: (full && full.codReference) || "",
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
