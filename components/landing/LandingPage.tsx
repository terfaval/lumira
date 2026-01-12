import Link from "next/link";
import { LumiraMark } from "@/components/brand/LumiraMark";
import styles from "./LandingPage.module.css";

const howStepsTop = [
  {
    title: "Álomtér rögzítése",
    body: "Írd le gyorsan, ami megmaradt: képek, mondatok, hangulat, pár részlet. Nem kell szépnek lennie — elég, ha később visszaidézhető.",
    icon: "/icons/dreamspace.svg",
  },
  {
    title: "Visszatükrözés",
    body: "Kapsz egy semleges összefoglalót és pár kapaszkodót: mi erős, mi ismétlődik, hol van nyitott kérdés. Nincs megfejtés, csak tiszta keret.",
    icon: "/icons/reflection.svg",
  },
  {
    title: "Irányválasztás",
    body: "Válassz egy fókuszt a folytatáshoz: emlék elmélyítése, érzelem, test, mintázatok vagy kreatív használat. Te döntesz, mennyire mész bele.",
    icon: "/icons/direction.svg",
  },
];

const howStop = {
  body: "Nem kell végigmenni. Ha elég volt, megállhatsz, lezárhatod egy mondattal, és folytathatod később — amikor újra jólesik.",
  icon: "/icons/stop.svg",
};

const adaptPrimary = [
  {
    key: "morning",
    title: "Reggel",
    icon: "/icons/morning.svg",
    body: "Ébredés után pár perc: gyors rögzítés, mielőtt szétesik az emlék. Írhatsz címszavakat is — később ráér kibontani.",
  },
  {
    key: "night",
    title: "Éjjel",
    icon: "/icons/night.svg",
    body: "Ha felébredsz vagy lefekvés előtt jár az agyad: választható, rövid gyakorlatok segítenek lecsendesíteni, fókuszt adni, vagy visszaaludni.",
  },
];

const adaptSecondary = [
  {
    label: "Reflektív",
    body: "Akkor jó, ha szeretnél egy nyugodt visszanézést és pár tiszta kérdést, értelmezés nélkül.",
    icon: "/icons/reflective.svg",
  },
  {
    label: "Kreatív",
    body: "Akkor jó, ha képekből és motívumokból inspirációt vinnél tovább — anélkül, hogy rendet kellene tenned.",
    icon: "/icons/creative.svg",
  },
  {
    label: "Lazítás",
    body: "Akkor jó, ha lefekvés előtt lecsendesítenéd a rendszert, és inkább pihenni szeretnél, nem elemezni.",
    icon: "/icons/relax.svg",
  },
  {
    label: "Lucid",
    body: "Akkor jó, ha a tudatosság irány érdekel, és finoman hangolnál rá — erőlködés és célhajszolás nélkül.",
    icon: "/icons/lucid.svg",
  },
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
                A Lumira egy egyszerű eszköz álmaid rögzítéséhez és visszanézéséhez. Nem fejt meg
                helyetted semmit: inkább segít észrevenni, mi maradt meg, és ad egy kíméletes
                keretet, ha szeretnél továbbmenni. Használhatod reggel pár mondatra, vagy este
                rövid hangolásként — a saját tempódban.
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
          Ugyanaz az alap: rögzítesz, visszanézed, és csak akkor mélyítesz, ha szeretnél. Válassz úgy,
          ahogy ma működik.
        </div>

        <div className={styles.adaptSecondaryGrid}>
          {adaptSecondary.map((item) => (
            <div key={item.label} className={styles.adaptSecondaryItem}>
              <img src={item.icon} alt="" width={64} height={64} className={styles.bigIcon} loading="lazy" />
              <div className={styles.adaptSecondaryLabel}>{item.label}</div>
              <div className={styles.cardBody}>{item.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* EVENING PREVIEW */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Esti előnézet</h2>

        <div className={styles.eveningGrid}>
          {[
            { title: "Csendes indulás", body: "Rövid rendezés lefekvés előtt: mi maradjon kint, mi jöhet be az éjszakába." },
            { title: "Alvás-hangolás", body: "Választható gyakorlatok: emlékezet, lecsendesítés, rémálom-csökkentés, inkubáció — ami ma jól esik." },
            { title: "Finom lezárás", body: "Egy egyszerű jelzés a végén: most elég. Nem kell tovább dolgozni — jöhet az alvás." },
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
          <div className={styles.footerLine}>
            Indíts egy új álmot. Rögzíts pár sort, nézd vissza, és állj meg ott, ahol ma jó.
          </div>
          <Link href="/new" className={`btn btn-primary ${styles.footerCta}`}>
            Új álom
          </Link>
        </div>
      </section>
    </main>
  );
}
