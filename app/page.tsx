import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { supabaseServer } from "@/src/lib/supabase/server";

const APP_ENTRY_ROUTE = "/new";

export default async function Home() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect(APP_ENTRY_ROUTE);
  }

  return <LandingPage />;
}
