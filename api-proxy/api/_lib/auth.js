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
