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

async function maproAddService({ reservaId, kind, price, startDate, endDate, dryRun, force, checkOnly }) {
    console.log("[MB-bg] mapro-add-service called:", { reservaId, kind, price, startDate, endDate, dryRun: !!dryRun, force: !!force, checkOnly: !!checkOnly });
    if (!reservaId) throw new Error("reservaId required");
    if (!kind) throw new Error("kind required (bbq|ph)");
    if (price == null || isNaN(Number(price))) throw new Error("price required (number)");
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(startDate))) throw new Error("startDate required (YYYY-MM-DD)");
    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) throw new Error("endDate required (YYYY-MM-DD)");

    const { tabId } = await openBookingTab(reservaId);
    try {
        console.log("[MB-bg] running pageRunner via chrome.scripting in MAIN world");
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: pageRunner,
            args: [{ kind, startDate, endDate, dryRun: !!dryRun, force: !!force }],
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
        const { kind, startDate, endDate, dryRun, force } = cfg;
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        // Wait for booking form to load
        const tForm = Date.now();
        while (Date.now() - tForm < 15000) {
            if (document.querySelector('form[data-ajax="booking-reservar"] select[name="id"]')) break;
            await sleep(150);
        }
        const sampleSelect = document.querySelector('form[data-ajax="booking-reservar"] select[name="id"]');
        if (!sampleSelect) throw new Error("Booking form did not load (15s)");

        // Para BBQ: checa se já existe BBQ no mesmo dia ANTES de adicionar.
        // Se existe e não é force, retorna status:duplicate pra UI confirmar.
        if (kind === "bbq" && !force) {
            const existing = Array.from(document.querySelectorAll('form[data-ajax="booking-reservar"] .reservation-service-container'));
            for (const c of existing) {
                const sel = c.querySelector('select[name="id"]');
                const startInp = c.querySelector('input[name="start_date"]');
                if (!sel || !startInp) continue;
                const optEl = sel.options[sel.selectedIndex];
                const label = optEl ? (optEl.textContent || "").trim() : "";
                if (/\bbbq\b/i.test(label) && startInp.value === startDate) {
                    return { ok: true, data: { status: "duplicate", existingLabel: label, existingDate: startInp.value } };
                }
            }
        }

        // Service matching strategy varies per kind:
        //   bbq → first option containing "bbq"
        //   ph  → "pool heat" option whose label price > 0 (skips the $0 Variable one)
        const allOpts = Array.from(sampleSelect.options).filter((o) => o.value);
        const parsePrice = (text) => {
            const m = String(text || "").match(/\$\s*([\d.,]+)/);
            if (!m) return null;
            return parseFloat(m[1].replace(/,/g, ""));
        };
        let opt;
        if (kind === "bbq") {
            opt = allOpts.find((o) => /\bbbq\b/i.test(o.textContent));
        } else if (kind === "ph") {
            const phOpts = allOpts.filter((o) => /pool\s*heat/i.test(o.textContent));
            opt = phOpts.find((o) => {
                const p = parsePrice(o.textContent);
                return p != null && p > 0;
            });
            if (!opt && phOpts.length) {
                throw new Error("Pool Heat options found but none with price > 0: " + phOpts.map((o) => o.textContent.trim()).join(" | "));
            }
        } else {
            throw new Error("Unknown service kind: " + kind);
        }
        if (!opt) {
            const available = allOpts.map((o) => o.textContent.trim()).join(" | ");
            throw new Error(`No "${kind}" service. Available: ${available}`);
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

        // PH precisa de range (start/end). Sobreescreve as datas que MAPRO autopreencheu.
        // MAPRO provavelmente usa flatpickr/datepicker — tentamos múltiplas abordagens.
        const dateDebug = {};
        if (kind === "ph" && startDate && endDate) {
            // Snapshot de todos os inputs do bloco (debug pra entender quais existem)
            dateDebug.allInputs = Array.from(newContainer.querySelectorAll("input,select,textarea"))
                .filter((i) => i.name)
                .map((i) => ({ name: i.name, type: i.type, value: i.value }));

            const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            const setDate = (inp, iso, label) => {
                if (!inp) {
                    dateDebug[label] = "input not found";
                    return;
                }
                const before = inp.value;
                if (inp._flatpickr) {
                    try { inp._flatpickr.setDate(iso, true); }
                    catch (e) { dateDebug[label + "_fp_err"] = String(e?.message || e); }
                }
                try { nativeInputSetter.call(inp, iso); } catch (_) { inp.value = iso; }
                inp.dispatchEvent(new Event("input", { bubbles: true }));
                inp.dispatchEvent(new Event("change", { bubbles: true }));
                inp.dispatchEvent(new Event("blur", { bubbles: true }));
                if ($) {
                    try { $(inp).val(iso).trigger("change").trigger("blur"); } catch (_) {}
                }
                dateDebug[label + "_name"] = inp.name;
                dateDebug[label] = { before, requested: iso, after: inp.value };
            };

            // Tenta múltiplos seletores até achar o input certo:
            //  1. name$="[start_date]" (services[N][start_date])
            //  2. name="start_date"
            //  3. name contém "start" + "date"
            //  4. type=date e o primeiro do bloco
            const findInput = (kw) => {
                let inp = newContainer.querySelector(`input[name$="[${kw}]"]`);
                if (inp) return inp;
                inp = newContainer.querySelector(`input[name="${kw}"]`);
                if (inp) return inp;
                const re = new RegExp("\\b" + kw.replace("_", "[_\\s-]?") + "\\b", "i");
                inp = Array.from(newContainer.querySelectorAll("input"))
                    .find((i) => i.name && re.test(i.name));
                return inp || null;
            };
            const startInput = findInput("start_date");
            const endInput = findInput("end_date");
            setDate(startInput, startDate, "start");
            setDate(endInput, endDate, "end");
            await sleep(400);
            if (startInput) dateDebug.start_final = startInput.value;
            if (endInput) dateDebug.end_final = endInput.value;
            console.log("[MB-page] PH date set:", JSON.stringify(dateDebug));
        }

        if (dryRun) {
            const fields = Array.from(newContainer.querySelectorAll("input,select,textarea"))
                .filter((i) => i.name)
                .map((i) => ({ name: i.name, value: i.value }));
            return { ok: true, data: { serviceId, serviceLabel, status: "dry-run", fields, dateDebug } };
        }

        const saveLink = Array.from(document.querySelectorAll('a.bt2[data-submit]'))
            .filter((a) => (a.textContent || "").trim() === "Save")
            .find((a) => a.offsetParent !== null);
        if (!saveLink) throw new Error("Save button not found");

        // Hook XHR before clicking Save to capture the booking-reservar response
        // (more reliable than guessing what success/error DOM looks like).
        let bookingResp = null;
        let bookingErr = null;
        const origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (m, u) {
            if (u && /booking-reservar/.test(u)) {
                this.addEventListener("load", () => {
                    try { bookingResp = JSON.parse(this.responseText); }
                    catch (_) { bookingResp = { raw: (this.responseText || "").slice(0, 400) }; }
                });
                this.addEventListener("error", () => { bookingErr = "XHR network error"; });
            }
            return origOpen.apply(this, arguments);
        };

        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        const init = { bubbles: true, cancelable: true, view: window, button: 0 };
        saveLink.dispatchEvent(new MouseEvent("mousedown", { ...init, buttons: 1 }));
        saveLink.dispatchEvent(new MouseEvent("mouseup", { ...init, buttons: 0 }));
        saveLink.dispatchEvent(new MouseEvent("click", { ...init, buttons: 0 }));

        const tWatch = Date.now();
        while (Date.now() - tWatch < 10000) {
            if (bookingResp) {
                // MAPRO usually returns {status: true} on success
                if (bookingResp.status === true || bookingResp.success === true) {
                    return { ok: true, data: { serviceId, serviceLabel, status: "saved", dateDebug } };
                }
                throw new Error("MAPRO save failed: " + (bookingResp.msg || JSON.stringify(bookingResp).slice(0, 300)));
            }
            if (bookingErr) throw new Error(bookingErr);
            // Fallback DOM signals (in case XHR hook is racy):
            const errEls = Array.from(document.querySelectorAll(".f-erro.reserva-erro")).filter((el) => el.offsetParent !== null);
            const okEls = Array.from(document.querySelectorAll(".f-sucesso.reserva-sucesso")).filter((el) => el.offsetParent !== null);
            if (okEls.length) return { ok: true, data: { serviceId, serviceLabel, status: "saved" } };
            if (errEls.length) {
                const msg = errEls.map((el) => el.textContent.trim()).join(" | ");
                throw new Error("MAPRO error: " + msg);
            }
            await sleep(150);
        }
        throw new Error("Save: no XHR response within 10s");
    } catch (e) {
        return { ok: false, error: String(e?.message || e) };
    }
}

