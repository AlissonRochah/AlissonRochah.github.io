import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { bulkSend, MaproNotLoggedIn } from "../_lib/mapro.js";

const MAX_SENDS = 200;

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
        res.status(405).json({ error: "method not allowed" });
        return;
    }

    try {
        await requireFirebaseUser(req);
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message });
        return;
    }

    const raw = (req.body && req.body.sends) || [];
    if (!Array.isArray(raw) || raw.length === 0) {
        res.status(400).json({ error: "sends must be a non-empty array" });
        return;
    }
    if (raw.length > MAX_SENDS) {
        res.status(400).json({ error: `too many sends (max ${MAX_SENDS})` });
        return;
    }
    const sends = [];
    for (const s of raw) {
        const bookingId = String((s && s.bookingId) || "").trim();
        const body = String((s && s.body) || "");
        if (!bookingId || !body.trim()) {
            res.status(400).json({ error: "each send needs a bookingId and a non-empty body" });
            return;
        }
        sends.push({ bookingId, body });
    }

    try {
        const results = await bulkSend(sends);
        res.status(200).json({ results });
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
