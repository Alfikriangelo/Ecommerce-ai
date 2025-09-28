import { createClient } from "@supabase/supabase-js"

let adminClient: ReturnType<typeof createClient> | null = null

// Polyfill Headers.getAll for environments that don't implement it (prevents supabase-js from throwing)
if (typeof globalThis !== "undefined") {
  const H: any = (globalThis as any).Headers
  if (H?.prototype && typeof H.prototype.getAll !== "function") {
    H.prototype.getAll = function (name: string) {
      const v = this.get(name)
      return v ? [v] : []
    }
  }
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    }

    adminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return adminClient
}
