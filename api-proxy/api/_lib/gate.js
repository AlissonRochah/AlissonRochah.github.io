// Server-side port of the gateaccess.net automation that used to run inside
// the extension's service worker. Moved here because the extension's
// chrome-extension:// origin was tripping some opaque ASP.NET 500 we
// couldn't diagnose. Vercel does plain Node fetch from a clean origin so
// the request looks identical to a normal browser submission.
//
// Flow: GET /login → POST /login → GET /GuestsDevices for each guest →
// POST <full-postback> Add → POST <DevExpress callback> UPDATEEDIT.

const GATE_BASE = "https://gateaccess.net";

// ---------- cookie jar ----------
// Native Node fetch doesn't have a cookie jar, so we thread cookies by hand.
// Only stores name → value (the only thing the server actually reads back).

class CookieJar {
    constructor() { this.cookies = new Map(); }
    absorb(headers) {
        const list = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
        for (const sc of list) {
            const semi = sc.indexOf(";");
            const pair = semi >= 0 ? sc.slice(0, semi) : sc;
            const eq = pair.indexOf("=");
            if (eq < 0) continue;
            const name = pair.slice(0, eq).trim();
            const value = pair.slice(eq + 1).trim();
            if (!name) continue;
            // Empty value with Max-Age=0 / Expires in past = deletion.
            if (value === "" || /max-age=0|expires=thu, 01 jan 1970/i.test(sc)) {
                this.cookies.delete(name);
            } else {
                this.cookies.set(name, value);
            }
        }
    }
    header() {
        return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
    }
}

// ---------- HTML / form helpers ----------

function decodeEntities(s) {
    return String(s)
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'");
}

function jsonForPost(obj) {
    return JSON.stringify(obj).replace(/"/g, "&quot;");
}

function parseHiddenInputs(html) {
    const inputs = {};
    const re = /<input\b([^>]*)>/gi;
    let m;
    while ((m = re.exec(html))) {
        const attrs = m[1];
        if (!/type\s*=\s*["']?hidden["']?/i.test(attrs)) continue;
        const nameMatch = /name\s*=\s*"([^"]*)"/i.exec(attrs) || /name\s*=\s*'([^']*)'/i.exec(attrs);
        const valueMatch = /value\s*=\s*"((?:[^"])*)"/i.exec(attrs) || /value\s*=\s*'([^']*)'/i.exec(attrs);
        if (nameMatch) {
            inputs[nameMatch[1]] = valueMatch ? decodeEntities(valueMatch[1]) : "";
        }
    }
    return inputs;
}

function extractGridStateLiteral(html) {
    const anchor = html.indexOf("'uniqueID':'ctl00$ContentPlaceHolder1$ASPxGridView1'");
    if (anchor < 0) return null;
    const idx = html.indexOf("'stateObject'", anchor);
    if (idx < 0) return null;
    let i = html.indexOf("{", idx);
    if (i < 0) return null;
    const start = i;
    let depth = 0, inStr = false, esc = false;
    for (; i < html.length; i++) {
        const c = html[i];
        if (esc) { esc = false; continue; }
        if (c === "\\") { esc = true; continue; }
        if (c === "'") { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === "{") depth++;
        else if (c === "}") { depth--; if (depth === 0) return html.slice(start, i + 1); }
    }
    return null;
}

function gridLiteralToFormValue(literal) {
    return literal.replace(/'/g, '"').replace(/"/g, "&quot;");
}

