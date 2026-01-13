// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return res;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // ✅ Middleware can set cookies on the response
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // ✅ This triggers refresh if needed and syncs cookies into res
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: [
    /*
      Run middleware on all routes that render pages,
      exclude Next internals + static.
    */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
