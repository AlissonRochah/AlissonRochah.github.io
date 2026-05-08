import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { gateAddGuests } from "../_lib/gate.js";

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

    const { creds, guests, cookies } = req.body || {};
    if (!creds || !creds.communityCode || !creds.username || !creds.password) {
        res.status(400).json({ error: "missing creds {communityCode, username, password}" });
        return;
    }
    if (!Array.isArray(guests) || guests.length === 0) {
        res.status(400).json({ error: "guests must be a non-empty array" });
        return;
    }

    try {
        const results = await gateAddGuests(creds, guests, Array.isArray(cookies) ? cookies : []);
        res.status(200).json({ results });
    } catch (err) {
        res.status(500).json({ error: String(err?.message || err) });
    }
}
