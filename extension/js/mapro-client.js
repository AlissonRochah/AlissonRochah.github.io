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
let propertySettingsCache = null;
async function loadCalendarProperties() {
    if (propertySettingsCache) return propertySettingsCache;
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
    propertySettingsCache = props;
    return props;
}

export async function getPropertyUlidByHouseCID(maproHouseCID) {
    if (!maproHouseCID) return null;
    const props = await loadCalendarProperties();
    const needle = `/${maproHouseCID}`;
    for (const p of props) {
        if (p && p.url && String(p.url).endsWith(needle)) return p.id;
    }
    return null;
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
