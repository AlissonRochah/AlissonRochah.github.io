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
    return [street, city, tail].filter(Boolean).join(", ");
}
