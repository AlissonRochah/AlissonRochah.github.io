import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { bulkScanAddresses, MaproNotLoggedIn } from "../_lib/mapro.js";

const MAX_ADDRESSES = 200;

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

    const raw = (req.body && req.body.addresses) || [];
    if (!Array.isArray(raw)) {
        res.status(400).json({ error: "addresses must be an array" });
        return;
    }
    const addresses = raw.map((a) => String(a || "").trim()).filter(Boolean);
    if (addresses.length === 0) {
        res.status(400).json({ error: "addresses is empty" });
        return;
    }
    if (addresses.length > MAX_ADDRESSES) {
        res.status(400).json({ error: `too many addresses (max ${MAX_ADDRESSES})` });
        return;
    }

    try {
        const out = await bulkScanAddresses(addresses);
        res.status(200).json(out);
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
