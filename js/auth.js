import { supabase } from "./supabase.js";

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.replace("index.html");
        return null;
    }
    return session;
}

export async function redirectIfAuthed() {
    const session = await getSession();
    if (session) {
        window.location.replace("dashboard.html");
        return true;
    }
    return false;
}

export async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
    await supabase.auth.signOut();
    window.location.replace("index.html");
}