async function maproListServices({ reservaId }) {
    if (!reservaId) throw new Error("reservaId required");
    console.log("[MB-bg] mapro-list-services for reserva", reservaId);
    const { tabId } = await openBookingTab(reservaId);
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: async () => {
                try {
                    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
                    const tForm = Date.now();
                    while (Date.now() - tForm < 8000) {
                        if (document.querySelector('form[data-ajax="booking-reservar"] .reservation-service-container')) break;
                        await sleep(150);
                    }
                    const containers = document.querySelectorAll('form[data-ajax="booking-reservar"] .reservation-service-container');
                    const services = [];
                    for (const c of containers) {
                        const sel = c.querySelector('select[name="id"]');
                        const startInp = c.querySelector('input[name="start_date"]');
                        const endInp = c.querySelector('input[name="end_date"]');
                        if (!sel) continue;
                        const opt = sel.options[sel.selectedIndex];
                        services.push({
                            label: opt ? (opt.textContent || "").trim() : "",
                            value: sel.value,
                            start_date: startInp ? startInp.value : "",
                            end_date: endInp ? endInp.value : "",
                        });
                    }
                    return { ok: true, data: { services } };
                } catch (e) {
                    return { ok: false, error: String(e?.message || e) };
                }
            },
        });
        const wrapped = results && results[0] && results[0].result;
        if (!wrapped) throw new Error("listServices: no result");
        if (!wrapped.ok) throw new Error(wrapped.error || "listServices failed");
        return wrapped.data;
    } finally {
        chrome.tabs.remove(tabId).catch(() => {});
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

// ====================================================================
// GATE ACCESS (gateaccess.net) — Champions Gate guest submission.
// Reads credentials from a hardcoded Google Sheet using the user's own
// Google session cookies. Cache lives only in chrome.storage.local; no
// credentials ever leave the extension sandbox.
// ====================================================================

// Sheet ID from the URL: https://docs.google.com/spreadsheets/d/<ID>/edit
const GATE_SHEET_ID = "15rnSnXSX9jOkxR0Gn9teNs3WUJYIHeWf_RzN1hzDBRg";

const GATE_BASE = "https://gateaccess.net";
const GATE_CREDS_CACHE_KEY = "gateCredsCache";
const GATE_CREDS_TTL_MS = 24 * 60 * 60 * 1000;

function gateNormalizeHouse(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Minimal RFC-4180-ish CSV parser (handles quoted fields with commas/newlines).
function gateParseCsv(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuote) {
            if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
            else if (c === '"') { inQuote = false; }
            else { cur += c; }
        } else {
            if (c === '"') { inQuote = true; }
            else if (c === ',') { row.push(cur); cur = ""; }
            else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ""; }
            else if (c === '\r') { /* skip */ }
            else { cur += c; }
        }
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
}

