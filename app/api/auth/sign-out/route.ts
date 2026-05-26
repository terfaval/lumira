import { NextResponse } from "next/server";

import { createServerSupabaseAuthClient } from "@/src/infrastructure/supabase/auth/create-server-supabase-auth-client";

export async function POST() {
  const supabase = await createServerSupabaseAuthClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ signedOut: true });
}
