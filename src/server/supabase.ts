import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getBackendConfig } from "./config";

const supabaseClientCache = globalThis as unknown as {
  __sai_bumi_supabase_clients?: Map<string, SupabaseClient>;
};

export function createBackendClient() {
  const config = getBackendConfig();
  if (!supabaseClientCache.__sai_bumi_supabase_clients) {
    supabaseClientCache.__sai_bumi_supabase_clients = new Map();
  }
  const cacheKey = `${config.url}::${config.key.slice(0, 16)}`;
  let client = supabaseClientCache.__sai_bumi_supabase_clients.get(cacheKey);
  if (!client) {
    client = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8_000) }),
      },
    });
    supabaseClientCache.__sai_bumi_supabase_clients.set(cacheKey, client);
  }
  return { client, config };
}