async function gateFetchSheetCsv() {
    if (!GATE_SHEET_ID || GATE_SHEET_ID.startsWith("REPLACE_")) {
        throw new Error("GATE_SHEET_ID is not set in extension/background.js");
    }
    // Google bounces /export?format=csv → *.googleusercontent.com. Both hosts
    // need host_permissions in manifest.json so the redirect target also
    // bypasses CORS — otherwise the wildcard ACAO header on the userscontent
    // host clashes with credentials:include and the fetch is blocked.
    const url = `https://docs.google.com/spreadsheets/d/${GATE_SHEET_ID}/export?format=csv`;
    let res;
    try {
        res = await fetch(url, { credentials: "include" });
    } catch (e) {
        throw new Error(
            "Could not reach the Gate Access sheet. Reload the extension at " +
            "chrome://extensions, sign in to the Google account that owns the " +
            "sheet, and try again. Underlying error: " + (e?.message || e)
        );
    }
    if (!res.ok) {
        throw new Error(`Sheet HTTP ${res.status} — check the sheet ID and that the account has access`);
    }
    const text = await res.text();
    if (/<html/i.test(text.slice(0, 200))) {
        throw new Error("Sheet returned HTML instead of CSV — sign in to the right Google account, or check sheet permissions");
    }
    return text;
}

