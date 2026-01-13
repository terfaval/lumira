// app/login/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { supabaseServer } from "@/src/lib/supabase/server";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  // ✅ ha már van user, ne lássa a login oldalt
  if (data.user) redirect("/new");

  // ✅ unauth: marad a login UI
  return <LoginClient />;
}
