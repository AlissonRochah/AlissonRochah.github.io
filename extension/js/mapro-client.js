// Thin client for app.mapro.us, authenticated by the user's session cookie.
//
// The cookie rides along automatically because manifest.json's
// host_permissions includes https://app.mapro.us/*. If the user isn't logged
// in, MAPRO answers with 302 (redirect to login) or 401, which we surface as
// MAPRO_NOT_LOGGED_IN so the UI can prompt the user to sign in.

const MAPRO_BASE = "https://app.mapro.us";

async function maproGet(path, params = {}) {
    const url = new URL(MAPRO_BASE + path);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        redirect: "manual",
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01",
        },
    });
    // redirect: "manual" turns a 302 into an opaqueredirect response with
    // status 0. Either of those means "session expired, log in again".
    if (res.type === "opaqueredirect" || res.status === 0 || res.status === 401) {
        throw new Error("MAPRO_NOT_LOGGED_IN");
    }
    if (!res.ok) {
        throw new Error(`MAPRO ${res.status}`);
    }
    return res.json();
}

// Look up an Airbnb reservation in MAPRO by its confirmation code (e.g.
// HMQ8PK2R2F). MAPRO stores it in the codReference column on the
// /booking/check-reservation grid. Returns the first matching item, or null
// if nothing matched.
export async function getReservationByCode(code) {
    const filter = JSON.stringify(["codReference", "=", code]);
    const data = await maproGet("/booking/check-reservation", {
        gridAjax: "",
        skip: 0,
        take: 1,
        requireTotalCount: false,
        filter,
    });
    const items = data && data.items;
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[0];
}

// Same grid, looked up by MAPRO's internal booking id (the numeric id in
// /booking/reservation/<bookingID>). Used to resolve full reservation
// details — including doorCode — for a reservation that we only have a
// calendar/reservation link for (i.e. the previous stay).
export async function getReservationByBookingId(bookingId) {
    const filter = JSON.stringify(["bookingID", "=", String(bookingId)]);
    const data = await maproGet("/booking/check-reservation", {
        gridAjax: "",
        skip: 0,
        take: 1,
        requireTotalCount: false,
        filter,
    });
    const items = data && data.items;
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[0];
}

// Resolve the MAPRO property ULID (e.g. 01KG34TMJF1EE7JSGFNAYHKK86) from the
// numeric maproHouseCID (e.g. 15816) that the check-reservation item gives
// us. The mapping lives in /calendar/settings under properties[].url, which
// ends with /manage/houses/register/<maproHouseCID>.
//
// The settings payload is large (~1 MB with every property and integrator)
// and /calendar/settings is the slowest call in the chain. We persist just
// the numeric-id → ULID mapping in chrome.storage.local so the second
// lookup in this browser (and every lookup after the service worker wakes
// from sleep) is instant. The map is refreshed in the background on a
// cache miss so a newly-onboarded property eventually resolves.

const PROPERTY_MAP_KEY = "rm_mapro_property_map";
const PROPERTY_MAP_TTL_MS = 24 * 60 * 60 * 1000; // 24h
let inMemoryPropertyMap = null;

async function readCachedPropertyMap() {
    if (inMemoryPropertyMap) return inMemoryPropertyMap;
    try {
        const obj = await chrome.storage.local.get(PROPERTY_MAP_KEY);
        const cached = obj[PROPERTY_MAP_KEY];
        if (cached && cached.map && (Date.now() - cached.ts) < PROPERTY_MAP_TTL_MS) {
            inMemoryPropertyMap = cached.map;
            return cached.map;
        }
    } catch (_) { /* ignore */ }
    return null;
}

async function refreshPropertyMap() {
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const start = `${yyyy}-${mm}-01`;
    const data = await maproGet("/calendar/settings", {
        type: "houseCalendar",
        start,
        fresh: "",
    });
    const props = (data && Array.isArray(data.properties)) ? data.properties : [];
    const map = {};
    for (const p of props) {
        if (!p || !p.url || !p.id) continue;
        const m = String(p.url).match(/\/(\d+)$/);
        if (m) map[m[1]] = p.id;
    }
    inMemoryPropertyMap = map;
    try {
        await chrome.storage.local.set({
            [PROPERTY_MAP_KEY]: { map, ts: Date.now() },
        });
    } catch (_) { /* ignore */ }
    return map;
}

