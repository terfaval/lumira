"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import type { EveningCardCatalogItem } from "@/src/lib/types";
import { EveningCardTile } from "@/components/EveningCardTile";
import { EveningCardFlip } from "@/components/EveningCardFlip";
import styles from "./LandingPage.module.css";

type PhaseKey = "prep" | "in_bed" | "rescue";
type IntentKey =
  | "emlekezet"
  | "tudatossag"
  | "lecsendesites"
  | "biztonsag"
  | "kreativ_inkubacio"
  | "irany_es_jelentes"
  | "test_es_jelenlet";

const PHASE_LABEL: Record<PhaseKey, string> = {
  prep: "Előkészítés",
  in_bed: "Elalvás előtt",
  rescue: "Éjjeli mentés",
};

const INTENT_LABEL: Record<IntentKey, string> = {
  lecsendesites: "Lecsengés",
  biztonsag: "Biztonság",
  emlekezet: "Emlékezet",
  tudatossag: "Tudatosság",
  kreativ_inkubacio: "Inkubáció",
  irany_es_jelentes: "Irány / Jelentés",
  test_es_jelenlet: "Test / Jelenlét",
};

const TAG_HU: Record<string, string> = {
  mental_offload: "Fej kiürítése",
  downshift: "Lecsengés",
  sleep_onset: "Elalvás",
  night_waking: "Visszaalvás",
  dream_recall: "Álomemlékezet",
  lucid_seed: "Lucid nyitás",
  nightmare_relief: "Rémálom-relax",
  emotion_settle: "Érzelmi lecsendesítés",
  body_release: "Testi oldás",
  safety_settle: "Biztonságérzet",
  meaning_seed: "Jelentés hangolás",
  learning_settle: "Tanulás ülepedése",
  creativity_seed: "Kreatív nyitás",
  habit_seed: "Szokás indítása",
  day_close: "Napi lezárás",
  writing: "Írás",
  breath: "Légzés",
  body: "Testérzet",
  imagery: "Képzelet",
  phrase: "Belső mondat",
  review: "Visszatekintés",
  planning: "Finom tervezés",
  setup: "Előkészítés",
};

function huTag(t: string): string {
  return TAG_HU[t] ?? t;
}

function normalizeTagKey(t: string) {
  return (t ?? "").trim().toLowerCase();
}

function getPhase(card: EveningCardCatalogItem): PhaseKey | null {
  const p = (card?.content as any)?.phase;
  const allowed = new Set<PhaseKey>(["prep", "in_bed", "rescue"]);
  return typeof p === "string" && allowed.has(p as PhaseKey) ? (p as PhaseKey) : null;
}

function getIntents(card: EveningCardCatalogItem): IntentKey[] {
  const intents = (card?.content as any)?.intents;
  const allowed = new Set<IntentKey>([
    "emlekezet",
    "tudatossag",
    "lecsendesites",
    "biztonsag",
    "kreativ_inkubacio",
    "irany_es_jelentes",
    "test_es_jelenlet",
  ]);
  if (!Array.isArray(intents)) return [];
  return intents.filter((x): x is IntentKey => typeof x === "string" && allowed.has(x as IntentKey));
}

function intentToken(intent: IntentKey | null) {
  if (!intent) return null;
  return { text: `--intent-${intent}` as const, bg: `--intent-${intent}-bg` as const };
}

