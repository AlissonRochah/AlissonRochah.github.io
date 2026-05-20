import { requireFirebaseUser } from "../_lib/auth.js";
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
        return {
            path,
            status: r.status,
            location: r.headers.get("location") || null,
            hasLocalData: /localData\s*=\s*\[/.test(text),
            hasCheckedCasa: /<input\s+checked[^>]*id="casa-\d+"/.test(text),
            bodyLength: text.length,
            bodySnippet: text.slice(0, 200),
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
        user = await requireFirebaseUser(req);
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message });
        return;
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",").map((s) => s.trim()).filter(Boolean);
    if (!adminEmails.includes(user.email)) {
        res.status(403).json({ error: "not an admin" });
        return;
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
