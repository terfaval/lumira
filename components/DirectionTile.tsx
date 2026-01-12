// /components/DirectionTile.tsx
"use client";

import { Pill } from "@/components/Pill";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import styles from "./DirectionTile.module.css";
import type { DirectionCatalogItem } from "@/src/lib/types";

type Props = {
  dir: DirectionCatalogItem;

  groupKey: "memory" | "somatic" | "patterns" | "meaning" | "creative" | "other";
  groupLabel: string;
  token: { text: `--dirgroup-${string}`; bg: `--dirgroup-${string}-bg` };

  chosen: boolean;
  tags: string[];

  onOpen: (slug: string, originRect?: DOMRect) => void;
};

export function DirectionTile({ dir, groupLabel, token, chosen, tags, onOpen }: Props) {
  const micro = ((dir as any)?.content?.micro_description ?? dir.description ?? "") as string;

  function openFrom(el: HTMLElement | null) {
    const rect = el?.getBoundingClientRect();
    onOpen(dir.slug, rect);
  }

  return (
    <GlassCardSurface
      className={`${styles.wrap} ${styles.card}`}
      role="button"
      tabIndex={0}
      variant="soft"
      paper="evening"
      corner={token?.bg ?? null}
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
          <Pill variant="neutral" colorVar={token.text} bgVar={token.bg}>
            {groupLabel}
          </Pill>

          {chosen ? <Pill variant="neutral">Korábban kiválasztva</Pill> : null}
        </div>
      </div>

      {/* MID */}
      <div className={styles.mid}>
        <div className={styles.title}>{dir.title}</div>
        {micro ? <div className={styles.body}>{micro}</div> : null}
      </div>

      {/* BOTTOM */}
      <div className={styles.bottom}>
        {tags.length
          ? tags.map((t) => (
              <Pill key={t} variant="neutral">
                {t}
              </Pill>
            ))
          : null}

        <span className={styles.hint}>
          Megnyitás <span aria-hidden="true">→</span>
        </span>
      </div>
    </GlassCardSurface>
  );
}