function gateBuildMap(csvText) {
    const rows = gateParseCsv(csvText);
    if (rows.length < 2) throw new Error("Sheet has no data rows");

    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
        const norm = rows[i].map(gateNormalizeHouse);
        const hasHouse = norm.some((c) => c === "house" || c.includes("house"));
        const hasUser  = norm.some((c) => c.includes("user"));
        const hasPass  = norm.some((c) => c.includes("password") || c === "pass");
        if (hasHouse && hasUser && hasPass) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) {
        const preview = rows.slice(0, 6).map((r) => r.join(" | ")).join("  //  ");
        throw new Error("Header row not found (expected HOUSE / USER NAME / PASSWORD). First rows: " + preview);
    }

    const header = rows[headerIdx].map(gateNormalizeHouse);
    const findCol = (...names) => {
        for (const n of names) {
            const idx = header.indexOf(gateNormalizeHouse(n));
            if (idx >= 0) return idx;
        }
        for (const n of names) {
            const target = gateNormalizeHouse(n);
            const idx = header.findIndex((c) => c.includes(target));
            if (idx >= 0) return idx;
        }
        return -1;
    };
    const houseCol = findCol("house");
    const resortCol = findCol("resort");
    const userCol = findCol("user name", "username", "user");
    const passCol = findCol("password", "pass");
    const ccCol = findCol("community code", "community", "cc");

    if (houseCol < 0 || userCol < 0 || passCol < 0) {
        throw new Error("Missing column. Header: " + header.join(" | "));
    }

    const map = {};
    for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        const house = (r[houseCol] || "").trim();
        const user = (r[userCol] || "").trim();
        const pass = (r[passCol] || "").trim();
        const resort = resortCol >= 0 ? (r[resortCol] || "").trim() : "";
        const cc = ccCol >= 0 ? (r[ccCol] || "").trim() : "";
        if (!house || !user || !pass) continue;
        // Champions Gate only — defensive filter even if the whole sheet is CG.
        if (resort && !/champions\s*gate/i.test(resort)) continue;
        map[gateNormalizeHouse(house)] = {
            house, resort, username: user, password: pass,
            communityCode: cc || "CG",
        };
    }
    return map;
}

async function gateGetCacheRaw() {
    const data = await chrome.storage.local.get(GATE_CREDS_CACHE_KEY);
    const cache = data[GATE_CREDS_CACHE_KEY];
    if (!cache || !cache.ts || !cache.map) return null;
    if (Date.now() - cache.ts > GATE_CREDS_TTL_MS) return null;
    return cache;
}

async function gateSetCache(map) {
    await chrome.storage.local.set({
        [GATE_CREDS_CACHE_KEY]: { ts: Date.now(), map },
    });
}

async function gateEnsureCreds() {
    let cache = await gateGetCacheRaw();
    if (cache) return { cached: true, houseCount: Object.keys(cache.map).length };
    const csv = await gateFetchSheetCsv();
    const map = gateBuildMap(csv);
    await gateSetCache(map);
    return { cached: false, houseCount: Object.keys(map).length, refreshed: true };
}

async function gateCredsStatus() {
    const cache = await gateGetCacheRaw();
    return {
        cached: !!cache,
        expiresAt: cache ? cache.ts + GATE_CREDS_TTL_MS : null,
        houseCount: cache ? Object.keys(cache.map).length : 0,
    };
}

