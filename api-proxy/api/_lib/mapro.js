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
