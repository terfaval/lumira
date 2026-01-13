import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/LandingPage";
import { supabaseServer } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// "/" = public landing gate; authed users go to "/new".
export default async function Home() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/new");
  }

  return <LandingPage />;
}