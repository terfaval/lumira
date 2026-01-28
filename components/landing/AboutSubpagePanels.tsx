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
    title: "Új / Kezdés",
    short:
      "Innen indul minden: rögzíts pár sort arról, ami megmaradt (kép, mondat, hangulat). Nem kell szépen megírni — elég, ha később visszaidézhető.",
    long:
      "Ez az indítás adja meg a session alapját, és ebből épül fel a későbbi visszatükrözés és irányválasztás. Ha bizonytalan vagy, kezdd a töredékekkel — a rendezés ráér később.",
    href: "/new",
    cta: "Új indítása",
  },
  {
    key: "evening",
    title: "Esti tér",
    short:
      "Lefekvéshez és éjszakai ébredéshez való, kíméletesebb mód. Inkább lecsendesít és lezár, mint elemez — a saját tempódban.",
    long:
      "Az esti folyamat elkülönül a nappali, aktívabb munkától. Akkor is jó, ha csak egy finom „most elég” jelzést szeretnél a nap végén.",
    href: "/evening",
    cta: "Belépek",
  },
  {
    key: "glossary",
    title: "Álomszótár",
    short:
      "A visszatérő szavak és motívumok rendezett gyűjteménye. Segít egységesíteni a nyelvet és később könnyebben visszanézni, mi ismétlődik.",
    long:
      "Nem értelmez helyetted: inkább tisztázni segít, mit nevezel ugyanúgy újra és újra. Idővel bővülhet és finomodhat — ettől lesz stabilabb a visszanézés.",
    href: "/glossary",
    cta: "Megnyitom",
  },
  {
    key: "archive",
    title: "Archívum",
    short:
      "Régebbi sessionök visszanézése és összevetése. Akkor hasznos, amikor már van több anyagod, és kíváncsi vagy a mintákra.",
    long:
      "Itt a fókusz a változásokon és ismétlődéseken van, nem egyetlen álmon. Nyugodt tér: nem sürget, inkább áttekintést ad.",
    href: "/archive",
    cta: "Megnyitom",
  },
  {
    key: "session",
    title: "Session",
    short:
      "Egy álom teljes folyamata egy helyen: rögzítés → visszatükrözés → irány → elmélyítés → lezárás.",
    long:
      "A session nézetek ugyanannak a folyamatnak külön fókuszai. Session csak rögzítés után jön létre, ezért nincs külön belépő gombja.",
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
