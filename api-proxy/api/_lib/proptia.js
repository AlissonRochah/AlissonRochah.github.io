// portal.proptia.com (Windsor Island Resort) — server-side flow.
//
// Captured by hand against the live portal:
//   1. GET  /en-us/login/{slug}                — gets csrfmiddlewaretoken
//   2. POST /en-us/login/{slug}                — auth, 302 → chooser
//   3. GET  /en-us/proptia/organization/chooser?org_direct={orgUUID}
//        — page lists every property the account has access to. Each
//          property is an <a id="choice-N" onclick="updateUser('orgUUID',
//          'orgRoleUUID', 'propertyUUID', 'choice-N')">{address}</a>.
//   4. POST /en-us/proptia/organization/chooser
//        body: parent_org=&org_role=&property=  (URL-encoded)
//        302 → /en-us/{property}/{org}/{role} → 302 → resident dashboard
//   5. GET  /en-us/resident/resident/dashboard/{property}/{org}/{role}
//        — has the "Add Visitor" link with residentUUID baked in.
//   6. GET  /en-us/resident/resident/{resident}/visitors/{property}/add/{org}/{role}?next=...
//        — Add Visitor form. Has csrf token + pass_name <select>.
//   7. POST same URL with the visitor data. Server returns 302 on success.
//
// Cookies are required across all of those. Login sets sessionid + csrf.
// We thread cookies manually because Node's fetch has no jar.

const BASE = "https://portal.proptia.com";

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
    get(name) { return this.cookies.get(name); }
}

const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Chromium";v="147", "Not.A/Brand";v="8"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
};

async function jarFetch(jar, url, init = {}) {
    const headers = { ...DEFAULT_HEADERS, ...(init.headers || {}) };
    const cookieHeader = jar.header();
    if (cookieHeader) headers["Cookie"] = cookieHeader;
    const res = await fetch(url, { ...init, headers, redirect: init.redirect || "manual" });
    jar.absorb(res.headers);
    return res;
}

async function followRedirects(jar, res, maxHops = 5) {
    let cur = res;
    for (let i = 0; i < maxHops; i++) {
        if (cur.status < 300 || cur.status >= 400) return cur;
        const loc = cur.headers.get("location");
        if (!loc) return cur;
        const next = await jarFetch(jar, new URL(loc, BASE).toString(), { method: "GET" });
        cur = next;
    }
    return cur;
}

function parseCsrf(html) {
    const m = html.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/i);
    return m ? m[1] : null;
}

// ------------- step 1+2: login -------------

export async function proptiaLogin(jar, slug, email, password) {
    const loginUrl = `${BASE}/en-us/login/${slug}`;
    const r1 = await jarFetch(jar, loginUrl, { method: "GET" });
    if (!r1.ok) throw new Error(`login GET HTTP ${r1.status}`);
    const html1 = await r1.text();
    const csrf = parseCsrf(html1);
    if (!csrf) throw new Error("login GET: no csrfmiddlewaretoken");

    const body = new URLSearchParams();
    body.append("csrfmiddlewaretoken", csrf);
    body.append("login", email);
    body.append("password", password);
    body.append("remember", "on");
    // The form has a hidden geoclient input. Empty value works in practice.
    body.append("geoclient", "");

    const r2 = await jarFetch(jar, loginUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": BASE,
            "Referer": loginUrl,
        },
        body: body.toString(),
    });
    // Login redirects (302) → chooser. Follow to land somewhere stable.
    const final = await followRedirects(jar, r2);
    if (!final.ok) throw new Error(`login POST HTTP ${final.status}`);
    if (/login/i.test(final.url)) {
        throw new Error(`login rejected — wrong email/password (${email})`);
    }
    return final.url;
}

// ------------- step 3: chooser → list properties -------------

