export const dynamic = "force-dynamic";
export const revalidate = 0;

import { LandingPage } from "@/components/landing/LandingPage";
import { supabaseServer } from "@/src/lib/supabase/server";

export default async function AboutPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  return <LandingPage showHeroCtas={!data.user} />;
}
