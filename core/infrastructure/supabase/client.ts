type SupabaseClient = {
  from: (table: string) => {
    upsert: (row: unknown, opts?: { onConflict?: string }) => Promise<{ error: Error | null }>;
    select: (columns: string) => { eq: (col: string, val: string) => Promise<{ data: unknown; error: Error | null }>; order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: Error | null }> };
    delete: () => { eq: (col: string, val: string) => Promise<{ error: Error | null }> };
  };
};

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!client) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) return null;
      const { createClient } = require("@supabase/supabase-js");
      client = createClient(url, key) as SupabaseClient;
    } catch {
      return null;
    }
  }
  return client;
}
