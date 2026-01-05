"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { Card } from "@/components/Card";

export default function NewDream() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { loading } = useRequireAuth();

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const chars = text.length;
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return { chars, words, empty: !trimmed };
  }, [text]);

  async function createSession() {
    setErr(null);

    if (stats.empty) {
      setErr("Írj le legalább néhány szót az álmodból.");
      return;
    }

    setBusy(true);
    try {
      const userId = await requireUserId();

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
        <div className="surface-layer" style={{ padding: 14, display: "inline-flex", gap: 10, alignItems: "center" }}>
          <div
            aria-label="Betöltés"
            className="spinner"
            style={{
              width: 18,
              height: 18,
              borderRadius: "999px",
              border: "2px solid var(--line-soft)",
              borderTopColor: "var(--text-muted)",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Betöltés…</p>
        </div>
      ) : (
        <div className="stack">
          {/* Fő “írólap” kártya */}
          <Card>
            <div className="stack-tight">
              <p className="newdream-lead">
                Írj le mindent, amire most emlékszel. Elég töredékekben is — a többi ráér később.
              </p>

              <textarea
                className="textarea-dream"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Kezdd egy képpel, érzettel vagy pár szóval…"
                rows={10}
                aria-invalid={!!err}
                onKeyDown={(e) => {
                  // Cmd/Ctrl + Enter = rögzítés
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    if (!busy) void createSession();
                  }
                }}
              />

              {/* alsó “meta” sor: számláló + mikrocopy */}
              <div className="newdream-meta">
                <span className="badge-muted">
                  {stats.words} szó · {stats.chars} karakter
                </span>
                <span className="newdream-hint">Tipp: Cmd/Ctrl+Enter a rögzítéshez</span>
              </div>
            </div>
          </Card>

          {/* CTA sáv */}
          <div className="newdream-actions">
            <PrimaryButton onClick={createSession} disabled={busy || stats.empty}>
              {busy ? "Rögzítés…" : "Rögzítés"}
            </PrimaryButton>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setErr(null);
                setText("");
              }}
              disabled={busy || !text.length}
            >
              Törlés
            </button>
          </div>

          {/* Hiba / figyelmeztetés: mindig “kímélő”, nem piros ordítás */}
          {err && (
            <div className="newdream-error" role="alert">
              {err}
            </div>
          )}

          {/* finom biztonsági/etikai mikroszöveg – opcionális, de szerintem nagyon illik */}
          <p className="newdream-footnote">
            Most csak rögzíts. Az értelmezés mindig a tiéd — és nem kötelező.
          </p>
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