const CHOICE_RE = /<a\s+onclick="[^"]*updateUser\('([0-9a-f-]+)',\s*'([0-9a-f-]+)',\s*'([0-9a-f-]+)'[^"]*"\s+href="javascript:void\(0\)"\s+id="(choice-\d+)"[^>]*>\s*([\s\S]*?)<\/a>/gi;

export async function proptiaListProperties(jar, orgUUID) {
    const url = `${BASE}/en-us/proptia/organization/chooser?org_direct=${orgUUID}`;
    const r = await jarFetch(jar, url, { method: "GET" });
    if (!r.ok) throw new Error(`chooser GET HTTP ${r.status}`);
    const html = await r.text();
    const properties = [];
    let m;
    CHOICE_RE.lastIndex = 0;
    while ((m = CHOICE_RE.exec(html)) !== null) {
        const [, parentOrg, orgRole, property, choiceId, label] = m;
        properties.push({
            choiceId,
            parentOrg,
            orgRole,
            property,
            label: label.replace(/\s+/g, " ").trim(),
        });
    }
    return properties;
}

// ------------- step 4: pick a property -------------

export async function proptiaPickProperty(jar, parentOrg, orgRole, property) {
    const url = `${BASE}/en-us/proptia/organization/chooser`;
    const body = new URLSearchParams();
    body.append("parent_org", parentOrg);
    body.append("org_role", orgRole);
    body.append("property", property);
    const r = await jarFetch(jar, url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": BASE,
            "Referer": `${url}?org_direct=${parentOrg}`,
            "X-Requested-With": "XMLHttpRequest",
        },
        body: body.toString(),
    });
    if (!r.ok) throw new Error(`chooser POST HTTP ${r.status}`);
    // Tail-trigger the dashboard nav so the server completes session setup.
    const dashUrl = `${BASE}/en-us/${property}/${parentOrg}/${orgRole}`;
    const r2 = await jarFetch(jar, dashUrl, { method: "GET" });
    await followRedirects(jar, r2);
    return {
        dashboardUrl: `${BASE}/en-us/resident/resident/dashboard/${property}/${parentOrg}/${orgRole}`,
    };
}

// ------------- step 5+6: locate Add Visitor URL -------------

export async function proptiaGetAddVisitorContext(jar, dashboardUrl, orgUUID, orgRoleUUID, propertyUUID) {
    const r = await jarFetch(jar, dashboardUrl, { method: "GET" });
    if (!r.ok) throw new Error(`dashboard GET HTTP ${r.status}`);
    const html = await r.text();
    // Add Visitor link looks like:
    //   /en-us/resident/resident/{resident}/visitors/{property}/add/{org}/{role}?next=...
    const addMatch = html.match(
        new RegExp(
            `/en-us/resident/resident/([0-9a-f-]+)/visitors/${propertyUUID}/add/${orgUUID}/${orgRoleUUID}`,
            "i"
        )
    );
    if (!addMatch) throw new Error("dashboard: Add Visitor link not found");
    const residentUUID = addMatch[1];
    const next = `/en-us/resident/resident/dashboard/${propertyUUID}/${orgUUID}/${orgRoleUUID}`;
    const addUrl = `${BASE}/en-us/resident/resident/${residentUUID}/visitors/${propertyUUID}/add/${orgUUID}/${orgRoleUUID}?next=${encodeURIComponent(next)}`;

    const r2 = await jarFetch(jar, addUrl, { method: "GET" });
    if (!r2.ok) throw new Error(`Add Visitor GET HTTP ${r2.status}`);
    const formHtml = await r2.text();
    const csrf = parseCsrf(formHtml);
    if (!csrf) throw new Error("Add Visitor GET: no csrf");
    // Pick the right pass — prefer STR / guest / selected over the first
    // option, since some properties offer Vendor / Interviewee passes
    // that the server then rejects with "Invalid Pass".
    const passSelectMatch = formHtml.match(/<select[^>]*name="pass_name"[^>]*>([\s\S]*?)<\/select>/i);
    const passName = passSelectMatch ? pickPassFromSelect(passSelectMatch[1]) : null;
    if (!passName) throw new Error("Add Visitor GET: no usable pass_name option");
    return { residentUUID, addUrl, csrf, passName };
}

// ------------- step 7: submit a visitor -------------

function fmtDate(mmddyyyy) {
    // Accept M/D/YYYY or MM/DD/YYYY, return MM/DD/YYYY (Proptia format).
    const m = String(mmddyyyy || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) throw new Error(`bad date: ${mmddyyyy}`);
    return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
}

