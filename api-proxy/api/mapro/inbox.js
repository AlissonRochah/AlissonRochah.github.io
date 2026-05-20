import { requireBridgeOrUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import { getInboxState, getThreadState, MaproNotLoggedIn } from "../_lib/mapro.js";

// One endpoint, two modes (consolidated to stay under Vercel Hobby's
// 12-function-per-deploy limit):
//   GET /api/mapro/inbox                          → full inbox state
//   GET /api/mapro/inbox?reservation_id=ULID      → one thread + messages
export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== "GET") {
        res.status(405).json({ error: "method not allowed" });
        return;
    }
    try {
        await requireBridgeOrUser(req);
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message });
        return;
    }
    const reservationId = String(req.query.reservation_id || "").trim();
    try {
        const json = reservationId
            ? await getThreadState(reservationId)
            : await getInboxState();
        res.status(200).json(json);
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
