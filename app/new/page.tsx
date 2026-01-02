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
        setErr("Írj le legalább néhány szót az álmodból.");
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Hiba";
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Új álom" space="dream">
      {loading ? (
        <div
          aria-label="Betöltés"
          className="spinner"
          style={{
            width: 22,
            height: 22,
            borderRadius: "999px",
            border: "2px solid var(--border)",
            borderTopColor: "var(--text-muted)",
            animation: "spin 0.9s linear infinite",
            marginTop: 8,
          }}
        />
      ) : (
        <div className="stack">
          <p style={{ color: "var(--text-muted)" }}>
            Írj le mindent, amire most emlékszel az álmodból. Elég töredékekben is.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kezdd egy képpel, érzettel vagy pár szóval az álmodból…"
            rows={10}
          />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PrimaryButton onClick={createSession} disabled={busy}>
              Rögzítés
            </PrimaryButton>
          </div>

          {err && <p style={{ marginTop: 4, color: "crimson" }}>{err}</p>}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Shell>
  );
}
