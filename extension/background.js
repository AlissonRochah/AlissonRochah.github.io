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
        console.log("[MB-bg] running pageRunner via chrome.scripting in MAIN world");
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: pageRunner,
            args: [{ kind, dryRun: !!dryRun }],
        });
        const wrapped = results && results[0] && results[0].result;
        console.log("[MB-bg] pageRunner returned:", wrapped);
        if (!wrapped) throw new Error("pageRunner returned no result");
        if (!wrapped.ok) throw new Error(wrapped.error || "pageRunner returned error");
        return wrapped.data;
    } finally {
        chrome.tabs.remove(tabId).catch((e) => console.warn("[MB-bg] failed to close tab:", e));
    }
}

// Runs in the booking page's MAIN world (has access to add_service, jQuery, uuid).
// Must be self-contained — no closures over outer variables.
async function pageRunner(cfg) {
    try {
        const { kind, dryRun } = cfg;
        const PATTERNS = {
            bbq:  /\bbbq\b/i,
            ph35: /(pool\s*heat.*35|ph\s*35)/i,
            ph75: /(pool\s*heat.*75|ph\s*75)/i,
            ph:   /pool\s*heat/i,
        };
        const pattern = PATTERNS[kind];
        if (!pattern) throw new Error("Unknown service kind: " + kind);

        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        // Wait for booking form to load
        const tForm = Date.now();
        while (Date.now() - tForm < 15000) {
            if (document.querySelector('form[data-ajax="booking-reservar"] select[name="id"]')) break;
            await sleep(150);
        }
        const sampleSelect = document.querySelector('form[data-ajax="booking-reservar"] select[name="id"]');
        if (!sampleSelect) throw new Error("Booking form did not load (15s)");

        const opt = Array.from(sampleSelect.options).find((o) => o.value && pattern.test(o.textContent));
        if (!opt) {
            const available = Array.from(sampleSelect.options).filter((o) => o.value).map((o) => o.textContent.trim());
            throw new Error(`No "${kind}" service. Available: ${available.join(" | ")}`);
        }
        const serviceId = opt.value;
        const serviceLabel = opt.textContent.trim();

        if (typeof window.add_service !== "function") throw new Error("MAPRO add_service is not defined");
        if (typeof window.uuid === "undefined" || !window.uuid.v4) throw new Error("MAPRO uuid is not defined");

        const before = document.querySelectorAll('form[data-ajax="booking-reservar"] .reservation-service-container').length;
        window.add_service({
            onlyActive: 1, servico_padrao: 0,
            valor: "0.00", valor_desconto: "0.00",
            valor_sale: "0.00", valor_tourist: "0.00",
            display: "none",
        }, window.uuid.v4());

        // Wait for new service container
        const tBlock = Date.now();
        while (Date.now() - tBlock < 5000) {
            if (document.querySelectorAll('form[data-ajax="booking-reservar"] .reservation-service-container').length > before) break;
            await sleep(100);
        }
        const containers = document.querySelectorAll('form[data-ajax="booking-reservar"] .reservation-service-container');
        if (containers.length <= before) throw new Error("Service block did not appear after add_service()");
        const newContainer = containers[containers.length - 1];
        const innerSel = newContainer.querySelector('select[name="id"]');
        if (!innerSel) throw new Error("New service has no select");

        const $ = window.jQuery || window.$;
        if ($) {
            $(innerSel).val(serviceId).trigger("change");
        } else {
            innerSel.value = serviceId;
            innerSel.dispatchEvent(new Event("change", { bubbles: true }));
        }
        await sleep(200);

        if (dryRun) {
            const fields = Array.from(newContainer.querySelectorAll("input,select,textarea"))
                .filter((i) => i.name)
                .map((i) => ({ name: i.name, value: i.value }));
            return { ok: true, data: { serviceId, serviceLabel, status: "dry-run", fields } };
        }

        const saveLink = Array.from(document.querySelectorAll('a.bt2[data-submit]'))
            .filter((a) => (a.textContent || "").trim() === "Save")
            .find((a) => a.offsetParent !== null);
        if (!saveLink) throw new Error("Save button not found");

        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        const init = { bubbles: true, cancelable: true, view: window, button: 0 };
        saveLink.dispatchEvent(new MouseEvent("mousedown", { ...init, buttons: 1 }));
        saveLink.dispatchEvent(new MouseEvent("mouseup", { ...init, buttons: 0 }));
        saveLink.dispatchEvent(new MouseEvent("click", { ...init, buttons: 0 }));

        const tWatch = Date.now();
        while (Date.now() - tWatch < 15000) {
            const errEls = Array.from(document.querySelectorAll(".f-erro.reserva-erro")).filter((el) => el.offsetParent !== null);
            const okEls = Array.from(document.querySelectorAll(".f-sucesso.reserva-sucesso")).filter((el) => el.offsetParent !== null);
            if (okEls.length) return { ok: true, data: { serviceId, serviceLabel, status: "saved" } };
            if (errEls.length) {
                const msg = errEls.map((el) => el.textContent.trim()).join(" | ");
                throw new Error("MAPRO error: " + msg);
            }
            await sleep(250);
        }
        throw new Error("Save timed out (15s)");
    } catch (e) {
        return { ok: false, error: String(e?.message || e) };
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
