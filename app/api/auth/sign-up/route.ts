import { NextResponse } from "next/server";

import { createServerSupabaseAuthClient } from "@/src/infrastructure/supabase/auth/create-server-supabase-auth-client";

interface SignUpPayload {
  email?: string;
  password?: string;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SignUpPayload | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return badRequest("Email and password are required.");
  }

  const supabase = await createServerSupabaseAuthClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    user: data.user
      ? {
          userId: data.user.id,
          email: data.user.email ?? null,
        }
      : null,
    hasSession: Boolean(data.session),
  });
}
