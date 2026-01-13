// /src/lib/supabase/serverAuthed.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServerAuthed(req?: Request) {
  const cookieStore = await cookies(); // ✅ IMPORTANT

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const authHeader = req?.headers.get("authorization") ?? undefined;

  return createServerClient(url, key, {
    global: authHeader ? { headers: { Authorization: authHeader } } : {},
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
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
