"use client";

import { Pill } from "@/components/Pill";
import styles from "./EveningCardTile.module.css";
import type { EveningCardCatalogItem } from "@/src/lib/types";

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
  getPhase: (card: EveningCardCatalogItem) => PhaseKey | null;
  getIntents: (card: EveningCardCatalogItem) => IntentKey[];
  intentToken: (intent: IntentKey | null) => { text: `--${string}`; bg: `--${string}` } | null;
  phaseToken: (phase: PhaseKey | null) => { text: `--${string}`; bg: `--${string}` } | null;

  tags: string[];
  huTag: (t: string) => string;

  onOpen: (slug: string) => void;
};

export function EveningCardTile({
  card,
  phaseLabel,
  intentLabel,
  getPhase,
  getIntents,
  intentToken,
  phaseToken,
  tags,
  huTag,
  onOpen,
}: Props) {
  const m = (card.content as any)?.meta as { time?: string } | undefined;
  const time = m?.time ?? "";
  const goal = ((card.content as any)?.goal_md ?? "") as string;

  const p = getPhase(card);
  const intents = getIntents(card);
  const primaryIntent = intents[0] ?? null;

  const intentTok = intentToken(primaryIntent);
  const phaseTok = phaseToken(p);

  const bgCorner = intentTok ? `var(${intentTok.bg})` : "rgba(0,0,0,0)";

  return (
    <div
      className={`${styles.wrap} ${styles.card}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(card.slug)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(card.slug);
      }}
      style={{
        background: `linear-gradient(135deg,
          var(--evening-card-paper-strong) 0%,
          var(--evening-card-paper) 42%,
          ${bgCorner} 110%)`,
      }}
    >
      {/* TOP */}
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

      {/* MID */}
      <div className={styles.mid}>
        <div className={styles.title}>{card.title}</div>
        {goal ? <div className={styles.body}>{goal}</div> : null}
      </div>

      {/* BOTTOM */}
      <div className={styles.bottom}>
        {tags.length
          ? tags.map((t) => (
              <Pill key={t} variant="neutral">
                {huTag(t)}
              </Pill>
            ))
          : null}
      </div>
    </div>
  );
}
