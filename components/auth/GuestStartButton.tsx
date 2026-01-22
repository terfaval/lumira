"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// NOTE: Codex: igazítsd a valódi client exporthoz.
// Példa: "@/src/lib/supabase/client" vagy "@/lib/supabase/client"
import { supabase } from "@/src/lib/supabase/client"; // <-- FIX PATH

export function GuestStartButton({
  redirectTo = "/session/new",
  className = "",
  label = "Kipróbálom",
}: {
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function startGuest() {
    if (busy) return;
    setBusy(true);
    try {
      // 1) Anonymous sign-in (required for RLS: auth.uid())
      const { error: signErr } = await supabase.auth.signInAnonymously();
      if (signErr) throw signErr;

      // 2) Mark as guest (server route already created by user)
      const res = await fetch("/api/auth/guest/mark", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "guest_mark_failed");
      }

      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Nem sikerült elindítani a vendég módot. Próbáld újra.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={startGuest}
      disabled={busy}
    >
      {busy ? "Indítás…" : label}
    </button>
  );
}
