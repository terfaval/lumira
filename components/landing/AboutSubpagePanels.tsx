"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import styles from "./LandingPage.module.css";

type Panel = {
  key: string;
  title: string;
  short: string;
  long?: string;
  href?: string;
  cta?: string;
};

const PANELS: Panel[] = [
  {
    key: "new",
    title: "Álmok rögzítése",
    short:
      "Itt kezdődik minden: írd le gyorsan, ami megmaradt az álomból — képek, mondatok, hangulat. Nem kell szépen megfogalmazni, csak legyen meg az emlék nyoma.",
    long:
      "Használhatod reggel pár perc alatt, mielőtt szétesik a történet. Ha csak töredéked van, az is elég — később bármikor visszajöhetsz kibontani.",
    href: "/new",
    cta: "Rögzítek",
  },
  {
    key: "work",
    title: "Álommunka",
    short:
      "Ez a rögzített álom „munkaterülete”: itt nézed vissza tisztán, mi maradt meg, és ha szeretnéd, innen tudsz továbbmenni. Lépésről lépésre halad, és bármikor megállhatsz.",
    long:
      "Az Álommunka nem fejti meg helyetted az álmot — inkább keretet ad a figyelmednek. Lehet belőle pár perces visszanézés, de lehet finom elmélyítés is, attól függően, mire van ma energiád.",
    // nincs href szándékosan (session csak rögzítés után)
  },
  {
    key: "dreamlog",
    title: "Álomnapló",
    short:
      "A korábbi álmaid és sessionjeid gyűjteménye. Itt tudsz visszanézni, összevetni, és idővel észrevenni ismétlődéseket.",
    long:
      "A napló akkor lesz igazán izgalmas, amikor már van pár bejegyzésed. Nem kell elemezni: elég néha ránézni, és hagyni, hogy kirajzolódjanak a minták.",
    href: "/archive",
    cta: "Megnyitom",
  },
  {
    key: "glossary",
    title: "Álomszótár",
    short:
      "A visszatérő motívumok és szavak helye — akkor a leghasznosabb, amikor már több álmod van. Segít egyre tisztábban ugyanazokat a dolgokat ugyanúgy nevezni.",
    long:
      "Itt tudod finoman rendezni a saját szavaidat és visszatérő képeidet. Nem kötelező, de hosszabb távon sokat ad a következetes visszanézéshez.",
    href: "/glossary",
    cta: "Megnyitom",
  },
];


function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transformOrigin: "50% 50%",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 160ms ease",
        }}
      />
    </svg>
  );
}

export function AboutSubpagePanels() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsAuthed(!!data?.user);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={styles.aboutPanelsGrid}>
      {PANELS.map((p) => {
        const expanded = openKey === p.key;
        const hasLong = !!p.long;

        return (
          <GlassCardSurface
            key={p.key}
            className={`${styles.glassCard} ${styles.gridCard}`}
            variant="soft"
            paper="evening"
          >
            <div className={`${styles.gridCardHeader} ${styles.aboutCardHeader}`}>
              <div className={styles.cardTitle}>{p.title}</div>

              {hasLong ? (
                <button
                  type="button"
                  className={styles.expandToggle}
                  aria-expanded={expanded}
                  aria-label={expanded ? "Bezárás" : "Bővebben"}
                  onClick={() => setOpenKey(expanded ? null : p.key)}
                >
                  <Chevron expanded={expanded} />
                </button>
              ) : (
                <span className={styles.expandToggleSpacer} aria-hidden="true" />
              )}
            </div>

            <div className={styles.gridCardBody}>
              <div className={styles.cardBody}>{p.short}</div>

              {hasLong && expanded ? (
                <div className={`${styles.cardBody} ${styles.aboutLongBody}`}>{p.long}</div>
              ) : null}

              {isAuthed && p.href && p.cta ? (
                <div className={styles.aboutCardActions}>
                  <Link href={p.href} className="btn btn-secondary">
                    {p.cta}
                  </Link>
                </div>
              ) : null}
            </div>
          </GlassCardSurface>
        );
      })}
    </div>
  );
}
