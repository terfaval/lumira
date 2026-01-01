"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/src/lib/supabase/client";
import type { DreamSession } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function FramePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<DreamSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { loading } = useRequireAuth();

  async function load() {
    setErr(null);
    const { data, error } = await supabase
      .from("dream_sessions")
      .select("id, raw_dream_text, ai_framing_text, status, created_at, updated_at")
      .eq("id", id)
      .single();
    if (error) setErr(error.message);
    else setSession(data as DreamSession);
  }

  useEffect(() => { load(); }, [id]);

  async function runFraming() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/frame", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Hiba");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Keretezés">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : !session ? (
        <p>Betöltés…</p>
      ) : (
        <>
          <p style={{ opacity: 0.8 }}>Session státusz: {session.status}</p>

          <h3>AI keretezés</h3>
          <div style={{ whiteSpace: "pre-wrap", padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            {session.ai_framing_text ?? "Még nincs keretezés. Kérhetsz egyet."}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PrimaryButton onClick={runFraming} disabled={busy}>
              Keretezés frissítése
            </PrimaryButton>
            <PrimaryButton onClick={() => router.push(`/session/${id}/direction`)}>
              Tovább az irányokhoz
            </PrimaryButton>
            <PrimaryButton onClick={() => router.push(`/session/${id}`)}>
              Megállok (összkép)
            </PrimaryButton>
          </div>

          {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
        </>
      )}
    </Shell>
  );
}
