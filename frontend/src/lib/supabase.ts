import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === "https://xxxx.supabase.co") {
  console.error("CRITICAL ERROR: NEXT_PUBLIC_SUPABASE_URL environment variable is missing or unconfigured.");
}

if (!supabaseAnonKey || supabaseAnonKey.startsWith("eyJ...")) {
  console.error("CRITICAL ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing or unconfigured.");
}

export const supabase = createClient(
  supabaseUrl || "https://xxxx.supabase.co",
  supabaseAnonKey || "eyJ..."
);

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
