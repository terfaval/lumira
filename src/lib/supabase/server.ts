// /src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServer() {
  const cookieStore = await cookies(); // ✅ IMPORTANT

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Components cannot reliably set cookies; middleware handles refresh.
        // TS/Runtime varies across Next versions, so keep it guarded.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            (cookieStore as any).set?.(name, value, options);
          });
        } catch {
          // no-op
        }
      },
    },
  });
}
