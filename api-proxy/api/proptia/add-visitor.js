import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { proptiaAddGuests } from "../_lib/proptia.js";

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

    const { creds, houseHint, guests } = req.body || {};
    if (!creds || !creds.email || !creds.password || !creds.slug || !creds.orgUUID) {
        res.status(400).json({ error: "creds must include {email, password, slug, orgUUID}" });
        return;
    }
    if (!houseHint || typeof houseHint !== "string") {
        res.status(400).json({ error: "houseHint required" });
        return;
    }
    if (!Array.isArray(guests) || guests.length === 0) {
        res.status(400).json({ error: "guests must be a non-empty array" });
        return;
    }

    try {
        const out = await proptiaAddGuests(
            { ...creds, houseHint },
            guests
        );
        res.status(200).json(out);
    } catch (err) {
        res.status(500).json({ error: String(err?.message || err) });
    }
}