async function gateCredsForHouse(house) {
    let cache = await gateGetCacheRaw();
    if (!cache) {
        const csv = await gateFetchSheetCsv();
        const map = gateBuildMap(csv);
        await gateSetCache(map);
        cache = { ts: Date.now(), map };
    }
    const key = gateNormalizeHouse(house);
    // 1. Exact match
    if (cache.map[key]) return cache.map[key];
    // 2. MAPRO uses "<number> <first-street-word>" (e.g. "453 Ocean") while
    //    the sheet has the full street ("453 Ocean Way"). Match by that prefix.
    const tokens = key.split(" ");
    if (tokens.length >= 2) {
        const prefix = tokens[0] + " " + tokens[1] + " ";
        for (const k of Object.keys(cache.map)) {
            if (k === key || k.startsWith(prefix)) return cache.map[k];
        }
    }
    // 3. Last-resort: leading number alone ("1601" → "1601 …")
    const numMatch = key.match(/^(\d+)/);
    if (numMatch) {
        const prefix = numMatch[1] + " ";
        for (const k of Object.keys(cache.map)) {
            if (k.startsWith(prefix)) return cache.map[k];
        }
    }
    throw new Error(`No gate credentials for "${house}". Make sure the house is in the sheet.`);
}

async function gateWaitTabLoad(tabId, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            reject(new Error("tab load timed out"));
        }, timeoutMs);
        const onUpdated = (id, info) => {
            if (id === tabId && info.status === "complete") {
                clearTimeout(t);
                chrome.tabs.onUpdated.removeListener(onUpdated);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(onUpdated);
    });
}

async function gateAddGuests({ house, guests }) {
    if (!house) throw new Error("house required");
    if (!Array.isArray(guests) || guests.length === 0) throw new Error("guests must be a non-empty array");

    const creds = await gateCredsForHouse(house);

    const tab = await chrome.tabs.create({
        url: GATE_BASE + "/login.aspx",
        active: false,
    });
    try {
        await gateWaitTabLoad(tab.id);
        await new Promise((r) => setTimeout(r, 500));

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            func: gatePageRunner,
            args: [{ creds, guests }],
        });
        const wrapped = results && results[0] && results[0].result;
        if (!wrapped) throw new Error("gatePageRunner returned no result");
        if (!wrapped.ok) throw new Error(wrapped.error);
        return wrapped.data;
    } finally {
        chrome.tabs.remove(tab.id).catch(() => {});
    }
}

