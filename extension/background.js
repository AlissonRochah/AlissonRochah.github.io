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

async function openBookingTab(reservaId) {
    // Open as a non-focused background tab in the current window. Visible in
    // the tab strip briefly but reliable across browsers (Brave was silently
    // failing on chrome.windows.create({state:"minimized"})).
    const url = `https://app.mapro.us/booking/reservation/${encodeURIComponent(reservaId)}`;
    console.log("[MB-bg] opening booking tab:", url);
    let tab;
    try {
        tab = await chrome.tabs.create({ url, active: false });
    } catch (e) {
        console.error("[MB-bg] chrome.tabs.create failed:", e);
        throw new Error("tabs.create failed: " + (e?.message || e));
    }
    console.log("[MB-bg] tab created id=" + tab.id);
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            reject(new Error("tab load timed out after 20s"));
        }, 20000);
        const onUpdated = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === "complete") {
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(onUpdated);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(onUpdated);
    });
    console.log("[MB-bg] tab loaded, waiting for MAPRO JS init...");
    await new Promise((r) => setTimeout(r, 800));
    return { tabId: tab.id };
}

async function maproAddService({ reservaId, kind, price, date, dryRun }) {
    console.log("[MB-bg] mapro-add-service called:", { reservaId, kind, price, date, dryRun: !!dryRun });
    if (!reservaId) throw new Error("reservaId required");
    if (!kind) throw new Error("kind required (bbq|ph35|ph75|ph)");
    if (price == null || isNaN(Number(price))) throw new Error("price required (number)");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error("date required (YYYY-MM-DD)");

    const { tabId } = await openBookingTab(reservaId);
    try {
        // Content script may take a few hundred ms to register at document_idle.
        // Retry sendMessage until it succeeds or we give up.
        let result, lastErr;
        for (let attempt = 0; attempt < 8; attempt++) {
            try {
                console.log(`[MB-bg] sendMessage attempt ${attempt + 1}/8`);
                result = await chrome.tabs.sendMessage(tabId, {
                    action: "mapro-add-service",
                    payload: { kind, price: Number(price), date, dryRun: !!dryRun },
                });
                console.log("[MB-bg] sendMessage result:", result);
                break;
            } catch (e) {
                lastErr = e;
                console.warn("[MB-bg] sendMessage failed, retrying:", e?.message || e);
                await new Promise((r) => setTimeout(r, 400));
            }
        }
        if (!result) throw new Error("content script not reachable: " + (lastErr?.message || "unknown"));
        if (!result.ok) throw new Error(result.error || "content script returned error");
        return result.data;
    } finally {
        // Fecha a aba só se foi criada por nós.
        chrome.tabs.remove(tabId).catch((e) => console.warn("[MB-bg] failed to close tab:", e));
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
