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