// Runs in MAIN world of gateaccess.net. Logs in once, then loops through
// `guests` clicking Add → fill → Update for each.
async function gatePageRunner({ creds, guests }) {
    try {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const waitFor = async (sel, timeoutMs = 10000) => {
            const t0 = Date.now();
            while (Date.now() - t0 < timeoutMs) {
                const el = document.querySelector(sel);
                if (el && (el.offsetParent !== null || el.tagName === "SELECT")) return el;
                await sleep(120);
            }
            throw new Error("Timed out waiting for: " + sel);
        };

        // ----- Login (only on /login.aspx) -----
        if (/login\.aspx/i.test(location.pathname)) {
            const ccSel = await waitFor('#ctl00_ContentPlaceHolder1_ASPxRoundPanel1_DropDownListClassic');
            ccSel.value = creds.communityCode;
            ccSel.dispatchEvent(new Event("change", { bubbles: true }));
            const userInput = document.getElementById('ctl00_ContentPlaceHolder1_ASPxRoundPanel1_UserName_I');
            const passInput = document.getElementById('ctl00_ContentPlaceHolder1_ASPxRoundPanel1_Password_I');
            if (!userInput || !passInput) throw new Error("Login form not found");
            userInput.value = creds.username;
            passInput.value = creds.password;
            userInput.dispatchEvent(new Event("change", { bubbles: true }));
            passInput.dispatchEvent(new Event("change", { bubbles: true }));
            // The Login button is an ASP submit input
            const btn = document.getElementById('ctl00_ContentPlaceHolder1_ASPxRoundPanel1_ASPxButton1') ||
                        document.getElementById('ctl00_ContentPlaceHolder1_ASPxRoundPanel1_ASPxButton1_I');
            if (!btn) throw new Error("Login button not found");
            btn.click();
            const t0 = Date.now();
            while (Date.now() - t0 < 15000) {
                if (!/login\.aspx/i.test(location.pathname)) break;
                await sleep(200);
            }
            if (/login\.aspx/i.test(location.pathname)) {
                throw new Error("Login failed (still on login page) — wrong username/password/community?");
            }
        }

        // ----- Navigate to Guest List -----
        if (!/guests/i.test(location.pathname)) {
            location.href = "/GuestsDevices.aspx";
            const t0 = Date.now();
            while (Date.now() - t0 < 15000) {
                if (/guests/i.test(location.pathname)) break;
                await sleep(200);
            }
        }
        await waitFor('#ctl00_ContentPlaceHolder1_ASPxButton1_I');

        const results = [];
        for (let i = 0; i < guests.length; i++) {
            const g = guests[i];
            const lastName = String(g.lastName || "").trim();
            const firstName = String(g.firstName || "").trim();
            try {
                if (!lastName) throw new Error("missing last name");

                // Click "Add a New Guest/FastAccess Pass"
                const addBtn = document.getElementById('ctl00_ContentPlaceHolder1_ASPxButton1_I');
                if (!addBtn) throw new Error("Add button not found");
                addBtn.click();

                // Wait for the inline edit form
                await waitFor('#ctl00_ContentPlaceHolder1_ASPxGridView1_DXPEForm_DXEFL_DXEditor3_I');
                // Tiny breath for DevExpress to fully wire up
                await sleep(250);

                const setVal = (id, value) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.value = value || "";
                    el.dispatchEvent(new Event("input", { bubbles: true }));
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                    el.dispatchEvent(new Event("blur", { bubbles: true }));
                };
                setVal('ctl00_ContentPlaceHolder1_ASPxGridView1_DXPEForm_DXEFL_DXEditor3_I', lastName);
                setVal('ctl00_ContentPlaceHolder1_ASPxGridView1_DXPEForm_DXEFL_DXEditor4_I', firstName);
                setVal('ctl00_ContentPlaceHolder1_ASPxGridView1_DXPEForm_DXEFL_DXEditor5_I', g.startDate || '');
                setVal('ctl00_ContentPlaceHolder1_ASPxGridView1_DXPEForm_DXEFL_DXEditor6_I', g.endDate || '');
                setVal('ctl00_ContentPlaceHolder1_ASPxGridView1_DXPEForm_DXEFL_DXEditor10_I', g.notes || '');

                await sleep(200);

                // Click Update
                const updateBtn = document.getElementById('ctl00_ContentPlaceHolder1_ASPxGridView1_DXPEForm_DXEFL_DXCBtn60_I');
                if (!updateBtn) throw new Error("Update button not found");
                updateBtn.click();

                // Wait for the form to disappear (it's gone when the row was saved)
                const t0 = Date.now();
                let formGone = false;
                while (Date.now() - t0 < 12000) {
                    const editor = document.getElementById('ctl00_ContentPlaceHolder1_ASPxGridView1_DXPEForm_DXEFL_DXEditor3_I');
                    if (!editor || editor.offsetParent === null) { formGone = true; break; }
                    await sleep(250);
                }
                if (!formGone) throw new Error("Form did not close after Update — submit may have failed");

                // Verify in the rendered grid
                await sleep(500);
                const html = document.body.innerHTML;
                const verified = html.includes(lastName) && (firstName ? html.includes(firstName) : true);
                results.push({ lastName, firstName, ok: !!verified, error: verified ? null : "submitted but not visible in grid" });
            } catch (e) {
                results.push({ lastName, firstName, ok: false, error: String(e?.message || e) });
            }
        }
        return { ok: true, data: { results } };
    } catch (e) {
        return { ok: false, error: String(e?.message || e) };
    }
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
            if (msg.action === "mapro-list-services") {
                const data = await maproListServices(msg.payload || {});
                sendResponse({ ok: true, data });
                return;
            }
            if (msg.action === "gate-creds-status") {
                const data = await gateCredsStatus();
                sendResponse({ ok: true, data });
                return;
            }
            if (msg.action === "gate-ensure-creds") {
                const data = await gateEnsureCreds();
                sendResponse({ ok: true, data });
                return;
            }
            if (msg.action === "gate-add-guests") {
                const data = await gateAddGuests(msg.payload || {});
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
