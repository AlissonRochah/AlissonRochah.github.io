import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { getMaproCookie } from "../_lib/kv.js";

const MAPRO_BASE = "https://app.mapro.us";

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

    try {
        const r = await fetch(MAPRO_BASE + "/manage/houses/list", {
            method: "GET",
            redirect: "manual",
            headers: {
                "Cookie": cookie,
                "Accept": "text/html,application/xhtml+xml",
                "User-Agent": "Mozilla/5.0 (compatible; MasterBotProxy/0.1)",
            },
        });
        const text = await r.text();
        const hasLocalData = /localData\s*=\s*\[/.test(text);
        res.status(200).json({
            ok: r.ok && hasLocalData,
            status: r.status,
            cookieLength: cookie.length,
            cookiePrefix: cookie.slice(0, 12),
            location: r.headers.get("location") || null,
            contentType: r.headers.get("content-type") || null,
            setCookie: r.headers.get("set-cookie") || null,
            hasLocalData,
            bodySnippet: text.slice(0, 400),
        });
    } catch (err) {
        res.status(500).json({ ok: false, stage: "fetch", error: String(err?.message || err) });
    }
}
