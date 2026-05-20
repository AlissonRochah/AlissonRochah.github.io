import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getApp() {
    if (getApps().length) return getApps()[0];
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var missing");
    const serviceAccount = JSON.parse(raw);
    return initializeApp({ credential: cert(serviceAccount) });
}

export async function requireFirebaseUser(req) {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        const err = new Error("missing bearer token");
        err.status = 401;
        throw err;
    }
    try {
        const decoded = await getAuth(getApp()).verifyIdToken(match[1]);
        return decoded;
    } catch (_) {
        const err = new Error("invalid token");
        err.status = 401;
        throw err;
    }
}

// Accept either a Firebase ID token (browser/extension callers) or the
// BRIDGE_SECRET env var (CLI callers like ~/.claude/commands/airbnb-*).
// The CLI doesn't have a Firebase SDK or refresh-token flow, so a shared
// secret is the cheapest path that doesn't require running a token server
// on the user's Mac. Set BRIDGE_SECRET on Vercel and mirror it in the
// caller's local config (e.g. ~/.airbnb-corpus/.config.json).
export async function requireBridgeOrUser(req) {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        const err = new Error("missing bearer token");
        err.status = 401;
        throw err;
    }
    const token = match[1];
    const bridgeSecret = process.env.BRIDGE_SECRET;
    if (bridgeSecret && token === bridgeSecret) {
        return { uid: "bridge-cli", source: "bridge" };
    }
    return await requireFirebaseUser(req);
}
