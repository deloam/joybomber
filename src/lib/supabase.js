import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase Init] Checking Env Vars...');
console.log('URL:', supabaseUrl ? 'OK' : 'MISSING');
console.log('Key:', supabaseAnonKey ? `OK (Starts with ${supabaseAnonKey.substring(0, 4)}...)` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Key missing! Multiplayer will not work.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
