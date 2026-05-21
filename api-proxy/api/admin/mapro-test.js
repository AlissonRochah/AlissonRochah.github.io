import { requireBridgeOrUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { getMaproCookie } from "../_lib/kv.js";

const MAPRO_BASE = "https://app.mapro.us";

// Same five URLs the /api/mapro/units endpoint hits in parallel.
const TEST_PATHS = [
    "/manage/houses/list",
    "/manage/houses/resort/list",
    "/settings/services/register/6969",
    "/settings/services/register/6960",
    "/settings/services/register/6704",
];

async function probe(path, cookie) {
    try {
        const r = await fetch(MAPRO_BASE + path, {
            method: "GET",
            redirect: "manual",
            headers: {
                "Cookie": cookie,
                "Accept": "text/html,application/xhtml+xml",
                "User-Agent": "Mozilla/5.0 (compatible; MasterBotProxy/0.1)",
            },
        });
        const text = await r.text();
        // Old regex: `checked` BEFORE `id="casa-N"`
        const oldMatches = (text.match(/<input\s+checked[^>]*id="casa-\d+"/g) || []).length;
        // New regex: any <input id="casa-N"> with `checked` anywhere
        const tagRe = /<input\b[^>]*\bid=["']?casa-(\d+)["']?[^>]*>/gi;
        let newMatches = 0;
        let firstTagSample = null;
        for (const m of text.matchAll(tagRe)) {
            if (firstTagSample === null) firstTagSample = m[0];
            if (/\bchecked\b/i.test(m[0])) newMatches++;
        }
        // Locate the first occurrence of "casa-" to dump surrounding HTML.
        const idx = text.search(/\bid=["']?casa-/i);
        const contextSnippet = idx >= 0 ? text.slice(Math.max(0, idx - 80), idx + 250) : null;
        return {
            path,
            status: r.status,
            location: r.headers.get("location") || null,
            bodyLength: text.length,
            inputCount: (text.match(/<input\b/gi) || []).length,
            casaIdCount: (text.match(/\bid=["']?casa-\d+/gi) || []).length,
            oldRegexMatches: oldMatches,
            newRegexMatches: newMatches,
            firstCasaTag: firstTagSample,
            contextSnippet,
        };
    } catch (err) {
        return { path, error: String(err?.message || err) };
    }
}

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== "GET") {
        res.status(405).json({ error: "method not allowed" });
        return;
    }

    let user;
    try {
        user = await requireBridgeOrUser(req);
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message });
        return;
    }

    // Bridge callers (uid="bridge-cli") bypass the admin email check —
    // having the BRIDGE_SECRET is itself proof of admin access.
    if (user.source !== "bridge") {
        const adminEmails = (process.env.ADMIN_EMAILS || "")
            .split(",").map((s) => s.trim()).filter(Boolean);
        if (!adminEmails.includes(user.email)) {
            res.status(403).json({ error: "not an admin" });
            return;
        }
    }

    const cookie = await getMaproCookie();
    if (!cookie) {
        res.status(200).json({ ok: false, stage: "kv", error: "no cookie stored in KV" });
        return;
    }

    const results = await Promise.all(TEST_PATHS.map((p) => probe(p, cookie)));
    res.status(200).json({
        cookieLength: cookie.length,
        cookiePrefix: cookie.slice(0, 12),
        results,
    });
}
