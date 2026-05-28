import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xxxx.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJ...";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
