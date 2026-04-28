import { Redis } from "@upstash/redis";

let client = null;

function getClient() {
    if (client) return client;
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error("Upstash env vars missing");
    client = new Redis({ url, token });
    return client;
}

const COOKIE_KEY = "mapro:session_cookie";

export async function getMaproCookie() {
    return await getClient().get(COOKIE_KEY);
}

export async function setMaproCookie(cookie) {
    await getClient().set(COOKIE_KEY, cookie);
}
