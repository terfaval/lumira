"use client";

import { useMemo, useState } from "react";
import type { EveningCardCatalogItem } from "@/src/lib/types";
import { Pill } from "@/components/Pill";
import styles from "./EveningCardFlip.module.css";

type PhaseKey = "prep" | "in_bed" | "rescue";
type IntentKey =
  | "emlekezet"
  | "tudatossag"
  | "lecsendesites"
  | "biztonsag"
  | "kreativ_inkubacio"
  | "irany_es_jelentes"
  | "test_es_jelenlet";

type ViewPhase = "overview" | "practice" | "rest";

type Props = {
  card: EveningCardCatalogItem;

  phaseLabel: Record<PhaseKey, string>;
  intentLabel: Record<IntentKey, string>;
  getPhase: (card: EveningCardCatalogItem) => PhaseKey | null;
  getIntents: (card: EveningCardCatalogItem) => IntentKey[];

  intentToken: (intent: IntentKey | null) => { text: `--${string}`; bg: `--${string}` } | null;
  phaseToken: (phase: PhaseKey | null) => { text: `--${string}`; bg: `--${string}` } | null;

  huTag: (t: string) => string;

  onClose: () => void;

  // page végzi a DB insertet; ha sikerült, hívjuk onSaved()-et
  onSave: () => Promise<void>;
  saving: boolean;
  error: string | null;
};

function LampIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 3a7 7 0 0 0-4 12c.6.5 1 1.3 1.1 2h5.8c.1-.7.5-1.5 1.1-2A7 7 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function normalizeTagKey(t: string) {
  return (t ?? "").trim().toLowerCase();
}

