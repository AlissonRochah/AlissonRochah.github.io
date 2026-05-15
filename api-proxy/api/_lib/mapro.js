import { getMaproCookie } from "./kv.js";

const MAPRO_BASE = "https://app.mapro.us";

export class MaproNotLoggedIn extends Error {
    constructor() {
        super("MAPRO_NOT_LOGGED_IN");
    }
}

async function maproFetchHtml(path) {
    const cookie = await getMaproCookie();
    if (!cookie) throw new MaproNotLoggedIn();

    const res = await fetch(MAPRO_BASE + path, {
        method: "GET",
        redirect: "manual",
        headers: {
            "Cookie": cookie,
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": "Mozilla/5.0 (compatible; MasterBotProxy/0.1)",
        },
    });

    if (res.status === 401 || res.status === 302 || res.status === 0) {
        throw new MaproNotLoggedIn();
    }
    if (!res.ok) throw new Error(`MAPRO ${res.status}`);
    return await res.text();
}

async function maproFetchJson(path) {
    const cookie = await getMaproCookie();
    if (!cookie) throw new MaproNotLoggedIn();
    const res = await fetch(MAPRO_BASE + path, {
        method: "GET",
        redirect: "manual",
        headers: {
            "Cookie": cookie,
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (compatible; MasterBotProxy/0.1)",
        },
    });
    if (res.status === 401 || res.status === 302 || res.status === 0) {
        throw new MaproNotLoggedIn();
    }
    if (!res.ok) throw new Error(`MAPRO ${res.status}`);
    return await res.json();
}

async function maproPostForm(path, body) {
    const cookie = await getMaproCookie();
    if (!cookie) throw new MaproNotLoggedIn();
    const res = await fetch(MAPRO_BASE + path, {
        method: "POST",
        redirect: "manual",
        headers: {
            "Cookie": cookie,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (compatible; MasterBotProxy/0.1)",
        },
        body,
    });
    if (res.status === 401 || res.status === 302 || res.status === 0) {
        throw new MaproNotLoggedIn();
    }
    if (!res.ok) throw new Error(`MAPRO ${res.status}`);
    return await res.json();
}

