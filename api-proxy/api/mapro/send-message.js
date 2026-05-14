import { requireFirebaseUser } from "../_lib/auth.js";
import { applyCors } from "../_lib/cors.js";
import {
    findBookingByConfirmationCode,
    getReservationUlid,
    sendChannelMessage,
    MaproNotLoggedIn,
} from "../_lib/mapro.js";

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

    const { confirmationCode, body } = req.body || {};
    const code = String(confirmationCode || "").trim();
    const text = String(body || "");
    if (!code) {
        res.status(400).json({ error: "confirmationCode required" });
        return;
    }
    if (!text.trim()) {
        res.status(400).json({ error: "body required" });
        return;
    }

    try {
        const booking = await findBookingByConfirmationCode(code);
        if (!booking) {
            res.status(404).json({ error: `no reservation with confirmation code "${code}"` });
            return;
        }
        const ulid = await getReservationUlid(booking.bookingId);
        if (!ulid) {
            res.status(500).json({ error: `reservation ${booking.bookingId} has no messaging ULID — channel likely not connected` });
            return;
        }
        const result = await sendChannelMessage(ulid, text);
        if (!result || result.status === 0 || result.status === false) {
            res.status(502).json({
                error: result?.error || "MAPRO rejected the message",
                booking,
                ulid,
            });
            return;
        }
        res.status(200).json({
            ok: true,
            booking,
            ulid,
            mapro: result,
        });
    } catch (err) {
        if (err instanceof MaproNotLoggedIn) {
            res.status(503).json({ error: "MAPRO_NOT_LOGGED_IN" });
            return;
        }
        res.status(500).json({ error: err.message || "internal error" });
    }
}
