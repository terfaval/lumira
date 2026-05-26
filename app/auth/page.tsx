import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { AuthScreen } from "@/src/ui/auth/auth-screen";

export default async function AuthPage() {
  const requestHeaders = await headers();
  const user = await resolveRequestUserContext(requestHeaders);

  if (user.userId) {
    redirect("/");
  }

  return <AuthScreen />;
}