export async function proptiaSubmitVisitor(jar, ctx, visitor) {
    const body = new URLSearchParams();
    body.append("csrfmiddlewaretoken", ctx.csrf);
    body.append("guest_type", "TEMPORARY");
    body.append("visitor_of", "INDIVIDUAL");
    body.append("event_visitor", "new_list");
    body.append("visitor_type", "GUEST");
    body.append("pass_name", ctx.passName);
    body.append("event", "");
    body.append("limit_event_approval", "0");
    body.append("limit_member_event_approval", "");
    body.append("restricted_visitor", "new");
    body.append("visitor", "");
    body.append("imported_guests_json", "");
    body.append("first_name", visitor.firstName || "");
    body.append("last_name", visitor.lastName || "");
    body.append("email", visitor.email || "");
    body.append("phone", visitor.phone || "");
    body.append("company", "");
    body.append("vehicle_license_plate", visitor.licensePlate || "");
    body.append("vehicle_space_input", "");
    body.append("notes", visitor.notes || "");
    body.append("identification", "");
    // Mon–Sun valid (1=Mon … 7=Sun in Proptia's model).
    for (const d of [1, 2, 3, 4, 5, 6, 7]) body.append("valid_pass_days_of_week", String(d));
    body.append("arrival_date_time", fmtDate(visitor.startDate));
    body.append("departure_date_time", fmtDate(visitor.endDate));
    body.append("approved_thru_date", fmtDate(visitor.endDate));
    body.append("event_date", "");
    body.append("event_time_start", "");
    body.append("event_time_end", "");
    body.append("total_duration", "");

    const r = await jarFetch(jar, ctx.addUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": BASE,
            "Referer": ctx.addUrl,
        },
        body: body.toString(),
    });
    // Success = 302 → next URL. Failure = 200 with form re-rendered.
    if (r.status === 302) return { ok: true };
    if (r.status === 200) {
        const html = await r.text();
        // Parsley validation errors typically end up as <div class="parsley-…">
        const err = html.match(/<(?:p|div)[^>]*class="[^"]*(?:errorlist|invalid-feedback|parsley-error)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i);
        const reason = err ? err[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "form re-rendered (validation likely)";
        return { ok: false, error: reason };
    }
    throw new Error(`Add Visitor POST HTTP ${r.status}`);
}

// ------------- top level: add a list of visitors to one property -------------

// Reduce a free-form address ("602 Jasmine Lane", "1601 Moon Valley Dr",
// "453 Ocean Way #B") to "<number> <first-street-word>" — the canonical
// MAPRO short code. We use this as a fallback when the full hint doesn't
// match a chooser entry verbatim (Proptia abbreviates "Lane" → "Ln", etc).
function shortHouseKey(s) {
    const m = String(s || "").trim().match(/^(\d+)\s+([A-Za-z]+)/);
    if (!m) return null;
    return `${m[1]} ${m[2]}`;
}

// ------------- org-admin mode (e.g. Solterra) -------------
// The "billing" account on Solterra is an organization vendor, not a
// resident — login lands directly on /proptia/organization/dashboard/
// <org>/<user>. No chooser. To find the right Add Visitor URL we hit
// the Resident Directory's DataTables endpoint and substring-match the
// address; the response embeds the exact /resident/.../visitors/.../add/
// link Proptia would build on the dashboard.

function parseOrgUserFromDashUrl(url) {
    const m = String(url || "").match(/\/dashboard\/([0-9a-f-]+)\/([0-9a-f-]+)/i);
    if (!m) return null;
    return { orgUUID: m[1], userUUID: m[2] };
}

// Column metadata Proptia's view-side validates. Skip these and the
// endpoint 500s. The captured request had 26 columns — we mirror those.
const ORG_RESIDENTS_COLUMNS = [
    "resident_type", "user", "user_last", "resident_type", "email", "mobile_phone",
    "unit_number", "community", "street_address", "postal_code", "lot_number",
    "floor_number", "property_type", "date_moved_in", "date_moved_out",
    "resident_id", "verbal_code",
    "field1", "field2", "field3", "field4", "field5", "field6", "field7", "field8",
    "",
];

