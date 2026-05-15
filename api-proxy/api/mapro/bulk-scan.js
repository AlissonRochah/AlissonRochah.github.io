import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { bulkScan, MaproNotLoggedIn } from "../_lib/mapro.js";

const MAX_ITEMS = 300;

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

    const body = req.body || {};
    const source = body.source || "addresses";
    if (!["addresses", "codes", "resort"].includes(source)) {
        res.status(400).json({ error: `unknown source "${source}"` });
        return;
    }
    const mode = body.mode === "inhouse" ? "inhouse" : "checkin";
    const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) ? String(body.date) : undefined;

    const clean = (arr) => (Array.isArray(arr) ? arr : [])
        .map((a) => String(a || "").trim())
        .filter(Boolean);

    let addresses, codes, resort;
    if (source === "addresses") {
        addresses = clean(body.addresses).filter((l) => l.toLowerCase() !== "address");
        if (addresses.length === 0) {
            res.status(400).json({ error: "addresses is empty" });
            return;
        }
        if (addresses.length > MAX_ITEMS) {
            res.status(400).json({ error: `too many addresses (max ${MAX_ITEMS})` });
            return;
        }
    } else if (source === "codes") {
        codes = clean(body.codes);
        if (codes.length === 0) {
            res.status(400).json({ error: "codes is empty" });
            return;
        }
        if (codes.length > MAX_ITEMS) {
            res.status(400).json({ error: `too many codes (max ${MAX_ITEMS})` });
            return;
        }
    } else {
        resort = String(body.resort || "").trim();
        if (!resort) {
            res.status(400).json({ error: "resort is required" });
            return;
        }
    }

    try {
        const out = await bulkScan({ source, addresses, codes, resort, mode, date });
        res.status(200).json(out);
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
