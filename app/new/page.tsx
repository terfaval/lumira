// app/new/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { supabaseServer } from "@/src/lib/supabase/server";
import NewClient from "./NewClient";

export default async function NewPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/");

  return <NewClient />;
}
