import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServer() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {
        // route handlerben most nem kell
      },
      remove() {},
    },
  });
}