function extractLocalDataArray(html) {
    const m = html.match(/localData\s*=\s*\[/);
    if (!m) throw new Error("localData not found in MAPRO response");
    const startIdx = m.index + m[0].length - 1;

    let depth = 0;
    let inStr = false;
    let strCh = "";
    let escNext = false;
    let endIdx = -1;
    for (let i = startIdx; i < html.length; i++) {
        const c = html[i];
        if (escNext) { escNext = false; continue; }
        if (inStr) {
            if (c === "\\") { escNext = true; continue; }
            if (c === strCh) inStr = false;
            continue;
        }
        if (c === '"' || c === "'") { inStr = true; strCh = c; continue; }
        if (c === "[") depth++;
        else if (c === "]") {
            depth--;
            if (depth === 0) { endIdx = i; break; }
        }
    }
    if (endIdx === -1) throw new Error("localData array not closed");

    return JSON.parse(html.slice(startIdx, endIdx + 1));
}

const UNIT_FIELDS = [
    "key", "idMAPRO", "code", "title", "image",
    "homeowner", "responsible", "cleaner",
    "resort", "address", "County",
    "BedroomCount", "BathroomCount", "MaxOccupancy", "Layoutbeds", "total_living_area_sqft",
    "Type", "Contract", "status", "petFriendly",
    "wifiNetworkName", "wifiNetworkPassword",
    "gatePassword", "doorPassword", "lockboxCode", "BBQDoorCode",
    "cityLicenseNumber", "TouristTaxAccountNumber",
];

function pickFields(item) {
    const out = {};
    for (const k of UNIT_FIELDS) {
        if (k in item) out[k] = item[k];
    }
    if (Array.isArray(item.menu) && item.menu[0]?.url) {
        const m = item.menu[0].url.match(/#([0-9A-Z]{26})/);
        if (m) out.ulid = m[1];
    }
    return out;
}

export async function listUnits() {
    const html = await maproFetchHtml("/manage/houses/list");
    const all = extractLocalDataArray(html);
    return all.map(pickFields);
}

const EXTRA_SERVICE_IDS = { bbq: 6969, ph35: 6960, ph75: 6704 };

async function fetchCheckedPropertyIds(serviceId) {
    const html = await maproFetchHtml(`/settings/services/register/${serviceId}`);
    const re = /<input\s+checked[^>]*id="casa-(\d+)"/g;
    const ids = new Set();
    for (const m of html.matchAll(re)) ids.add(m[1]);
    return ids;
}

export async function listExtras() {
    const [bbq, ph35, ph75] = await Promise.all([
        fetchCheckedPropertyIds(EXTRA_SERVICE_IDS.bbq),
        fetchCheckedPropertyIds(EXTRA_SERVICE_IDS.ph35),
        fetchCheckedPropertyIds(EXTRA_SERVICE_IDS.ph75),
    ]);
    return { bbq, ph35, ph75 };
}

export async function listResorts() {
    const html = await maproFetchHtml("/manage/houses/resort/list");
    const all = extractLocalDataArray(html);
    const map = new Map();
    for (const r of all) {
        const title = (r.title || "").trim();
        const address = (r.address || "").trim();
        if (!title || !address || address === ".") continue;
        map.set(title, address);
    }
    return map;
}

function inputValue(html, name) {
    const re = new RegExp(`<input[^>]*name="${name}"[^>]*value="([^"]*)"`, "i");
    const m = html.match(re);
    return m ? m[1] : "";
}

function textareaValueById(html, id) {
    const re = new RegExp(`<textarea\\b[^>]*?\\bid="${id}"[^>]*?>([\\s\\S]*?)</textarea>`, "i");
    const m = html.match(re);
    if (!m) return "";
    return decodeHtmlEntities(m[1]).trim();
}

function decodeHtmlEntities(s) {
    return String(s)
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
        .replace(/&amp;/g, "&");
}

function titleCase(s) {
    return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function stateAbbr(s) {
    if (!s) return "";
    if (s.length === 2) return s.toUpperCase();
    if (/florida/i.test(s)) return "FL";
    return s;
}

export async function getUnitAddress(id) {
    const html = await maproFetchHtml(`/manage/houses/register/${id}`);
    const street = inputValue(html, "endereco");
    const city = titleCase(inputValue(html, "cidade"));
    const state = stateAbbr(inputValue(html, "estado"));
    const zip = inputValue(html, "cep");
    const tail = [state, zip].filter(Boolean).join(" ");
    const address = [street, city, tail].filter(Boolean).join(", ");
    const description = textareaValueById(html, "descricao_en");
    return { address, description };
}

function parseChannel(title) {
    const t = String(title || "");
    const inParens = t.match(/\(([^)]+)\)/);
    if (inParens) return inParens[1].trim();
    const parts = t.split(/\s+-\s+/);
    if (parts.length >= 3) return parts.slice(1, -1).join(" - ").trim();
    return "";
}

function inputValueByName(html, name) {
    const re = new RegExp(`<input\\b[^>]*?\\bname="${name}"[^>]*?\\bvalue="([^"]*)"|<input\\b[^>]*?\\bvalue="([^"]*)"[^>]*?\\bname="${name}"`, "i");
    const m = html.match(re);
    return m ? (m[1] ?? m[2] ?? "") : "";
}

async function fetchReservationExtras(linkPath) {
    try {
        const html = await maproFetchHtml(linkPath);
        const door = (html.match(/listagem-door-code[^>]*>\s*([^<]+?)\s*</) || [])[1] || inputValueByName(html, "codigo_guest");
        const confirmation = inputValueByName(html, "cod_refente_integrador");
        return { doorCode: door.trim(), confirmation: confirmation.trim() };
    } catch (_) {
        return { doorCode: "", confirmation: "" };
    }
}

function reservaIdFromLink(link) {
    if (!link) return null;
    const s = String(link);
    const m1 = s.match(/\/booking\/reservation\/(\d+)/);
    if (m1) return m1[1];
    const m2 = s.match(/\/(\d+)(?:[/?#].*)?$/);
    if (m2) return m2[1];
    return null;
}

async function shapeStay(r) {
    if (!r) return null;
    const extras = r.l ? await fetchReservationExtras(r.l) : { doorCode: "", confirmation: "" };
    const idFromLink = reservaIdFromLink(r.l);
    return {
        id: idFromLink || r.ri,
        guest: r.g,
        channel: parseChannel(r.t),
        ci: r.ci,
        co: r.co,
        link: r.l,
        doorCode: extras.doorCode,
        confirmation: extras.confirmation,
    };
}

// Find a booking by Airbnb confirmation code (HM…). The DataTables-style
// endpoint accepts a `filter=["field","operator","value"]` triple — we ask
// it to find rows whose codReference contains the code. Returns the first
// matching bookingID (or null).
export async function findBookingByConfirmationCode(code) {
    const filter = JSON.stringify(["codReference", "contains", code]);
    const path =
        `/booking/check-reservation?gridAjax&skip=0&take=20` +
        `&requireTotalCount=false&filter=${encodeURIComponent(filter)}`;
    const json = await maproFetchJson(path);
    const items = Array.isArray(json?.items) ? json.items : [];
    // codReference is per-row — match exactly when possible, else accept
    // the first row (substring match would only return rows where the
    // code is contained anyway).
    const want = String(code || "").trim().toUpperCase();
    const exact = items.find((r) => String(r.codReference || "").trim().toUpperCase() === want);
    const hit = exact || items[0] || null;
    if (!hit) return null;
    return {
        bookingId: String(hit.bookingID || hit.key || ""),
        codReference: hit.codReference || "",
        guest: hit.guest || "",
        checkin: hit.checkin || "",
        checkout: hit.checkout || "",
    };
}

// The booking page hardcodes the reservation ULID into the messaging JS.
// Pull it out so we can call /api/messaging/post_sales_channel_message.
export async function getReservationUlid(bookingId) {
    const html = await maproFetchHtml(`/booking/reservation/${encodeURIComponent(bookingId)}`);
    const m = html.match(/post_sales_channel_message[\s\S]{0,400}?['"]reservation_id['"]\s*:\s*['"]([0-9A-Z]{26})['"]/);
    if (m) return m[1];
    // Fallback: any ULID followed by /api/messaging/fetch_state on the page
    const m2 = html.match(/\/api\/messaging\/fetch_state\/([0-9A-Z]{26})/);
    return m2 ? m2[1] : null;
}

export async function sendChannelMessage(reservationUlid, body) {
    const form = new URLSearchParams();
    form.append("reservation_id", reservationUlid);
    form.append("body", body);
    const json = await maproPostForm("/api/messaging/post_sales_channel_message", form.toString());
    return json;
}

export async function getUnitStays(key, referenceDate) {
    const ref = referenceDate ? new Date(referenceDate + "T12:00:00").getTime() : Date.now();
    const lookbackFrom = Math.min(Date.now(), ref);
    const start = new Date(lookbackFrom - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const path = `/calendar/reservation?start=${start}&properties=${encodeURIComponent(key)}&single_property=1`;
    const text = await maproFetchHtml(path);
    let data;
    try { data = JSON.parse(text); } catch (_) { return { active: null, previous: null, next: null }; }
    const list = Array.isArray(data?.[key]) ? data[key] : [];
    const guests = list.filter((r) => r.rt === "g");
    const ts = (s) => new Date(String(s).replace(" ", "T")).getTime();
    const active = guests.find((r) => ts(r.ci) <= ref && ref < ts(r.co)) || null;
    const previous = guests
        .filter((r) => ts(r.co) < ref)
        .sort((a, b) => ts(b.co) - ts(a.co))[0] || null;
    const next = active ? null : (guests
        .filter((r) => ts(r.ci) > ref)
        .sort((a, b) => ts(a.ci) - ts(b.ci))[0] || null);
    const [a, p, n] = await Promise.all([shapeStay(active), shapeStay(previous), shapeStay(next)]);
    return { active: a, previous: p, next: n };
}

// ------------- bulk message: scan + send -------------

// Canonical match key for an address: "<number> <first-street-word>"
// (e.g. "16280 saint"). The first street word is the distinctive part —
// "Rd"/"Street"/etc. come last and never collide — so this survives
// "Saint Martin St" vs "St Martin Street" without abbreviation tables.
function addrKey(s) {
    const m = String(s || "").trim().toLowerCase().match(/(\d+)\s+([a-z]+)/);
    return m ? `${m[1]} ${m[2]}` : null;
}

// Today's date in Florida (the resorts' timezone), as YYYY-MM-DD.
function floridaToday() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function unitLabel(u) {
    return String(u.code || u.title || u.address || "").trim();
}

// One /calendar/reservation call for many properties. The endpoint
// accepts a comma-joined `properties` list and returns a JSON object
// keyed by property ULID.
async function fetchCalendarMulti(ulids, start) {
    const path = `/calendar/reservation?start=${start}&properties=${ulids.join(",")}`;
    const text = await maproFetchHtml(path);
    try { return JSON.parse(text); } catch (_) { return {}; }
}

// Resolve a list of addresses to MAPRO units via the "<number>
// <street-word>" key. Returns { matched: [{address, unit}], notFound }.
function matchAddressesToUnits(addresses, units) {
    const byKey = new Map();
    for (const u of units) {
        for (const field of [u.address, u.title, u.code]) {
            const k = addrKey(field);
            if (!k) continue;
            if (!byKey.has(k)) byKey.set(k, []);
            const arr = byKey.get(k);
            if (!arr.includes(u)) arr.push(u);
        }
    }
    const matched = [];
    const notFound = [];
    for (const raw of addresses) {
        const k = addrKey(raw);
        const hits = k ? byKey.get(k) : null;
        // No match, or ambiguous (same key → >1 unit) → notFound.
        if (!hits || hits.length !== 1) { notFound.push(raw); continue; }
        matched.push({ address: raw, unit: hits[0] });
    }
    return { matched, notFound };
}

function shapeAirbnbItem(address, unit, r) {
    const channel = parseChannel(r.t);
    return {
        item: {
            address,
            unit: unitLabel(unit || {}),
            guest: r.g || "",
            checkin: r.ci || "",
            checkout: r.co || "",
            channel,
            bookingId: reservaIdFromLink(r.l),
        },
        isAirbnb: /airbnb/i.test(channel),
    };
}

// Bulk scan. Sources:
//   - "addresses": match a pasted address list to units.
//   - "resort":   take every unit whose `resort` field equals the pick.
//   - "codes":    each Airbnb confirmation code is one exact reservation;
//                 the mode/date selector does not apply.
// Modes (addresses/resort only): "checkin" = reservation checking in on
// `date`; "inhouse" = reservation spanning `date` (ci ≤ date < co).
// Returns { day, mode, source, airbnb, notAirbnb, noMatch, notFound }.
export async function bulkScan({ source, addresses, codes, resort, mode, date }) {
    const day = date || floridaToday();

    // ---- codes: one exact reservation per confirmation code ----
    if (source === "codes") {
        const list = (codes || []).map((c) => String(c || "").trim()).filter(Boolean);
        const airbnb = [], notFound = [];
        const CONC = 6;
        for (let i = 0; i < list.length; i += CONC) {
            const chunk = list.slice(i, i + CONC);
            const out = await Promise.all(chunk.map(async (code) => {
                try {
                    const b = await findBookingByConfirmationCode(code);
                    return b && b.bookingId ? { code, booking: b } : { code, booking: null };
                } catch (_) { return { code, booking: null }; }
            }));
            for (const o of out) {
                if (o.booking) {
                    airbnb.push({
                        address: o.booking.codReference || o.code,
                        unit: "",
                        guest: o.booking.guest || "",
                        checkin: o.booking.checkin || "",
                        checkout: o.booking.checkout || "",
                        channel: "Airbnb",
                        bookingId: o.booking.bookingId,
                    });
                } else {
                    notFound.push(o.code);
                }
            }
        }
        return { day, mode: "codes", source, airbnb, notAirbnb: [], noMatch: [], notFound };
    }

    // ---- addresses / resort: resolve to a set of units ----
    const units = await listUnits();
    let matched = [];
    let notFound = [];

    if (source === "resort") {
        const want = String(resort || "").toLowerCase().trim();
        const hit = units.filter((u) => String(u.resort || "").toLowerCase().trim() === want);
        matched = hit.map((u) => ({ address: unitLabel(u), unit: u }));
        if (matched.length === 0) notFound = [resort || "(no resort selected)"];
    } else {
        const r = matchAddressesToUnits(addresses || [], units);
        matched = r.matched;
        notFound = r.notFound;
    }

    // Lookback 90 days so "in the house" catches stays that began earlier.
    const startD = new Date(day + "T12:00:00");
    startD.setDate(startD.getDate() - 90);
    const start = startD.toISOString().slice(0, 10);
    const ulids = matched.map((m) => m.unit.ulid).filter(Boolean);
    const cal = ulids.length ? await fetchCalendarMulti(ulids, start) : {};

    const refTs = new Date(day + "T12:00:00").getTime();
    const ts = (s) => new Date(String(s).replace(" ", "T")).getTime();

    const airbnb = [], notAirbnb = [], noMatch = [];
    for (const m of matched) {
        const list = (Array.isArray(cal[m.unit.ulid]) ? cal[m.unit.ulid] : []).filter((r) => r.rt === "g");
        const r = mode === "inhouse"
            ? list.find((x) => ts(x.ci) <= refTs && refTs < ts(x.co))
            : list.find((x) => String(x.ci || "").slice(0, 10) === day);
        if (!r) { noMatch.push({ address: m.address, unit: unitLabel(m.unit) }); continue; }
        const { item, isAirbnb } = shapeAirbnbItem(m.address, m.unit, r);
        (isAirbnb ? airbnb : notAirbnb).push(item);
    }
    return { day, mode: mode === "inhouse" ? "inhouse" : "checkin", source, airbnb, notAirbnb, noMatch, notFound };
}

// Send a list of { bookingId, body } messages, 5 at a time. Each send
// resolves the reservation ULID from the booking page, then posts.
export async function bulkSend(sends) {
    const results = [];
    const CONC = 5;
    for (let i = 0; i < sends.length; i += CONC) {
        const chunk = sends.slice(i, i + CONC);
        const out = await Promise.all(chunk.map(async (s) => {
            try {
                const ulid = await getReservationUlid(s.bookingId);
                if (!ulid) return { bookingId: s.bookingId, ok: false, error: "no messaging ULID — channel not connected" };
                const res = await sendChannelMessage(ulid, s.body);
                if (!res || res.status === 0 || res.status === false) {
                    return { bookingId: s.bookingId, ok: false, error: res?.error || "MAPRO rejected the message" };
                }
                return { bookingId: s.bookingId, ok: true };
            } catch (e) {
                return { bookingId: s.bookingId, ok: false, error: String(e?.message || e) };
            }
        }));
        results.push(...out);
    }
    return results;
}
