// /src/lib/api/fetchWithAuth.ts
"use client";

import { supabase } from "@/src/lib/supabase/client";

type FetchWithAuthInit = RequestInit & { json?: unknown };

export async function fetchWithAuth(url: string, init: FetchWithAuthInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers ?? {});
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  const body =
    init.json !== undefined ? JSON.stringify(init.json) : (init.body as BodyInit | null | undefined);

  return fetch(url, {
    ...init,
    headers,
    body,
    credentials: "include", // fontos: cookie kompatibilitás + jövőbiztosság
    cache: init.cache ?? "no-store",
  });
}
