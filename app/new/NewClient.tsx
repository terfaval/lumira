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

export default function NewClient() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blockingFlow, setBlockingFlow] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const [step, setStep] = useState<"index" | "synth" | "frame" | "idle">("idle");

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const chars = text.length;
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const empty = !trimmed;
    return { chars, words, empty };
  }, [text]);

  async function fetchActiveSlugs(): Promise<string[]> {
    const { data, error } = await supabase
      .from("direction_catalog")
      .select("slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("slug", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: any) => r.slug).filter(Boolean);
  }

  async function createSession() {
    setErr(null);

    if (stats.empty) {
      setErr("Írj le legalább néhány szót az álmodból.");
      return;
    }

    setBusy(true);
    setBlockingFlow(true);
    setStep("idle");

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

      // 1) INDEX
      setStep("index");
      {
        const res = await fetchWithAuth("/api/index-session", {
          method: "POST",
          json: { session_id: sessionId, dream_text: text, force: true },
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || "Indexelés nem sikerült.");
        }
      }

      // 2) SYNTHESIZE
      setStep("synth");
      const activeSlugs = await fetchActiveSlugs().catch(() => []);
      {
        const res = await fetchWithAuth("/api/synthesize", {
          method: "POST",
          json: {
            session_id: sessionId,
            dream_text: text,
            history: [],
            prior_echoes: [],
            allowed_slugs: activeSlugs,
          },
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || "Latens szintézis nem sikerült.");
        }
      }

      // 3) FRAME
      setStep("frame");
      {
        const res = await fetchWithAuth("/api/frame", {
          method: "POST",
          json: { sessionId },
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || "Nem sikerült előkészíteni a keretezést.");
        }
      }

      router.push(`/session/${sessionId}/frame`);
    } catch (e: unknown) {
      setErr(safeTextFromUnknown(e));
      setBlockingFlow(false);
      setStep("idle");
    } finally {
      setBusy(false);
    }
  }

  const overlayTitle =
    step === "index"
      ? "Indexelés készül…"
      : step === "synth"
      ? "Latens szintézis készül…"
      : step === "frame"
      ? "Keretezés készül…"
      : "Előkészítés…";

  const overlaySubtitle =
    step === "index"
      ? "Horgony-összefoglaló és beágyazás."
      : step === "synth"
      ? "Fókuszpontok és irányjelöltek előkészítése."
      : step === "frame"
      ? "Cím + keretezés + 3 ajánlott irány."
      : "Álom feldolgozásának előkészítése.";

  // subtle corner hint (can be swapped later)
  const cornerSoft = "rgba(255,255,255,0.08)";

  return (
    <Shell
      title="Új álom rögzítése"
      space="dream"
      surface="none" // ✅ fontos: ne legyen Shell card wrapper, mert mi adjuk a fő felületet
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

      <>
        <GlassCardSurface
          variant="soft"
          paper="evening"
          corner={cornerSoft}
          cornerMode="soft"
          // (ha később kell, helyben felülírható)
          // gloss={false}
          // grain={false}
        >
          <GlassCardForeground className="stack-tight">
            <GlassCardMatte padding="md" tone="evening">
              <textarea
                className="newdream-textarea"
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
                  disabled={busy || blockingFlow || !text.length}
                >
                  Törlés
                </button>

                <PrimaryButton onClick={createSession} disabled={busy || blockingFlow || stats.empty}>
                  {blockingFlow ? "Előkészítés…" : busy ? "Rögzítés…" : "Rögzítés"}
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
      </>

      <style jsx>{`
        /* textarea becomes "content", not a surface */
        :global(.newdream-textarea) {
          width: 100%;
          min-height: 44vh;

          background: transparent;
          border: none;
          outline: none;

          resize: vertical;

          color: rgba(255, 255, 255, 0.92);
          font-size: 15px;
          line-height: 1.65;
          letter-spacing: -0.01em;
        }

        :global(.newdream-textarea::placeholder) {
          color: rgba(255, 255, 255, 0.55);
        }
      `}</style>
    </Shell>
  );
}