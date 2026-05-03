import { requireFirebaseUser } from "../_lib/auth.js";
import { getUnitStays, MaproNotLoggedIn } from "../_lib/mapro.js";

export default async function handler(req, res) {
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    if (req.method !== "GET") {
        res.status(405).json({ error: "method not allowed" });
        return;
    }

    try {
        await requireFirebaseUser(req);
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message });
        return;
    }

    const key = req.query.key;
    if (!key || !/^[0-9A-Z]{26}$/.test(String(key))) {
        res.status(400).json({ error: "missing or invalid key" });
        return;
    }

    try {
        const stays = await getUnitStays(key);
        res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
        res.status(200).json(stays);
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