async function proptiaFetchOrgResidents(jar, orgUUID, userUUID) {
    // DataTables-style endpoint. Don't paginate — pull everything in one
    // shot (length=10000) and substring-match client-side.
    const params = new URLSearchParams();
    params.append("obj_type", "current");
    params.append("draw", "1");
    ORG_RESIDENTS_COLUMNS.forEach((name, idx) => {
        params.append(`columns[${idx}][data]`, name);
        params.append(`columns[${idx}][name]`, idx >= 17 && idx <= 24 ? "" : name);
        params.append(`columns[${idx}][searchable]`, "true");
        params.append(`columns[${idx}][orderable]`, "true");
        params.append(`columns[${idx}][search][value]`, "");
        params.append(`columns[${idx}][search][regex]`, "false");
    });
    params.append("order[0][column]", "0");
    params.append("order[0][dir]", "asc");
    params.append("order[0][name]", "resident_type");
    params.append("start", "0");
    params.append("length", "10000");
    params.append("search[value]", "");
    params.append("search[regex]", "false");
    const url = `${BASE}/en-us/resident/organization_residents_table/${orgUUID}/${userUUID}?${params.toString()}`;
    const r = await jarFetch(jar, url, {
        method: "GET",
        headers: { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json" },
    });
    if (!r.ok) {
        const peek = await r.text().catch(() => "");
        throw new Error(`organization_residents_table HTTP ${r.status}. peek: ${peek.slice(0, 200).replace(/\s+/g, " ")}`);
    }
    const j = JSON.parse(await r.text());
    return Array.isArray(j.data) ? j.data : [];
}

function pickAddVisitorLink(resident) {
    if (!resident || !Array.isArray(resident.links)) return null;
    const a = resident.links.find((l) => /add\s*visitor/i.test(l.text || ""));
    return a ? a.link : null;
}

// The resident's "View Resident" detail page path.
function residentDetailPath(resident) {
    if (resident && resident.quick_link) return resident.quick_link;
    const links = (resident && resident.links) || [];
    const v = links.find((l) => /view\s*resident/i.test(l.text || ""));
    return v ? v.link : null;
}

// Fallback for residents whose directory row omits the Add Visitor link
// (Solterra "Non-Occupant Owner" types). The link still exists on the
// resident's detail page — same /resident/.../visitors/.../add/... URL
// the table gives everyone else; we just have to scrape it from there.
async function proptiaFindAddVisitorLinkOnDetail(jar, detailPath) {
    if (!detailPath) return null;
    const r = await jarFetch(jar, new URL(detailPath, BASE).toString(), { method: "GET" });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/\/en-us\/resident\/resident\/[0-9a-f-]+\/visitors\/[0-9a-f-]+\/add\/[0-9a-f-]+\/[0-9a-f-]+/i);
    return m ? m[0] : null;
}

// Prefer a "STR Pass" / "guest" / "visitor" option when the resort has
// multiple pass types (Solterra has Interviewee / Registered Vendor /
// STR Pass / Vendor Import; we want STR for vacation rentals). Falls
// back to the currently selected option, then to the first non-placeholder.
function pickPassFromSelect(selectInner) {
    const opts = [];
    const re = /<option([^>]*)>([\s\S]*?)<\/option>/gi;
    let m;
    while ((m = re.exec(selectInner)) !== null) {
        const attrs = m[1];
        const valM = attrs.match(/value="([^"]*)"/i);
        const value = valM ? valM[1] : "";
        if (!/^[0-9a-f-]+$/i.test(value)) continue; // skip the placeholder
        const selected = /selected/i.test(attrs);
        const text = m[2].replace(/<[^>]+>/g, " ").trim().toLowerCase();
        opts.push({ value, text, selected });
    }
    if (opts.length === 0) return null;
    // 1. STR / short-term-rental pass
    const str = opts.find((o) => /\bstr\b|short[\-\s]*term/i.test(o.text));
    if (str) return str.value;
    // 2. Guest / visitor pass
    const guest = opts.find((o) => /\b(guest|visitor)\b/i.test(o.text));
    if (guest) return guest.value;
    // 3. Whatever the form has selected by default
    const sel = opts.find((o) => o.selected);
    if (sel) return sel.value;
    // 4. First option
    return opts[0].value;
}