export async function getPropertyUlidByHouseCID(maproHouseCID) {
    if (!maproHouseCID) return null;
    const key = String(maproHouseCID);

    const cached = await readCachedPropertyMap();
    if (cached && cached[key]) return cached[key];

    // Cache miss (or no cache yet) — refresh once and retry.
    const fresh = await refreshPropertyMap();
    return fresh[key] || null;
}

// Given a property ULID and the current reservation's checkin date, list
// calendar events for a 120-day window ending at checkin and return the most
// recent one that is a real guest reservation (rt === "g"), skipping blocks.
//
// Returns an object with { bookingID, checkin, checkout, guest, link } or
// null if nothing qualifying is found.
export async function getPreviousGuestReservation(propertyUlid, currentCheckinIso) {
    if (!propertyUlid || !currentCheckinIso) return null;
    const currentCheckin = new Date(currentCheckinIso.replace(" ", "T"));
    if (isNaN(currentCheckin.getTime())) return null;

    const windowStart = new Date(currentCheckin);
    windowStart.setDate(windowStart.getDate() - 120);
    const yyyy = windowStart.getUTCFullYear();
    const mm = String(windowStart.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(windowStart.getUTCDate()).padStart(2, "0");
    const start = `${yyyy}-${mm}-${dd}`;

    const data = await maproGet("/calendar/reservation", {
        start,
        properties: propertyUlid,
        single_property: 1,
    });
    const events = (data && Array.isArray(data[propertyUlid])) ? data[propertyUlid] : [];

    let best = null;
    let bestCheckoutMs = -Infinity;
    for (const ev of events) {
        if (!ev || ev.rt !== "g") continue; // skip blocks and non-guest
        if (!ev.co) continue;
        const coMs = new Date(String(ev.co).replace(" ", "T")).getTime();
        if (isNaN(coMs)) continue;
        // "Previous" = checkout is at or before current check-in.
        if (coMs > currentCheckin.getTime()) continue;
        if (coMs > bestCheckoutMs) {
            bestCheckoutMs = coMs;
            best = ev;
        }
    }
    if (!best) return null;

    // Extract bookingID from the link, e.g. /booking/reservation/6655949
    let bookingID = null;
    if (best.l) {
        const m = String(best.l).match(/\/booking\/reservation\/(\d+)/);
        if (m) bookingID = m[1];
    }

    return {
        bookingID,
        checkin: best.ci,
        checkout: best.co,
        guest: best.g,
        link: best.l,
    };
}

// Fast path: skip /calendar/settings and /calendar/reservation entirely.
// /booking/check-reservation can be filtered by the numeric maproHouseCID
// directly (the same id that the current reservation item already carries)
// and sorted by checkin desc. We page through a few recent entries and
// return the most recent one with a checkin strictly before the current
// one. Blocks do not appear on this grid — it's the "reservations" grid —
// so no type filtering is needed.
//
// Returns the full reservation row (with doorCode, codReference, etc.) so
// the caller only needs this one call to build the previous-stay payload.
export async function getPreviousReservationByHouseCID(maproHouseCID, currentCheckinIso) {
    if (!maproHouseCID || !currentCheckinIso) return null;
    const currentCheckin = new Date(currentCheckinIso.replace(" ", "T"));
    if (isNaN(currentCheckin.getTime())) return null;

    const filter = JSON.stringify(["maproHouseCID", "=", String(maproHouseCID)]);
    const sort = JSON.stringify([{ selector: "checkin", desc: true }]);
    const data = await maproGet("/booking/check-reservation", {
        gridAjax: "",
        skip: 0,
        take: 20,
        requireTotalCount: false,
        sort,
        filter,
    });
    const items = (data && Array.isArray(data.items)) ? data.items : [];

    const currentMs = currentCheckin.getTime();
    for (const it of items) {
        if (!it || !it.checkin) continue;
        const ci = new Date(String(it.checkin).replace(" ", "T")).getTime();
        if (isNaN(ci)) continue;
        if (ci < currentMs) return it;
    }
    return null;
}
