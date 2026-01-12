import Link from "next/link";
import { LumiraMark } from "@/components/brand/LumiraMark";
import styles from "./LandingPage.module.css";

const howStepsTop = [
  {
    title: "Álomtér rögzítése",
    body: "Röviden leírod, ami benned maradt.",
    icon: "/icons/morning.svg",
  },
  {
    title: "Visszatükrözés",
    body: "Egy semleges keret — értelmezés nélkül.",
    icon: "/icons/reflective.svg",
  },
  {
    title: "Irányválasztás",
    body: "Válassz fókuszt. Te döntesz, merre.",
    icon: "/icons/focus.svg",
  },
];

const howStop = {
  title: "Megállás bármikor",
  body: "Nem kell végigmenni. Megállhatsz, lezárhatsz, később folytathatod.",
  icon: "/icons/relax.svg",
};

const adaptPrimary = [
  {
    key: "morning",
    title: "Reggel",
    icon: "/icons/morning.svg",
    body: "Gyors rögzítés, amikor még friss. Töredék is elég.",
  },
  {
    key: "night",
    title: "Éjjel",
    icon: "/icons/night.svg",
    body: "Ha felébredsz: rövid lecsendesítés vagy visszaalvás-támasz.",
  },
];

const adaptSecondary = [
  { label: "Reflektív", icon: "/icons/reflective.svg" },
  { label: "Kreatív", icon: "/icons/creative.svg" },
  { label: "Lazítás", icon: "/icons/relax.svg" },
  { label: "Lucid", icon: "/icons/lucid.svg" },
];

export function LandingPage() {
  return (
    <main className={styles.page}>
      {/* HERO: 2-column grid */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          {/* LEFT: mark + name + one-liner (Space Grotesk), centered */}
          <div className={styles.heroLeft}>
            <div className={styles.heroLeftInner}>
              <LumiraMark size={56} className={styles.heroMark} />
              <div className={styles.heroName}>lumira</div>
              <div className={styles.heroOneLiner}>
                Csendes technológia
                <br />
                belső tapasztalatokhoz
              </div>
            </div>
          </div>

          {/* RIGHT: tool intro + CTA, centered */}
          <div className={styles.heroRight}>
            <div className={styles.heroRightInner}>
              <p className={styles.toolIntro}>
                A Lumira egy eszköz:
                rögzítéshez, visszanézéshez, 
                és kíméletes álommunkához.
              </p>

              <Link href="/new" className={`btn btn-primary ${styles.heroCta}`}>
                Új álom
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS: 3 top + 1 bottom */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Hogyan működik</h2>

        <div className={styles.howTop}>
          {howStepsTop.map((s) => (
            <article key={s.title} className={styles.glassCard}>
              <img src={s.icon} alt="" width={64} height={64} className={styles.bigIcon} loading="lazy" />
              <div className={styles.cardTitle}>{s.title}</div>
              <div className={styles.cardBody}>{s.body}</div>
            </article>
          ))}
        </div>

        <div className={styles.howStopRow}>
          <article className={`${styles.glassCard} ${styles.stopCard}`}>
  <div className={styles.stopInner}>
    <img
      src={howStop.icon}
      alt=""
      width={72}
      height={72}
      className={styles.bigIcon}
      loading="lazy"
    />

    <div className={styles.stopText}>
      <div className={styles.cardTitle}>{howStop.title}</div>
      <div className={styles.cardBody}>{howStop.body}</div>
    </div>
  </div>
</article>
        </div>
      </section>

      {/* ADAPTIVITY: morning/night split cards + separator + 4 icons */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Többféleképpen használható</h2>

        <div className={styles.adaptPrimaryRow}>
          {adaptPrimary.map((x) => (
            <article key={x.key} className={`${styles.glassCard} ${styles.adaptPrimaryCard}`}>
              <div className={styles.adaptPrimaryInner}>
                <div className={styles.adaptPrimaryIconCol}>
                  <img src={x.icon} alt="" width={72} height={72} className={styles.bigIcon} loading="lazy" />
                  <div className={styles.adaptPrimaryLabel}>{x.title}</div>
                </div>
                <div className={styles.adaptPrimaryTextCol}>
                  <div className={styles.cardBody}>{x.body}</div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.adaptNote}>
          Sokféle célra használható — ugyanazzal a csendes alaplogikával.
        </div>

        <div className={styles.adaptSecondaryGrid}>
          {adaptSecondary.map((item) => (
            <div key={item.label} className={styles.adaptSecondaryItem}>
              <img src={item.icon} alt="" width={64} height={64} className={styles.bigIcon} loading="lazy" />
              <div className={styles.adaptSecondaryLabel}>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* EVENING PREVIEW */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Esti előnézet</h2>

        <div className={styles.eveningGrid}>
          {[
            { title: "Csendes indulás", body: "Pár sor, ami segít rendezni a napot és megérkezni az estére." },
            { title: "Finom fókusz", body: "Rövid hangolás arra, mit szeretnél ma megfigyelni." },
            { title: "Lassú lezárás", body: "Egy egyszerű jelzés: most elég, pihenhetsz." },
          ].map((card) => (
            <article
              key={card.title}
              className={`${styles.glassCard} ${styles.eveningCard}`}
              style={{
                background: `linear-gradient(135deg,
                  var(--evening-card-paper-strong) 0%,
                  var(--evening-card-paper) 42%,
                  var(--glow-2) 120%)`,
              }}
            >
              <div className={styles.cardTitle}>{card.title}</div>
              <div className={styles.cardBody}>{card.body}</div>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER CTA centered + padding weight */}
      <section className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLine}>Ha szeretnéd: indíts egy új álmot, és menj csak addig, ameddig ma jó.</div>
          <Link href="/new" className={`btn btn-primary ${styles.footerCta}`}>
            Új álom
          </Link>
        </div>
      </section>
    </main>
  );
}