async function proptiaGetAddVisitorContextFromUrl(jar, addUrlPath) {
    const addUrl = new URL(addUrlPath, BASE).toString();
    const r2 = await jarFetch(jar, addUrl, { method: "GET" });
    if (!r2.ok) throw new Error(`Add Visitor GET HTTP ${r2.status}`);
    const formHtml = await r2.text();
    const csrf = parseCsrf(formHtml);
    if (!csrf) throw new Error("Add Visitor GET: no csrf");
    const passSelectMatch = formHtml.match(/<select[^>]*name="pass_name"[^>]*>([\s\S]*?)<\/select>/i);
    const passName = passSelectMatch ? pickPassFromSelect(passSelectMatch[1]) : null;
    if (!passName) throw new Error("Add Visitor GET: no usable pass_name option");
    return { addUrl, csrf, passName };
}

// Top-level entry point. mode="resident" goes through the chooser
// (Windsor Island); mode="org-admin" hits the resident table directly
// (Solterra).
export async function proptiaAddGuests({ slug, email, password, orgUUID, houseHint, mode }, guests) {
    const jar = new CookieJar();
    const finalUrl = await proptiaLogin(jar, slug, email, password);

    const wantFull = String(houseHint || "").toLowerCase().trim();
    const wantShort = (shortHouseKey(houseHint) || "").toLowerCase();

    let label = "";
    let getCtx;

    if (mode === "org-admin") {
        const ids = parseOrgUserFromDashUrl(finalUrl);
        if (!ids) throw new Error(`org-admin login didn't redirect to a dashboard URL (got: ${finalUrl})`);
        const residents = await proptiaFetchOrgResidents(jar, ids.orgUUID, ids.userUUID);
        if (residents.length === 0) throw new Error("resident directory returned no rows");
        const matchAddr = (r) => String(r.street_address || "").toLowerCase();
        let target = wantFull ? residents.find((r) => matchAddr(r).includes(wantFull)) : null;
        if (!target && wantShort) target = residents.find((r) => matchAddr(r).includes(wantShort));
        if (!target) {
            const sample = residents.slice(0, 5).map((r) => r.street_address).filter(Boolean).join(" | ");
            throw new Error(
                `no resident matched "${houseHint}" (also tried "${wantShort}"). ` +
                `First few of ${residents.length}: ${sample}`
            );
        }
        let link = pickAddVisitorLink(target);
        if (!link) {
            // Non-occupant owners don't get an Add Visitor link in the
            // directory table — pull it from the resident's detail page.
            link = await proptiaFindAddVisitorLinkOnDetail(jar, residentDetailPath(target));
        }
        if (!link) throw new Error(`resident "${target.street_address}" has no Add Visitor link`);
        label = `${target.full_name || target.street_address} — ${target.street_address}`;
        getCtx = () => proptiaGetAddVisitorContextFromUrl(jar, link);
    } else {
        // Default: resident-mode (Windsor Island).
        const properties = await proptiaListProperties(jar, orgUUID);
        if (properties.length === 0) throw new Error("no properties listed in chooser");
        let target = wantFull
            ? properties.find((p) => p.label.toLowerCase().includes(wantFull))
            : null;
        if (!target && wantShort) {
            target = properties.find((p) => p.label.toLowerCase().includes(wantShort));
        }
        if (!target) {
            const sample = properties.slice(0, 5).map((p) => p.label).join(" | ");
            throw new Error(
                `no property matched "${houseHint}" (also tried "${wantShort}"). ` +
                `First few of ${properties.length}: ${sample}`
            );
        }
        const picked = await proptiaPickProperty(jar, target.parentOrg, target.orgRole, target.property);
        label = target.label;
        getCtx = () => proptiaGetAddVisitorContext(jar, picked.dashboardUrl, target.parentOrg, target.orgRole, target.property);
    }

    const results = [];
    for (const g of guests) {
        const lastName = String(g.lastName || "").trim();
        const firstName = String(g.firstName || "").trim();
        try {
            if (!lastName) throw new Error("missing last name");
            // Re-fetch CSRF per submission — Django often single-uses tokens.
            const fresh = await getCtx();
            const r = await proptiaSubmitVisitor(jar, fresh, { ...g, firstName, lastName });
            if (r.ok) results.push({ firstName, lastName, ok: true });
            else results.push({ firstName, lastName, ok: false, error: r.error });
        } catch (e) {
            results.push({ firstName, lastName, ok: false, error: String(e?.message || e) });
        }
    }
    return { house: label, results };
}