export function EveningCardFlip({
  card,
  phaseLabel,
  intentLabel,
  getPhase,
  getIntents,
  intentToken,
  phaseToken,
  huTag,
  onClose,
  onSave,
  saving,
  error,
}: Props) {
  const [view, setView] = useState<ViewPhase>("overview");

  const p = getPhase(card);
  const intents = getIntents(card);
  const primaryIntent = intents[0] ?? null;

  const intentTok = intentToken(primaryIntent);
  const phaseTok = phaseToken(p);

  const meta = (card.content as any)?.meta as
    | { time?: string; effect?: string; not_recommended?: string }
    | undefined;

  const time = (meta?.time ?? "").trim();
  const effect = (meta?.effect ?? "").trim();
  const notRec = (meta?.not_recommended ?? "").trim();
  const goal = (((card.content as any)?.goal_md ?? "") as string).trim();

  const tips = (((card.content as any)?.tips ?? []) as string[]).filter((x) => (x ?? "").trim().length > 0);
  const steps = (((card.content as any)?.steps ?? []) as { question?: string }[])
    .map((s) => ({ question: (s?.question ?? "").trim() }))
    .filter((s) => s.question.length > 0);

  const overlayTags = useMemo(() => {
    const raw = (((card as any)?.tags ?? []) as string[]).map(normalizeTagKey).filter(Boolean);
    return raw.slice(0, 6);
  }, [card]);

  const bgCorner = intentTok ? `var(${intentTok.bg})` : "rgba(0,0,0,0)";
  const paperBg = `linear-gradient(135deg,
    var(--evening-card-paper-strong) 0%,
    var(--evening-card-paper) 42%,
    ${bgCorner} 110%)`;

  // 0 = overview (front), 180 = practice (back), 360 = rest (front again)
  const rot = view === "overview" ? 0 : view === "practice" ? 180 : 360;

  async function handleSaveAndRest() {
    await onSave();
    // ha a page error-t állít, az itt is megjelenik; viszont rest csak siker után
    // (ha error van, view marad practice)
    setView("rest");
  }

  return (
    <div className={styles.flip3d} style={{ transform: `rotateY(${rot}deg)` }}>
      {/* FRONT = OVERVIEW + REST */}
      <div className={styles.face} style={{ background: paperBg }}>
        {/* header ~ tile */}
        <div className={styles.top}>
          <div className={styles.left}>

          {primaryIntent ? (
              <Pill variant="intent" colorVar={intentTok!.text}>
                {intentLabel[primaryIntent]}
              </Pill>
            ) : null}

            {p ? (
              <Pill variant="phase" colorVar={phaseTok!.text}>
                {phaseLabel[p]}
              </Pill>
            ) : null}
          </div>

          </div>

        <div className={styles.mid}>
          <div className={styles.title}>{card.title}</div>
        </div>

        {view === "rest" ? (
          <>
            <div className={styles.block}>
              <div className={styles.restTitle}>Jó pihenést és szép álmokat.</div>
              <div className={styles.restText}>
                Ha szeretnéd, reggel egy rövid visszatekintéssel rögzítheted, ami megmaradt.
              </div>
            </div>

            <div className={styles.ctaRow}>
              <button className="btn btn-primary" onClick={onClose}>
                Kész
              </button>
            </div>

            {error ? <div className={styles.inlineError}>{error}</div> : null}
          </>
        ) : (
          <>
            <div className={styles.block}>
              {effect ? <div className={styles.effect}>{effect}</div> : null}

              {time ? (
              <Pill variant="neutral">
                      {time}
                    </Pill>
                  ) : null}
                  
              {overlayTags.length ? (
                <div className={styles.tagsRow}>
                  {overlayTags.map((t) => (
                    <Pill key={t} variant="neutral">
                      {huTag(t)}
                    </Pill>
                  ))}
                </div>
              ) : null}

              {notRec ? (
                <div className={styles.notrec}>
                  <div className={styles.notrecTitle}>Mikor ne</div>
                  <div className={styles.notrecText}>{notRec}</div>
                </div>
              ) : null}
            </div>

            <div className={styles.ctaRow}>
              <button className="btn btn-primary" onClick={() => setView("practice")}>
                Indítás
              </button>
            </div>

            {error ? <div className={styles.inlineError}>{error}</div> : null}
          </>
        )}
      </div>

      {/* BACK = PRACTICE */}
      <div className={`${styles.face} ${styles.back}`} style={{ background: paperBg }}>
        {/* header ~ tile */}
        <div className={styles.top}>
          <div className={styles.left}>
            {primaryIntent ? (
              <Pill variant="intent" colorVar={intentTok!.text}>
                {intentLabel[primaryIntent]}
              </Pill>
            ) : null}

            {p ? (
              <Pill variant="phase" colorVar={phaseTok!.text}>
                {phaseLabel[p]}
              </Pill>
            ) : null}
          </div>

          {time ? <div className={styles.time}>{time}</div> : null}
        </div>

        <div className={styles.mid}>
          <div className={styles.title}>{card.title}</div>
        </div>

        {/* tips block with lamp */}
        <div className={`${styles.block} ${styles.tipsBlock}`}>
          <div className={styles.lamp}>
            <LampIcon />
          </div>

          <div className={styles.tips}>
            <div className={styles.sectionTitle}>Tippek</div>
            {tips.length ? (
              <ul className={styles.tipsList}>
                {tips.slice(0, 5).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <div className={styles.mutedSmall}>Nincs külön tipp ehhez a kártyához.</div>
            )}
          </div>
        </div>

        {/* steps */}
        <div className={styles.block}>
          <div className={styles.sectionTitle}>Lépések</div>

          {steps.length ? (
            <div className={styles.steps}>
              {steps.map((s, idx) => (
                <div key={idx} className={styles.stepRow}>
                  <div className={styles.stepNum}>{idx + 1}</div>
                  <div className={styles.stepText}>{s.question}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.mutedSmall}>Nincsenek lépések ehhez a kártyához.</div>
          )}
        </div>

        <div className={styles.ctaRow}>
          <button className="btn btn-secondary" onClick={() => setView("overview")} disabled={saving}>
            Vissza
          </button>

          <button className="btn btn-primary" onClick={handleSaveAndRest} disabled={saving}>
            {saving ? "Mentés…" : "Kész vagyok"}
          </button>
        </div>

        {error ? <div className={styles.inlineError}>{error}</div> : null}
      </div>
    </div>
  );
}
