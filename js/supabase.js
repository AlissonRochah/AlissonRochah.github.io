import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ahpubmxpfmmpkfwbhtwf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Y9CEmcrVgeizC0hMub-zyQ_GQmwO1s-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});
