import Link from "next/link";
import { BrandLockup } from "@/components/brand/BrandLockup";
import styles from "./LandingPage.module.css";

const howItWorksSteps = [
  {
    title: "Álomtér rögzítése",
    body: "Röviden leírod, ami benned maradt az éjszakából. Ez a kiindulópont, amit később is elővehetsz.",
    icon: "/icons/morning.svg",
  },
  {
    title: "Visszatükrözés (opcionális)",
    body: "Kaphatsz egy semleges tükröt a szövegedről, ha szeretnéd. Megerősít, de nem magyaráz helyetted.",
    icon: "/icons/reflective.svg",
  },
  {
    title: "Irányválasztás (opcionális)",
    body: "Megnézheted, merre érdemes továbbmenned. Te döntesz, hogy mélyebbre mész vagy megállsz.",
    icon: "/icons/focus.svg",
  },
  {
    title: "Munka vagy megállás",
    body: "Dönthetsz a folytatásról, vagy le is zárhatod. A tempó és a mélység mindig a tied.",
    icon: "/icons/work.svg",
  },
];

const adaptivityItems = [
  { label: "Reggel", icon: "/icons/morning.svg" },
  { label: "Éjjel", icon: "/icons/night.svg" },
  { label: "Fókusz", icon: "/icons/focus.svg" },
  { label: "Munka", icon: "/icons/work.svg" },
  { label: "Reflektív", icon: "/icons/reflective.svg" },
  { label: "Kreatív", icon: "/icons/creative.svg" },
  { label: "Lazítás", icon: "/icons/relax.svg" },
  { label: "Lucid", icon: "/icons/lucid.svg" },
];

export function LandingPage() {
  return (
    <main className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          {/* lockup: felül logo, alatta név */}
          <div className={styles.heroBrand}>
            <BrandLockup href="/about" />
          </div>

          {/* one-liner: két sor, feszes */}
          <p className={styles.tagline}>
            Csendes technológia
            <br />
            belső tapasztalatokhoz
          </p>

          <Link href="/new" className={styles.cta}>
            Tovább
          </Link>
        </div>
      </section>

      {/* TOOL INTRO */}
      <section className={styles.section}>
        <p className={styles.lead}>
          A Lumira egy eszköz, nem értelmezés. Segít rögzíteni és rendezni, de a jelentést mindig te adod meg.
          Használhatod egyszerűen vagy mélyebben is, ahogy éppen szeretnéd.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Hogyan működik</h2>

        <ol className={styles.howList}>
          {howItWorksSteps.map((step) => (
            <li key={step.title} className={styles.howItem}>
              <img src={step.icon} alt="" className={styles.howIcon} width={44} height={44} loading="lazy" />
              <div className={styles.howContent}>
                <h3 className={styles.h3}>{step.title}</h3>
                <p className={styles.p}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ADAPTIVITY GRID */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Többféleképpen használható.</h2>

        <div className={styles.adaptGrid}>
          {adaptivityItems.map((item) => (
            <div key={item.label} className={styles.adaptItem}>
              <img src={item.icon} alt="" className={styles.adaptIcon} width={48} height={48} loading="lazy" />
              <div className={styles.adaptLabel}>{item.label}</div>
            </div>
          ))}
        </div>

        <p className={styles.pMuted}>
          Ugyanaz az alap, mégis más ritmusokhoz, helyzetekhez és szándékokhoz illeszkedik.
        </p>
      </section>

      {/* EVENING PREVIEW — evening-kártya “alap” stílus */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Esti előnézet</h2>

        <div className={styles.eveningGrid}>
          {[
            { title: "Csendes indulás", body: "Pár sor, ami segít rendezni a napot és megérkezni az estére." },
            { title: "Finom fókusz", body: "Rövid feljegyzés arról, mi az, amit most szeretnél megfigyelni." },
            { title: "Lassú lezárás", body: "Egy visszafogott emlékeztető, hogy meg is állhatsz, ha így jó." },
          ].map((card) => (
            <article
              key={card.title}
              className={styles.eveningCard}
              style={{
                background: `linear-gradient(135deg,
                  var(--evening-card-paper-strong) 0%,
                  var(--evening-card-paper) 42%,
                  rgba(0,0,0,0) 110%)`,
              }}
            >
              <div className={styles.eveningTitle}>{card.title}</div>
              <div className={styles.eveningBody}>{card.body}</div>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className={styles.footer}>
        <p className={styles.footerLine}>
          Egy eszköz az álmaidhoz — rögzítéshez, fókuszhoz, munkához.
        </p>
        <Link href="/new" className={styles.cta}>
          Új álom
        </Link>
      </section>
    </main>
  );
}
