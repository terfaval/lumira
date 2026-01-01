"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

export default function NewDream() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { loading } = useRequireAuth();

  async function createSession() {
    setErr(null);
    setBusy(true);
    try {
      const userId = await requireUserId();

      if (!text.trim()) {
        setErr("Írj be legalább pár szót (a DB-ben kötelező a raw_dream_text).");
        return;
      }

      const { data, error } = await supabase
        .from("dream_sessions")
        .insert({
          user_id: userId,
          raw_dream_text: text,
          status: "draft",
        })
        .select("id")
        .single();

      if (error) throw error;

      router.push(`/session/${data.id}/frame`);
    } catch (e: any) {
      setErr(e.message ?? "Hiba");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Új álom">
      {loading ? (
        <p>Bejelentkezés ellenőrzése…</p>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Most csak rögzíts. A többi ráér."
            rows={10}
            style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
            <PrimaryButton onClick={createSession} disabled={busy}>
              Mentés & tovább
            </PrimaryButton>
          </div>
          {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
        </>
      )}
    </Shell>
  );
}