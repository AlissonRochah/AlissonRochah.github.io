// MasterBot Bridge — background service worker.
// Acts as a generic transport for the MasterBot site to call Jobber's
// and MAPRO's internal APIs using the user's existing Brave/Chrome
// session cookies. No data is stored anywhere; the extension only
// relays requests and returns responses to the calling page.

const JOBBER_GRAPHQL = "https://secure.getjobber.com/api/graphql?location=j";
const MAPRO_BASE = "https://app.mapro.us";

async function jobberFetch({ operationName, query, variables }) {
    if (typeof query !== "string" || !query.trim()) {
        throw new Error("query is required");
    }
    const res = await fetch(JOBBER_GRAPHQL, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-Jobber-Graphql-Version": "2026-04-16",
        },
        body: JSON.stringify({ operationName, query, variables: variables || {} }),
    });
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch (_) {
        throw new Error(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 300)}`);
    }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${json?.errors?.[0]?.message || text.slice(0, 300)}`);
    }
    if (Array.isArray(json.errors) && json.errors.length) {
        throw new Error(json.errors[0].message || "GraphQL error");
    }
    return json.data;
}

async function findOrOpenBookingTab(reservaId) {
    const url = `https://app.mapro.us/booking/reservation/${encodeURIComponent(reservaId)}`;
    const matchPattern = `https://app.mapro.us/booking/reservation/${reservaId}*`;
    const tabs = await chrome.tabs.query({ url: matchPattern });
    if (tabs.length) return { tab: tabs[0], opened: false };
    const tab = await chrome.tabs.create({ url, active: false });
    await new Promise((resolve) => {
        const onUpdated = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(onUpdated);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(onUpdated);
    });
    // give MAPRO's JS a moment to initialise (add_service is registered late)
    await new Promise((r) => setTimeout(r, 1500));
    return { tab, opened: true };
}

async function maproAddService({ reservaId, kind, price, date }) {
    if (!reservaId) throw new Error("reservaId required");
    if (!kind) throw new Error("kind required (bbq|ph35|ph75|ph)");
    if (price == null || isNaN(Number(price))) throw new Error("price required (number)");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error("date required (YYYY-MM-DD)");

    const { tab, opened } = await findOrOpenBookingTab(reservaId);
    try {
        const result = await chrome.tabs.sendMessage(tab.id, {
            action: "mapro-add-service",
            payload: { kind, price: Number(price), date },
        });
        if (!result || !result.ok) throw new Error((result && result.error) || "content script no response");
        return result.data;
    } finally {
        if (opened) {
            // Close the tab we opened, give the user a chance to see the success
            setTimeout(() => chrome.tabs.remove(tab.id).catch(() => {}), 1500);
        }
    }
}

async function maproAddComment({ reservaId, casaId, comment }) {
    if (!reservaId) throw new Error("reservaId missing (got " + JSON.stringify(reservaId) + ")");
    if (!casaId) throw new Error("casaId missing (got " + JSON.stringify(casaId) + ")");
    if (typeof comment !== "string" || !comment.trim()) throw new Error("comment is required");
    const fd = new FormData();
    fd.append("tx-comentario", comment);
    fd.append("reserva_id", String(reservaId));
    fd.append("casa_id", String(casaId));
    fd.append("comentario", comment);
    const res = await fetch(MAPRO_BASE + "/ajax?manage-booking-details-commented", {
        method: "POST",
        credentials: "include",
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
        },
        body: fd,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch (_) { throw new Error(`Non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`); }
    if (!res.ok || json?.status !== true) {
        throw new Error(json?.msg || `HTTP ${res.status}`);
    }
    return json;
}

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
    (async () => {
        try {
            if (!msg || typeof msg !== "object") {
                sendResponse({ ok: false, error: "invalid message" });
                return;
            }
            if (msg.action === "ping") {
                sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
                return;
            }
            if (msg.action === "jobber-query") {
                const data = await jobberFetch(msg.payload || {});
                sendResponse({ ok: true, data });
                return;
            }
            if (msg.action === "mapro-add-comment") {
                const data = await maproAddComment(msg.payload || {});
                sendResponse({ ok: true, data });
                return;
            }
            if (msg.action === "mapro-add-service") {
                const data = await maproAddService(msg.payload || {});
                sendResponse({ ok: true, data });
                return;
            }
            sendResponse({ ok: false, error: `unknown action: ${msg.action}` });
        } catch (e) {
            sendResponse({ ok: false, error: String(e?.message || e) });
        }
    })();
    return true;
});