function phaseToken(phase: PhaseKey | null) {
  if (!phase) return null;
  return { text: `--phase-${phase}` as const, bg: `--phase-${phase}-bg` as const };
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleDeterministic<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function EveningPreview() {
  const [cards, setCards] = useState<EveningCardCatalogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const seedRef = useRef<number>(0);
  if (!seedRef.current) seedRef.current = Math.floor(Date.now() % 2147483647);

  useEffect(() => {
    (async () => {
      setErr(null);
      const { data, error } = await supabase
        .from("evening_card_catalog")
        .select("slug, title, is_active, content, tags, sort_order, version")
        .eq("is_active", true);

      if (error) setErr(error.message);
      else setCards((data ?? []) as EveningCardCatalogItem[]);
    })();
  }, []);

  useEffect(() => {
    if (!openSlug) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openSlug]);

  useEffect(() => {
    if (!openSlug) return;
    closeBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeOverlay();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlug]);

  const orderedCards = useMemo(() => {
    const hour = new Date().getHours();
    const isNight = hour >= 0 && hour <= 6;

    const rescue = cards.filter((c) => getPhase(c) === "rescue");
    const other = cards.filter((c) => getPhase(c) !== "rescue");

    const otherShuffled = shuffleDeterministic(other, seedRef.current);
    const rescueShuffled = shuffleDeterministic(rescue, seedRef.current ^ 1337);

    return isNight ? [...rescueShuffled, ...otherShuffled] : [...otherShuffled, ...rescueShuffled];
  }, [cards]);

  const previewCards = useMemo(() => orderedCards.slice(0, 3), [orderedCards]);

  const openCard = useMemo(() => {
    return openSlug ? cards.find((c) => c.slug === openSlug) ?? null : null;
  }, [openSlug, cards]);

  function openOverlay(slug: string, rect?: DOMRect) {
    setSaveError(null);
    setOriginRect(rect ?? null);
    setOpenSlug(slug);
    setOpening(true);
    requestAnimationFrame(() => setOpening(false));
  }

  function closeOverlay() {
    setOpenSlug(null);
    setOriginRect(null);
    setOpening(false);
    setSaving(false);
    setSaveError(null);
  }

  function computeGrowStyle(rect: DOMRect | null, isOpening: boolean): React.CSSProperties {
    if (typeof window === "undefined") return {};

    const targetW = Math.min(860, window.innerWidth - 32);
    const targetH = Math.min(900, Math.floor(window.innerHeight * 0.86));
    const targetLeft = (window.innerWidth - targetW) / 2;
    const targetTop = (window.innerHeight - targetH) / 2;

    if (!rect) {
      return {
        transform: isOpening ? "scale(0.98) translateY(8px)" : "scale(1) translateY(0)",
        opacity: isOpening ? 0.75 : 1,
      };
    }

    const fromCX = rect.left + rect.width / 2;
    const fromCY = rect.top + rect.height / 2;
    const toCX = targetLeft + targetW / 2;
    const toCY = targetTop + targetH / 2;

    const dx = fromCX - toCX;
    const dy = fromCY - toCY;

    const sx = Math.max(0.06, rect.width / targetW);
    const sy = Math.max(0.06, rect.height / targetH);
    const s = Math.min(sx, sy);

    if (isOpening) {
      return {
        transform: `translate(${dx}px, ${dy}px) scale(${s})`,
        opacity: 0.6,
      };
    }

    return { transform: "translate(0px, 0px) scale(1)", opacity: 1 };
  }

  async function saveUsage() {
    if (!openCard) return;
    setSaving(true);
    setSaveError(null);

    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id ?? null;
      if (!userId) return;

      const contentMeta = (openCard.content as any)?.meta;
      const version = openCard.version ?? contentMeta?.version ?? null;

      const { error } = await supabase.from("evening_card_usage_log").insert({
        user_id: userId,
        card_slug: openCard.slug,
        version,
      });

      if (error) throw error;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Nem sikerült menteni a befejezést.";
      setSaveError(message);
      throw e;
    } finally {
      setSaving(false);
    }
  }

  function renderCardTile(c: EveningCardCatalogItem) {
    const rawTags = (((c as any)?.tags ?? []) as string[]).map(normalizeTagKey).filter(Boolean);
    const tags = rawTags.slice(0, 2);

    return (
      <EveningCardTile
        key={c.slug}
        card={c}
        phaseLabel={PHASE_LABEL}
        intentLabel={INTENT_LABEL}
        getPhase={getPhase}
        getIntents={getIntents}
        intentToken={intentToken}
        phaseToken={phaseToken}
        tags={tags}
        huTag={huTag}
        onOpen={openOverlay}
      />
    );
  }

  return (
    <div className={styles.eveningGrid}>
      {err ? <div className={styles.cardBody}>{err}</div> : null}
      {previewCards.map((c) => renderCardTile(c))}

      {openSlug && openCard && (
        <div
          className="flip-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeOverlay();
          }}
        >
          <button
            className="flip-x"
            aria-label="Bezárás"
            onClick={closeOverlay}
            ref={closeBtnRef}
            type="button"
          >
            ×
          </button>

          <div className="flip-shell" style={computeGrowStyle(originRect, opening)}>
            <EveningCardFlip
              card={openCard}
              phaseLabel={PHASE_LABEL}
              intentLabel={INTENT_LABEL}
              getPhase={getPhase}
              getIntents={getIntents}
              intentToken={intentToken}
              phaseToken={phaseToken}
              huTag={huTag}
              onClose={closeOverlay}
              onSave={saveUsage}
              saving={saving}
              error={saveError}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .flip-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(0, 0, 0, 0.58);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-3);
        }

        .flip-shell {
          width: min(860px, 100%);
          max-height: min(92vh, 860px);
          overflow: auto;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--bg);
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.55);
          padding: var(--space-2);

          transform-origin: center;
          transition: transform 320ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 220ms ease-out;
          will-change: transform, opacity;
        }

        .flip-x {
          position: fixed;
          top: 18px;
          right: 18px;
          z-index: 70;

          width: 44px;
          height: 44px;
          border-radius: 14px;

          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(0, 0, 0, 0.35);
          color: rgba(255, 255, 255, 0.92);

          font-size: 28px;
          line-height: 1;
          display: grid;
          place-items: center;

          backdrop-filter: blur(8px);
          transition: transform 120ms ease;
        }

        .flip-x:hover {
          transform: scale(1.03);
        }
      `}</style>
    </div>
  );
}
