import { NextResponse } from "next/server";

import { createAdminRepository } from "@/src/infrastructure/supabase/repositories/create-admin-repository";
import { resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";

export async function GET(request: Request) {
  const user = await resolveRequestUserContext(request.headers);

  if (!user.userId) {
    return NextResponse.json({ user: null, admin: false });
  }

  const adminRepository = createAdminRepository();
  const membership = await adminRepository.getMembershipByUserId(user.userId);

  return NextResponse.json({
    user: {
      userId: user.userId,
      source: user.source,
    },
    admin: Boolean(membership),
  });
}
