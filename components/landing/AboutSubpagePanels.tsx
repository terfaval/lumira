"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import styles from "./LandingPage.module.css";

type Panel = {
  key: string;
  title: string;
  short: string; // mindig látszik
  long?: string; // kibontva látszik
  href?: string; // ha van és authed, lesz "Ugrás" gomb
  cta?: string;
};

const PANELS: Panel[] = [
  {
    key: "new",
    title: "Új / Kezdés",
    short:
      "Innen indul minden: rögzíts pár sort arról, ami megmaradt (kép, mondat, hangulat). Nem kell szépen megírni — elég, ha később visszaidézhető.",
    long:
      "Ez az indítás adja meg a session alapját, és ebből épül fel a későbbi visszatükrözés és irányválasztás. Ha bizonytalan vagy, itt a legkevesebb az elvárás: kezdd a töredékekkel, a rendszer később segít rendezni.",
    href: "/new",
    cta: "Új indítása",
  },
  {
    key: "evening",
    title: "Esti tér",
    short:
      "Lefekvéshez és éjszakai ébredéshez való, kíméletesebb mód. Inkább lecsendesít és lezár, mint elemez — a saját tempódban.",
    long:
      "Az esti folyamat külön térben fut, hogy ne keveredjen a nappali, aktívabb munkával. Akkor is hasznos, ha csak egy kis rendet szeretnél a fejedben, vagy egy finom „most elég” jelzést a nap végén.",
    href: "/evening",
    cta: "Belépek",
  },
  {
    key: "glossary",
    title: "Álomszótár",
    short:
      "A visszatérő szavak és motívumok rendezett gyűjteménye. Segít egységesíteni a nyelvet és később könnyebben visszanézni, mi ismétlődik.",
    long:
      "Nem értelmez helyetted, inkább tisztázni segít: mi az, amit te ugyanúgy nevezel újra és újra. Idővel bővülhet, finomodhat — és ettől lesz a rendszer egyre következetesebb és személyesebb.",
    href: "/glossary",
    cta: "Megnyitom",
  },
  {
    key: "archive",
    title: "Archívum",
    short:
      "Régebbi sessionök visszanézése és összevetése. Akkor hasznos, amikor már van több anyagod, és kíváncsi vagy a mintákra.",
    long:
      "Itt a fókusz nem egyetlen álmon van, hanem azon, hogyan alakulnak a visszatérő elemek és hangsúlyok. Nyugodt tér: nem sürget, inkább áttekintést ad.",
    href: "/archive",
    cta: "Megnyitom",
  },
  {
    key: "session",
    title: "Session",
    short:
      "Egy álom teljes folyamata egy helyen: rögzítés → visszatükrözés → irány → elmélyítés → lezárás.",
    long:
      "A session nézetek ugyanannak az egy folyamatnak külön fókuszai. Session csak rögzítés után jön létre, ezért nincs külön belépő gombja.",
    // nincs href → nincs nav gomb
  },
];

function Chevron({ expanded }: { expanded: boolean }) {
  // Minimal inline SVG, nincs extra dependency
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      className={expanded ? styles.chevronUp : styles.chevronDown}
    >
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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

  const panels = useMemo(() => PANELS, []);

  return (
    <div className={styles.aboutPanelsGrid}>
      {panels.map((p) => {
        const expanded = openKey === p.key;
        const hasLong = !!p.long;

        return (
          <GlassCardSurface
            key={p.key}
            className={`${styles.glassCard} ${styles.gridCard}`}
            variant="soft"
            paper="evening"
          >
            <div className={styles.gridCardHeader}>
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
              ) : null}
            </div>

            <div className={styles.gridCardBody}>
              <div className={styles.cardBody}>{p.short}</div>

              {hasLong && expanded ? (
                <div className={styles.cardBody} style={{ marginTop: 10 }}>
                  {p.long}
                </div>
              ) : null}

              {isAuthed && p.href && p.cta ? (
                <div style={{ marginTop: 14 }}>
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
