// app/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { supabaseServer } from "@/src/lib/supabase/server";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function Home() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect("/new");

  return <LandingPage />;
}
