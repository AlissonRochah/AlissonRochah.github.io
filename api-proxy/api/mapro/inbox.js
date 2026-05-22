import { requireBridgeOrUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import {
    getInboxState,
    getThreadState,
    getReservationUlid,
    MaproNotLoggedIn,
} from "../_lib/mapro.js";

// One endpoint, three modes (consolidated to stay under Vercel Hobby's
// 12-function-per-deploy limit):
//   GET /api/mapro/inbox                         → full inbox state (1000-cap)
//   GET /api/mapro/inbox?reservation_id=ULID     → one thread + messages
//   GET /api/mapro/inbox?bookingId=12345         → resolve numeric bookingId
//                                                  to ULID, then return that
//                                                  thread + messages. Used to
//                                                  reach threads outside the
//                                                  1000-thread inbox cap (older
//                                                  reservations from /booking/
//                                                  check-reservation history).
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
    const bookingId = String(req.query.bookingId || "").trim();
    try {
        if (reservationId) {
            res.status(200).json(await getThreadState(reservationId));
            return;
        }
        if (bookingId) {
            const ulid = await getReservationUlid(bookingId);
            if (!ulid) {
                res.status(404).json({
                    error: `no messaging ULID for bookingId ${bookingId} (channel likely not connected, or reservation has no thread)`,
                });
                return;
            }
            const json = await getThreadState(ulid);
            // Pass through the resolved ULID so the caller can cache the mapping.
            res.status(200).json({ ...json, _resolved_reservation_id: ulid });
            return;
        }
        res.status(200).json(await getInboxState());
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
