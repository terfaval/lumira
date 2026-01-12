import Link from "next/link";

const howItWorksSteps = [
  {
    title: "Álomtér rögzítése",
    body:
      "Röviden leírod, ami benned maradt az éjszakából. Ez a kiindulópont, amit később is elővehetsz.",
    icon: "/icons/morning.svg",
  },
  {
    title: "Visszatükrözés (opcionális)",
    body:
      "Kaphatsz egy semleges tükröt a szövegedről, ha szeretnéd. Megerősít, de nem magyaráz helyetted.",
    icon: "/icons/reflective.svg",
  },
  {
    title: "Irányválasztás (opcionális)",
    body:
      "Megnézheted, merre érdemes továbbmenned. Te döntesz, hogy mélyebbre mész vagy megállsz.",
    icon: "/icons/focus.svg",
  },
  {
    title: "Munka vagy megállás",
    body:
      "Dönthetsz a folytatásról, vagy le is zárhatod a folyamatot. A tempó és a mélység mindig a tied.",
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
    <main className="landing">
      <section className="landing-hero">
        <div className="landing-hero__logo" aria-label="Lumira">
          Lumira
        </div>
        <p className="landing-hero__tagline">Csendes technológia belső tapasztalatokhoz</p>
        <Link href="/new" className="btn btn-primary landing-hero__cta">
          Tovább
        </Link>
      </section>

      <section className="landing-tool-intro">
        <p>
          A Lumira egy eszköz, nem értelmezés. Segít rögzíteni és rendezni, de a jelentést
          mindig te adod meg. Használhatod egyszerűen vagy mélyebben is, ahogy éppen szeretnéd.
        </p>
      </section>

      <section className="landing-how">
        <h2>Hogyan működik</h2>
        <ol className="landing-how__list">
          {howItWorksSteps.map((step) => (
            <li key={step.title} className="landing-how__item">
              <img
                src={step.icon}
                alt=""
                className="landing-how__icon"
                width={40}
                height={40}
                loading="lazy"
              />
              <div className="landing-how__content">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-adaptivity">
        <h2>Egy eszköz, többféle használatban.</h2>
        <div className="landing-adaptivity__grid">
          {adaptivityItems.map((item) => (
            <div key={item.label} className="landing-adaptivity__item">
              <img
                src={item.icon}
                alt=""
                className="landing-adaptivity__icon"
                width={44}
                height={44}
                loading="lazy"
              />
              <span className="landing-adaptivity__label">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="landing-adaptivity__summary">
          Ugyanaz az alap, mégis más ritmusokhoz, helyzetekhez és szándékokhoz illeszkedik.
        </p>
      </section>

      <section className="landing-evening">
        <h2>Esti előnézet</h2>
        <div className="landing-evening__grid">
          {[
            {
              title: "Csendes indulás",
              body: "Pár sor, ami segít rendezni a napot és megérkezni az estére.",
            },
            {
              title: "Finom fókusz",
              body: "Rövid feljegyzés arról, mi az, amit most szeretnél megfigyelni.",
            },
            {
              title: "Lassú lezárás",
              body: "Egy visszafogott emlékeztető, hogy meg is állhatsz, ha így jó.",
            },
          ].map((card) => (
            <article key={card.title} className="landing-evening__card">
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-footer">
        <p>Ha szeretnél, kezdhetsz egy új álomtérrel, vagy csak körbenézhetsz.</p>
        <Link href="/new" className="btn btn-primary landing-footer__cta">
          Új álom
        </Link>
      </section>
    </main>
  );
}