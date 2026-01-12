"use client";

import { Pill } from "@/components/Pill";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
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

  // ✅ változott: rect is megy
  onOpen: (slug: string, originRect?: DOMRect) => void;
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

  function openFrom(el: HTMLElement | null) {
    const rect = el?.getBoundingClientRect();
    onOpen(card.slug, rect);
  }

  return (
    <GlassCardSurface
      className={`${styles.wrap} ${styles.card}`}
      role="button"
      tabIndex={0}
      variant="soft"
      paper="evening"
      corner={intentTok ? intentTok.bg : null}
      onClick={(e) => openFrom(e.currentTarget as HTMLElement)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openFrom(e.currentTarget as HTMLElement);
        }
      }}
    >
      {/* TOP */}
      <div className={styles.top}>
        <div className={styles.left}>
          {primaryIntent ? (
            <Pill variant="intent" colorVar={intentTok!.text} bgVar={intentTok!.bg}>
              {intentLabel[primaryIntent]}
            </Pill>
          ) : null}

          {p ? (
            <Pill variant="phase" colorVar={phaseTok!.text} bgVar={phaseTok!.bg}>
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
    </GlassCardSurface>
  );
}