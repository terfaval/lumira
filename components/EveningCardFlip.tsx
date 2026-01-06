"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/Pill";
import type { EveningCardCatalogItem } from "@/src/lib/types";
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

type Props = {
  card: EveningCardCatalogItem;
  phaseLabel: Record<PhaseKey, string>;
  intentLabel: Record<IntentKey, string>;
  huTag: (t: string) => string;
};

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

function normalizeTagKey(t: string) {
  return (t ?? "").trim().toLowerCase();
}

/** “Szükséges / környezet” – egyszerű, de hasznos heur. */
function derivePrepBullets(tags: string[], phase: PhaseKey | null) {
  const t = new Set(tags);
  const out: string[] = [];

  if (t.has("writing") || t.has("mental_offload")) out.push("Készíts elő egy papírt és tollat (ha írást kér).");
  if (t.has("breath")) out.push("Ne erőltesd a légzést; elég finoman követni.");
  if (t.has("body") || t.has("body_release")) out.push("Ha a testfigyelem túl intenzív, rövidíts vagy válts légzésre.");
  if (t.has("night_waking") || phase === "rescue") out.push("Ha éjjel ébredtél: maradj testhelyzetben, ne kezdd el „megoldani” a napot.");
  if (t.has("lucid_seed")) out.push("Egy jelzés elég; ne ismételgesd sokszor (különben élénkíthet).");
  if (out.length === 0) out.push("Csak annyit csinálj, amennyi ma belefér.");
  return out;
}

export function EveningCardFlip({ card, phaseLabel, intentLabel, huTag }: Props) {
  const [flipped, setFlipped] = useState(false);

  const goal = ((card.content as any)?.goal_md ?? "") as string;
  const meta = (card.content as any)?.meta as
    | { effect?: string; time?: string; not_recommended?: string }
    | undefined;

  const tips = (((card.content as any)?.tips ?? []) as string[]).filter(Boolean);
  const steps = (((card.content as any)?.steps ?? []) as { question?: string }[])
    .map((s) => (s?.question ?? "").trim())
    .filter(Boolean);

  const phase = getPhase(card);
  const intents = getIntents(card);
  const primaryIntent = intents[0] ?? null;

  const intentTok = intentToken(primaryIntent);
  const phaseTok = phaseToken(phase);

  const rawTags = (((card as any)?.tags ?? []) as string[]).map(normalizeTagKey).filter(Boolean);
  const prepBullets = useMemo(() => derivePrepBullets(rawTags, phase), [rawTags, phase]);

  const corner = intentTok ? `var(${intentTok.bg})` : "rgba(0,0,0,0)";
  const bgStyle = {
    background: `linear-gradient(135deg,
      var(--evening-card-paper-strong) 0%,
      var(--evening-card-paper) 45%,
      ${corner} 125%)`,
  } as const;

  return (
    <div className={styles.wrap}>
      <div className={styles.scene}>
        <div className={`${styles.card3d} ${flipped ? styles.flipped : ""}`}>
          {/* FRONT: infók */}
          <div className={styles.face} style={bgStyle}>
            <div className={styles.topRow}>
              <div className={styles.leftPills}>
                {primaryIntent ? (
                  <Pill variant="intent" colorVar={intentTok!.text}>
                    {intentLabel[primaryIntent]}
                  </Pill>
                ) : null}

                {phase ? (
                  <Pill variant="phase" colorVar={phaseTok!.text}>
                    {phaseLabel[phase]}
                  </Pill>
                ) : null}
              </div>

              {meta?.time ? <div className={styles.time}>{meta.time}</div> : null}
            </div>

            <div className={styles.title}>{card.title}</div>

            {goal ? <div className={styles.goal}>{goal}</div> : null}

            {meta?.effect ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Miről szól?</div>
                <div className={styles.long}>{meta.effect}</div>
              </div>
            ) : null}

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Hasznos, ha…</div>
              <ul className={styles.bullets}>
                {prepBullets.slice(0, 3).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>

            {meta?.not_recommended ? (
              <div className={styles.disclaimer}>
                <div className={styles.disclaimerTitle}>Mikor ne</div>
                <div className={styles.disclaimerText}>{meta.not_recommended}</div>
              </div>
            ) : null}

            {rawTags.length ? (
              <div className={styles.tagsRow}>
                {rawTags.map((t) => (
                  <Pill key={t} variant="neutral">
                    {huTag(t)}
                  </Pill>
                ))}
              </div>
            ) : null}

            <div className={`${styles.footerSticky}`}>
              <button className={`btn btn-primary ${styles.primaryWide}`} onClick={() => setFlipped(true)}>
                Indítás
              </button>
            </div>
          </div>

          {/* BACK: tippek + lépések */}
          <div className={`${styles.face} ${styles.back}`} style={bgStyle}>
            <div className={styles.topRow}>
              <div className={styles.leftPills}>
                <Pill variant="neutral">Gyakorlat</Pill>
                {meta?.time ? <Pill variant="neutral">{meta.time}</Pill> : null}
              </div>

              <button className="btn btn-secondary" onClick={() => setFlipped(false)}>
                Vissza
              </button>
            </div>

            {tips.length ? (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Tippek</div>
                <ul className={styles.bullets}>
                  {tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Lépések</div>
              <div style={{ display: "grid", gap: 10 }}>
                {steps.map((q, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: 12,
                        color: "var(--text-muted)",
                        flex: "0 0 auto",
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ lineHeight: 1.6 }}>{q}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ide később jöhet “Befejezés / naplózás” is */}
            <div className={styles.footer}>
              <button className="btn btn-primary" onClick={() => {/* később: run log */}}>
                Kész
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
