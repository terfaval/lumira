import { NextResponse } from "next/server";

import { createServerSupabaseAuthClient } from "@/src/infrastructure/supabase/auth/create-server-supabase-auth-client";

interface SignInPayload {
  email?: string;
  password?: string;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SignInPayload | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return badRequest("Email and password are required.");
  }

  const supabase = await createServerSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({
    session: data.session
      ? {
          userId: data.session.user.id,
          email: data.session.user.email ?? null,
        }
      : null,
  });
}
