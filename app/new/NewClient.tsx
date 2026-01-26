"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  GlassCardForeground,
  GlassCardMatte,
  GlassCardSurface,
} from "@/components/GlassCardSurface/GlassCardSurface";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
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

type Step = "idle" | "ensure";

export default function NewClient() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // sanity: egyetlen “blocking” jelző elég a UI tiltására + overlayre
  const [blockingFlow, setBlockingFlow] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");

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

    // sanity: az állapotok egy helyen
    setBlockingFlow(true);
    setStep("idle");

    try {
      const userId = await requireUserId();

      const sessionInsert = {
        user_id: userId,
        status: "draft",
      };

      if (
        process.env.NODE_ENV !== "production" &&
        Object.prototype.hasOwnProperty.call(sessionInsert, "raw_entry")
      ) {
        // Guard against accidental legacy writes in v0.
        throw new Error("Unexpected raw_entry in dream_sessions insert payload.");
      }

      const { data, error } = await supabase
        .from("dream_sessions")
        .insert(sessionInsert)
        .select("id")
        .single();

      if (error) throw error;
      const sessionId = (data as any)?.id as string | undefined;
      if (!sessionId) throw new Error("Nem jött vissza session id.");

      const { error: entryError } = await supabase.from("dream_entries").insert({
        session_id: sessionId,
        user_id: userId,
        kind: "raw",
        content: text,
      });
      if (entryError) throw entryError;

      // 1) ENSURE / INDEX
      setStep("ensure");
      {
        const res = await fetchWithAuth("/api/session/ensure", {
          method: "POST",
          json: { session_id: sessionId, force: true },
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || "Nem sikerült előkészíteni a keretezést.");
        }
      }

      // success: hagyjuk az overlayt aktívan, amíg navigálunk
      router.push(`/session/${sessionId}/frame`);
    } catch (e: unknown) {
      setErr(safeTextFromUnknown(e));
      setBlockingFlow(false);
      setStep("idle");
    }
  }

  const overlayTitle = step === "ensure" ? "Keretezés készül…" : "Előkészítés…";
  const overlaySubtitle =
    step === "ensure" ? "Cím + keretezés + 3 ajánlott irány." : "Álom feldolgozásának előkészítése.";

  // subtle corner hint (can be swapped later)
  const cornerSoft = "rgba(255,255,255,0.08)";

  const isDisabled = blockingFlow;

  return (
    <Shell
      title="Új álom rögzítése"
      space="dream"
      surface="none"
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
            Itt csak a rögzítés a cél. Nem kell szépen megfogalmazni, nem kell “értelmes” legyen. Amit
            most ki tudsz menteni, az később is dolgozható.
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
      <FlowLoadingOverlay open={blockingFlow} title={overlayTitle} subtitle={overlaySubtitle} />

      <div className="newdream-screen">
        <GlassCardSurface
          variant="soft"
          paper="evening"
          corner={cornerSoft}
          cornerMode="soft"
          className="newdream-card"
        >
          <GlassCardForeground className="newdream-card-body stack-tight">
            <GlassCardMatte padding="md" tone="evening" className="newdream-input-wrap">
              <textarea
                className="newdream-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Írj le mindent, amire most emlékszel az álmodból. Elég töredékekben is."
                rows={10}
                aria-invalid={!!err}
                disabled={isDisabled}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    if (!isDisabled && !stats.empty) void createSession();
                  }
                }}
              />
            </GlassCardMatte>

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
                  disabled={isDisabled || !text.length}
                >
                  Törlés
                </button>

                <PrimaryButton onClick={createSession} disabled={isDisabled || stats.empty}>
                  {blockingFlow ? "Előkészítés…" : "Rögzítés"}
                </PrimaryButton>
              </div>
            </div>
          </GlassCardForeground>
        </GlassCardSurface>

        {err && (
          <div className="newdream-error" role="alert">
            {err}
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.newdream-card-body) {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          height: 100%;
          min-height: 0;
        }

        :global(.newdream-card) {
          flex: 1 1 auto;
          display: flex;
          min-height: 0;
        }

        .newdream-screen {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          min-height: 0;
        }

        :global(.newdream-input-wrap) {
          flex: 1 1 auto;
          display: flex;
          min-height: 0;
        }

        :global(.newdream-textarea) {
          width: 100%;
          min-height: 44vh;
          flex: 1 1 auto;

          background: transparent;
          border: none;
          outline: none;

          /* sanity: belső scroll -> a page nem ragad be */
          overflow: auto;
          -webkit-overflow-scrolling: touch;

          resize: vertical;

          color: rgba(255, 255, 255, 0.92);
          font-size: 15px;
          line-height: 1.65;
          letter-spacing: -0.01em;
        }

        :global(.newdream-textarea::placeholder) {
          color: rgba(255, 255, 255, 0.55);
        }

        @media (max-width: 720px) {
          :global(.newdream-card) {
            background: transparent !important;
            border: none;
            box-shadow: none;
            padding: 0;

            /* fontos: ne kényszeríts fix 100dvh-t; inkább természetes layout */
            min-height: 0;
          }

          :global(.newdream-card)::before,
          :global(.newdream-card)::after {
            opacity: 0;
          }

          :global(.newdream-input-wrap) {
            border: none;
            background: transparent;
            box-shadow: none;
            padding: 0;
          }

          :global(.newdream-textarea) {
            min-height: 42vh;
            font-size: 16px; /* iOS zoom-avoid */
            resize: none;
          }

          :global(.newdream-footer) {
            padding: var(--space-2) 0;
            padding-bottom: calc(var(--space-2) + var(--safe-bottom));
            background: var(--bg-layer);
            border-top: 1px solid var(--line-soft);
          }

          :global(.newdream-actions) {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </Shell>
  );
}
