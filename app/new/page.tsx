"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { Card } from "@/components/Card";

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 17v-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 8h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function NewDream() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const { loading } = useRequireAuth();

  async function createSession() {
    setErr(null);

    if (!text.trim()) {
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
    <Shell
      title="Új álom rögzítése"
      space="dream"
      headerActions={
        <button
          type="button"
          className="icon-btn"
          aria-label="Hogyan használd?"
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((v) => !v)}
        >
          <InfoIcon />
        </button>
      }
      infoOpen={infoOpen}
      onToggleInfo={() => setInfoOpen((v) => !v)}
      infoPanel={
        <div className="stack-tight">
          <p className="section-title">Hogyan érdemes használni ezt az oldalt?</p>

          <p style={{ color: "var(--text-muted)" }}>
            Itt csak a rögzítés a cél. Nem kell szépen megfogalmazni, nem kell “értelmes” legyen.
            Amit most ki tudsz menteni, az később is dolgozható.
          </p>

          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <li>Kezdd egy képpel, érzettel, hangulattal, vagy egyetlen jelenettel.</li>
            <li>Ha lyukak vannak: írd le a hiányt is (“innen nem emlékszem”).</li>
            <li>Ne javíts közben: inkább öntsd ki nyersen, aztán kész.</li>
            <li>Ha van erős érzelem vagy testérzet: egy szó is elég (“szorítás”, “könnyűség”).</li>
            <li>Ne erőltesd a történetté fűzést — a töredékek is teljes értékűek.</li>
          </ul>

          <p style={{ color: "var(--text-muted)" }}>
            Ha kész vagy, nyomd meg a <b>Rögzítés</b>-t. A feldolgozás a következő lépés.
          </p>
        </div>
      }
    >
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
          <Card>
            <div className="stack-tight">
              <textarea
                className="textarea-dream"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Írj le mindent, amire most emlékszel az álmodból. Elég töredékekben is."
                rows={10}
                aria-invalid={!!err}
              />

              {/* gombok ide kerültek (a régi “tipp” helyére) */}
              <div className="newdream-actions">
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

                <PrimaryButton onClick={createSession} disabled={busy}>
                  {busy ? "Rögzítés…" : "Rögzítés"}
                </PrimaryButton>
              </div>
            </div>
          </Card>

          {err && (
            <div className="newdream-error" role="alert">
              {err}
            </div>
          )}
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
