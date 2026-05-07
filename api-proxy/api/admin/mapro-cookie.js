import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { setMaproCookie } from "../_lib/kv.js";

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
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
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (!adminEmails.includes(user.email)) {
        res.status(403).json({ error: "not an admin" });
        return;
    }

    const cookie = req.body?.cookie;
    if (typeof cookie !== "string" || cookie.length < 10) {
        res.status(400).json({ error: "missing or invalid cookie" });
        return;
    }

    await setMaproCookie(cookie.trim());
    res.status(200).json({ ok: true });
}
