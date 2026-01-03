// /src/lib/supabase/serverAuthed.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServerAuthed(req?: Request) {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const authHeader = req?.headers.get("authorization") ?? undefined;

  return createServerClient(url, key, {
    global: authHeader ? { headers: { Authorization: authHeader } } : {},
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: any) {
        // route handlerben ez működik; ha valahol nem, akkor ne borítsuk
        try {
          cookieStore.set(name, value, options);
        } catch {
          // no-op
        }
      },
      remove(name: string, options?: any) {
        try {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        } catch {
          // no-op
        }
      },
    },
  });
}