function gridLiteralKeys(literal) {
    if (!literal) return [];
    try { return (JSON.parse(literal.replace(/'/g, '"')).keys) || []; }
    catch (_) { return []; }
}

function extractDropdownValues(html) {
    const sel = html.match(/<select[^>]*name="[^"]*DropDownListClassic"[^>]*>([\s\S]*?)<\/select>/i);
    if (!sel) return null;
    const values = [];
    const re = /<option[^>]*value="([^"]*)"/gi;
    let m;
    while ((m = re.exec(sel[1])) !== null) values.push(m[1]);
    return values;
}

// ---------- date helpers ----------

function mmddyyyyParts(s) {
    const m = String(s || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    return { m: +m[1], d: +m[2], y: +m[3] };
}
function dateMs(s) {
    const p = mmddyyyyParts(s);
    return p ? Date.UTC(p.y, p.m - 1, p.d) : 0;
}
function dateShort(s) {
    const p = mmddyyyyParts(s);
    return p ? `${p.m}/${p.d}/${p.y}` : "";
}
function dateLongEv(s) {
    const p = mmddyyyyParts(s);
    if (!p) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(p.m)}/${pad(p.d)}/${p.y} 00:00:00`;
}

// ---------- callback / body builders ----------

function buildCallbackParam(guest, keys) {
    const ln = String(guest.lastName || "");
    const fn = String(guest.firstName || "");
    const startEv = dateLongEv(guest.startDate);
    const endEv   = dateLongEv(guest.endDate);
    const fields = [
        `3,${ln.length},${ln}`,
        `4,${fn.length},${fn}`,
        `5,${startEv.length},${startEv}`,
        `6,${endEv.length},${endEv}`,
        `10,-1,`,
        `11,5,false`,
    ];
    const evContent = `${fields.length};` + fields.join(";") + ";";
    const keysJson = JSON.stringify(keys || []);
    return (
        "c0:" +
        `EV|${evContent.length};${evContent};` +
        `KV|${keysJson.length};${keysJson};` +
        "CT|2;{};" +
        "CR|2;{};" +
        "GB|13;10|UPDATEEDIT;"
    );
}

function buildPostBody(inputs, overrides, callbackId, callbackParam, guest) {
    const sdShort = guest ? dateShort(guest.startDate) : "";
    const edShort = guest ? dateShort(guest.endDate)   : "";
    const sdMs    = guest ? dateMs(guest.startDate)    : 0;
    const edMs    = guest ? dateMs(guest.endDate)      : 0;
    const lastName  = guest ? (guest.lastName || "")  : "";
    const firstName = guest ? (guest.firstName || "") : "";

    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(inputs)) {
        if (k === "ctl00$ContentPlaceHolder1$ASPxGridView1") continue;
        body.append(k, v);
    }
    body.set("__EVENTTARGET", overrides.__EVENTTARGET || "");
    body.set("__EVENTARGUMENT", overrides.__EVENTARGUMENT || "");
    body.append("ctl00$ASPxBinaryImage1$State", jsonForPost({ uploadedFileName: "" }));
    body.append("ctl00$ASPxTabControl1", jsonForPost({ activeTabIndex: 5 }));
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1", inputs["ctl00$ContentPlaceHolder1$ASPxGridView1"] || "");
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXSE$State", jsonForPost({ rawValue: "" }));
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXSE", "");
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEFormState", jsonForPost({ windowsState: "0:0:-1:502:317:0:-10000:-10000:1:0:0:0" }));
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor3", lastName);
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor4", firstName);
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor5$State", jsonForPost({ rawValue: sdMs ? String(sdMs) : "N", useMinDateInsteadOfNull: false }));
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor5", sdShort);
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor5$DDDState", jsonForPost({ windowsState: "0:0:-1:0:0:0:-10000:-10000:1:0:0:0" }));
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor5$DDD$C", jsonForPost({ visibleDate: sdShort || "", initialVisibleDate: sdShort || "", selectedDates: [] }));
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor6$State", jsonForPost({ rawValue: edMs ? String(edMs) : "N", useMinDateInsteadOfNull: false }));
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor6", edShort);
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor6$DDDState", jsonForPost({ windowsState: "0:0:-1:0:0:0:-10000:-10000:1:0:0:0" }));
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor6$DDD$C", jsonForPost({ visibleDate: edShort || "", initialVisibleDate: edShort || "", selectedDates: [] }));
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor10", "");
    body.append("ctl00$ContentPlaceHolder1$ASPxGridView1$DXPEForm$DXEFL$DXEditor11", "U");
    body.append("ctl00$ContentPlaceHolder1$ASPxPopupControl2State", jsonForPost({ windowsState: "0:0:-1:0:0:0:-10000:-10000:1:0:0:0" }));
    body.append("ctl00$ContentPlaceHolder1$ASPxPopupControl2$ASPxPanel1$ASPxTextBox1$State", jsonForPost({ rawValue: "" }));
    body.append("ctl00$ContentPlaceHolder1$ASPxPopupControl2$ASPxPanel1$ASPxTextBox1", "");
    body.append("ctl00$ContentPlaceHolder1$ASPxHiddenField1", jsonForPost({ data: "12|#|#" }));
    body.append("ctl00$ContentPlaceHolder1$HiddenField1", "");
    body.append("ctl00$ContentPlaceHolder1$HiddenField2", "");
    body.append("ctl00$ContentPlaceHolder1$HiddenField3", "");
    if (callbackId) body.append("__CALLBACKID", callbackId);
    if (callbackParam) body.append("__CALLBACKPARAM", callbackParam);
    return body;
}

// ---------- request helpers (cookie-threaded fetch) ----------

async function jarFetch(jar, url, init = {}) {
    const headers = { ...(init.headers || {}) };
    const cookieHeader = jar.header();
    if (cookieHeader) headers["Cookie"] = cookieHeader;
    if (!headers["User-Agent"]) {
        headers["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
    }
    const res = await fetch(url, { ...init, headers, redirect: init.redirect || "manual" });
    jar.absorb(res.headers);
    return res;
}

// Follow up to N redirects manually so we can keep collecting Set-Cookie at
// each hop. Native fetch's redirect:"follow" doesn't expose intermediate
// Set-Cookie headers, which kills our login flow.
async function followRedirects(jar, res, init = {}, depth = 0) {
    if (depth > 4) return res;
    if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return res;
        const nextUrl = new URL(loc, GATE_BASE).toString();
        const next = await jarFetch(jar, nextUrl, { ...init, method: "GET", body: undefined });
        return followRedirects(jar, next, { ...init, method: "GET", body: undefined }, depth + 1);
    }
    return res;
}

// ---------- top-level flow ----------

export async function gateLogin(jar, creds) {
    const r1 = await jarFetch(jar, GATE_BASE + "/login.aspx", { method: "GET" });
    if (!r1.ok) throw new Error(`login GET HTTP ${r1.status}`);
    const html = await r1.text();
    const inputs = parseHiddenInputs(html);

    const ccOptions = extractDropdownValues(html);
    if (ccOptions && !ccOptions.includes(creds.communityCode)) {
        throw new Error(
            `communityCode "${creds.communityCode}" not in the login dropdown ` +
            `(${ccOptions.length} options). Fix the Community Code column in the gate-creds sheet for this house.`
        );
    }

    if (!/name="[^"]*ASPxRoundPanel1\$ButtonLogin"/i.test(html)) {
        throw new Error("login GET didn't return the expected form (no ButtonLogin)");
    }

    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(inputs)) body.append(k, v);
    body.set("__EVENTTARGET", "");
    body.set("__EVENTARGUMENT", "");
    body.append("ctl00$ContentPlaceHolder1$ASPxRoundPanel1$DropDownListClassic", creds.communityCode);
    body.append("ctl00$ContentPlaceHolder1$ASPxRoundPanel1$UserName", creds.username);
    body.append("ctl00$ContentPlaceHolder1$ASPxRoundPanel1$Password", creds.password);
    body.append("ctl00$ContentPlaceHolder1$ASPxRoundPanel1$ButtonLogin", "Login");

    const r2raw = await jarFetch(jar, GATE_BASE + "/login.aspx", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": GATE_BASE,
            "Referer": GATE_BASE + "/login.aspx",
        },
        body: body.toString(),
    });
    const r2 = await followRedirects(jar, r2raw, {});

    if (!r2.ok) {
        const peek = await r2.text().catch(() => "");
        throw new Error(`login POST HTTP ${r2.status}. body-head: ${peek.slice(0, 300).replace(/\s+/g, " ")}`);
    }
    if (/login\.aspx/i.test(r2.url)) {
        throw new Error(`login rejected — wrong username/password/communityCode (cc="${creds.communityCode}", user="${creds.username}")`);
    }
}

export async function gateFetchGuestPage(jar) {
    const r = await jarFetch(jar, GATE_BASE + "/GuestsDevices.aspx", {
        method: "GET",
        headers: { "Referer": GATE_BASE + "/overview.aspx" },
    });
    const final = await followRedirects(jar, r, {});
    if (!final.ok) throw new Error(`GuestsDevices GET HTTP ${final.status}`);
    if (/login\.aspx/i.test(final.url)) {
        throw new Error("session lost — guest page redirected to login");
    }
    const html = await final.text();
    const inputs = parseHiddenInputs(html);
    if (!inputs.__VIEWSTATE) throw new Error("guest page missing __VIEWSTATE");
    const stateLiteral = extractGridStateLiteral(html);
    if (stateLiteral) {
        inputs["ctl00$ContentPlaceHolder1$ASPxGridView1"] = gridLiteralToFormValue(stateLiteral);
    }
    return { html, inputs, stateLiteral };
}

export async function gateAddOneGuest(jar, g) {
    const page = await gateFetchGuestPage(jar);
    let inputs = page.inputs;
    let stateLiteral = page.stateLiteral;
    const keysBefore = new Set(gridLiteralKeys(stateLiteral));
    const alreadyEditing = /DXEFL_DXEditor3_I/.test(page.html);

    if (!alreadyEditing) {
        const addBody = buildPostBody(inputs, { __EVENTTARGET: "", __EVENTARGUMENT: "" }, null, null, null);
        addBody.append("ctl00$ContentPlaceHolder1$ASPxButton1", "Add a New Guest/FastAccess Pass");

        const addRaw = await jarFetch(jar, GATE_BASE + "/GuestsDevices.aspx", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Origin": GATE_BASE,
                "Referer": GATE_BASE + "/GuestsDevices.aspx",
            },
            body: addBody.toString(),
        });
        const addRes = await followRedirects(jar, addRaw, {});
        if (!addRes.ok) throw new Error(`Add postback HTTP ${addRes.status}`);
        const addHtml = await addRes.text();
        if (/login\.aspx/i.test(addRes.url)) throw new Error("Add postback redirected to login");
        const newInputs = parseHiddenInputs(addHtml);
        if (!newInputs.__VIEWSTATE) throw new Error("Add postback returned a page with no VIEWSTATE");
        if (!/DXEFL_DXEditor3_I/.test(addHtml)) {
            throw new Error("Add postback didn't open the edit form");
        }
        inputs = newInputs;
        stateLiteral = extractGridStateLiteral(addHtml);
        if (stateLiteral) {
            inputs["ctl00$ContentPlaceHolder1$ASPxGridView1"] = gridLiteralToFormValue(stateLiteral);
        }
    }
    const keys = gridLiteralKeys(stateLiteral);

    const sdShort = dateShort(g.startDate);
    const edShort = dateShort(g.endDate);
    if (!sdShort || !edShort) throw new Error("Bad date format (need MM/DD/YYYY)");

    const callbackParam = buildCallbackParam(g, keys);
    const updateBody = buildPostBody(
        inputs,
        { __EVENTTARGET: "", __EVENTARGUMENT: "" },
        "ctl00$ContentPlaceHolder1$ASPxGridView1",
        callbackParam,
        g,
    );

    const r = await jarFetch(jar, GATE_BASE + "/GuestsDevices.aspx", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": GATE_BASE,
            "Referer": GATE_BASE + "/GuestsDevices.aspx",
        },
        body: updateBody.toString(),
    });
    if (!r.ok) throw new Error(`Update HTTP ${r.status}`);
    const respText = await r.text();
    if (/login\.aspx/i.test(r.url)) throw new Error("logged out mid-request");
    const errMatch = respText.match(/'error':\{[^}]*'message':'([^']+)'/);
    if (errMatch) throw new Error("server: " + errMatch[1]);

    // Re-fetch and look for a new key.
    await new Promise((res) => setTimeout(res, 500));
    const verify = await jarFetch(jar, GATE_BASE + "/GuestsDevices.aspx", { method: "GET" });
    const verifyFinal = await followRedirects(jar, verify, {});
    const verifyHtml = await verifyFinal.text();
    const verifyLiteral = extractGridStateLiteral(verifyHtml);
    const keysVerify = gridLiteralKeys(verifyLiteral);
    const newKey = keysVerify.find((k) => !keysBefore.has(k));
    if (!newKey) {
        throw new Error("submitted but no new row appeared. Response: " + respText.slice(0, 200).replace(/\s+/g, " "));
    }
    return { key: newKey };
}

export async function gateAddGuests(creds, guests) {
    const jar = new CookieJar();
    await gateLogin(jar, creds);
    const results = [];
    for (const g of guests) {
        const lastName = String(g.lastName || "").trim();
        const firstName = String(g.firstName || "").trim();
        try {
            if (!lastName) throw new Error("missing last name");
            const r = await gateAddOneGuest(jar, { ...g, lastName, firstName });
            results.push({ lastName, firstName, ok: true, key: r.key, error: null });
        } catch (e) {
            results.push({ lastName, firstName, ok: false, error: String(e?.message || e) });
        }
    }
    return results;
}
