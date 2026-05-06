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

async function openBookingWindow(reservaId) {
    // Always open in a NEW minimized window so the user's main window is
    // untouched (and we don't fight with an already-open booking tab).
    const url = `https://app.mapro.us/booking/reservation/${encodeURIComponent(reservaId)}`;
    console.log("[MB-bg] opening booking window:", url);
    let win;
    try {
        win = await chrome.windows.create({
            url,
            focused: false,
            state: "minimized",
            type: "normal",
        });
    } catch (e) {
        console.error("[MB-bg] chrome.windows.create failed:", e);
        throw new Error("windows.create failed: " + (e?.message || e));
    }
    console.log("[MB-bg] window created id=" + win.id + " tabs=" + (win.tabs && win.tabs.length));
    const tab = win.tabs && win.tabs[0];
    if (!tab) throw new Error("could not open booking window (no tab in window)");
    await new Promise((resolve) => {
        const onUpdated = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(onUpdated);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(onUpdated);
    });
    // Pequeno respiro pra MAPRO inicializar (add_service / jQuery registram late).
    await new Promise((r) => setTimeout(r, 800));
    return { winId: win.id, tabId: tab.id };
}

async function maproAddService({ reservaId, kind, price, date, dryRun }) {
    console.log("[MB-bg] mapro-add-service called:", { reservaId, kind, price, date, dryRun: !!dryRun });
    if (!reservaId) throw new Error("reservaId required");
    if (!kind) throw new Error("kind required (bbq|ph35|ph75|ph)");
    if (price == null || isNaN(Number(price))) throw new Error("price required (number)");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error("date required (YYYY-MM-DD)");

    const { winId, tabId } = await openBookingWindow(reservaId);
    try {
        // Content script may take a few hundred ms to register at document_idle.
        // Retry sendMessage until it succeeds or we give up.
        let result, lastErr;
        for (let attempt = 0; attempt < 8; attempt++) {
            try {
                result = await chrome.tabs.sendMessage(tabId, {
                    action: "mapro-add-service",
                    payload: { kind, price: Number(price), date, dryRun: !!dryRun },
                });
                break;
            } catch (e) {
                lastErr = e;
                await new Promise((r) => setTimeout(r, 400));
            }
        }
        if (!result) throw new Error("content script not reachable: " + (lastErr?.message || "unknown"));
        if (!result.ok) throw new Error(result.error || "content script returned error");
        return result.data;
    } finally {
        // Fecha a janela inteira (a aba é a única dela).
        chrome.windows.remove(winId).catch(() => {});
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
