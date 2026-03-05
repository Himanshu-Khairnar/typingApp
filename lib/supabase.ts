import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser / client-side client (uses anon key + RLS)
export const supabase = createClient<Database>(url, anon);

// Server-side client (bypasses RLS — only use in server actions / API routes)
export function createServiceClient() {
  return createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
