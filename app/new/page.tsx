"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";
import { FlowLoadingOverlay } from "@/components/FlowLoadingOverlay";

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 17v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function safeTextFromUnknown(e: unknown): string {
  if (e instanceof Error) return e.message || "Hiba";
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Hiba";
  }
}

export default function NewDream() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blockingFlow, setBlockingFlow] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const { loading } = useRequireAuth();

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const chars = text.length;
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const empty = !trimmed;
    return { chars, words, empty };
  }, [text]);

  async function createSession() {
    setErr(null);

    if (stats.empty) {
      setErr("Írj le legalább néhány szót az álmodból.");
      return;
    }

    setBusy(true);
    setBlockingFlow(true);

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
      const sessionId = (data as any)?.id as string | undefined;
      if (!sessionId) throw new Error("Nem jött vissza session id.");

      // ✅ BLOKKOLÓ: ne menjünk tovább, amíg a frame bundle nincs kész
      const res = await fetchWithAuth("/api/frame", {
        method: "POST",
        json: { sessionId },
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Nem sikerült előkészíteni a keretezést.");
      }

      router.push(`/session/${sessionId}/frame`);
    } catch (e: unknown) {
      setErr(safeTextFromUnknown(e));
      setBlockingFlow(false);
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
          aria-label="Infó"
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
          <p className="section-title">Rögzítés</p>

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
        </div>
      }
    >
      {/* ✅ overlay a Shell-en BELÜL, hogy absolute inset működjön */}
      <FlowLoadingOverlay
        open={blockingFlow}
        title="Keretezés készül…"
        subtitle="Cím + keretezés + 3 ajánlott irány előkészítése."
      />

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
          <div className="newdream-panel stack-tight">
            <textarea
              className="textarea-dream"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Írj le mindent, amire most emlékszel az álmodból. Elég töredékekben is."
              rows={10}
              aria-invalid={!!err}
              disabled={busy || blockingFlow}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (!busy && !blockingFlow && !stats.empty) void createSession();
                }
              }}
            />

            <div className="newdream-footer">
              <span className="badge-muted newdream-stat">
                {stats.words} szó · {stats.chars} karakter
              </span>

              <div className="newdream-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setErr(null);
                    setText("");
                  }}
                  disabled={busy || blockingFlow || !text.length}
                >
                  Törlés
                </button>

                <PrimaryButton onClick={createSession} disabled={busy || blockingFlow || stats.empty}>
                  {blockingFlow ? "Előkészítés…" : busy ? "Rögzítés…" : "Rögzítés"}
                </PrimaryButton>
              </div>
            </div>
          </div>

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
