// /app/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { supabaseServer } from "@/src/lib/supabase/server";

const APP_ENTRY_ROUTE = "/new";
const UNAUTH_ROUTE = "/about";

export default async function Home() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect(APP_ENTRY_ROUTE);
  redirect(UNAUTH_ROUTE);
}