"use client";

import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { Shell } from "@/components/Shell";
import styles from "./page.module.css";

export default function HowToApproachDreamsPage() {
  return (
    <Shell title="Álomtér" surface="ghost">
      <div className={styles.page}>
        <GlassCardSurface className={styles.card} variant="soft" paper="plain">
          <div className={styles.content}>
            <header className={styles.header}>
              <h1 className={styles.title}>Útikalaúz az álmokhoz</h1>
              <h2 className={styles.subtitle}>Hogyan érdemes az álmokat megközelíteni</h2>
            </header>

            <p className={styles.intro}>Sok mindent gondolunk az álmokról.</p>
            <p className={styles.intro}>Ezek egy része hasznosnak bizonyulhat.</p>
            <p className={styles.intro}>A többi inkább csak érdekes.</p>

            <p className={styles.intro}>
              Az álmokkal kapcsolatban sok a félreértés. Nem azért, mert különösen bonyolultak lennének, hanem
              mert gyakran rossz kérdéseket teszünk fel nekik.
            </p>

            <p className={styles.intro}>
              Ez az oldal nem arra szolgál, hogy megmagyarázza az álmokat. Inkább azt mutatja meg, milyen
              feltételek között válnak hozzáférhetővé — és mi az, ami általában inkább megnehezíti ezt.
            </p>

            <p className={styles.intro}>Az itt leírtak nem szabályok.</p>
            <p className={styles.intro}>Inkább megfigyelések.</p>

            <blockquote className={styles.bridge}>
              <p className={styles.bridgeText}>Az álmok különös dolgok.</p>
              <p className={styles.bridgeText}>Általában akkor tűnnek el, amikor megpróbáljuk megragadni őket.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>I. Hozzáférés</h2>
              <h3 className={styles.sectionSubtitle}>Az álom emlékezhetővé válása</h3>

              <p className={styles.paragraph}>Az álmok többsége nem eltűnik.</p>
              <p className={styles.paragraph}>Inkább nem marad meg.</p>

              <p className={styles.paragraph}>Nem azért, mert ne lennének elég erősek,</p>
              <p className={styles.paragraph}>
                hanem mert egy rövid, törékeny állapothoz kötődnek, amely ébredés után meglepően gyorsan bezárul.
              </p>

              <p className={styles.paragraph}>Az álomemlékezés nem különleges képesség.</p>
              <p className={styles.paragraph}>
                Inkább annak a kérdése, hogy az ébredés pillanatában kap-e egy kis teret az, ami még épp csak
                jelen van.
              </p>

              <div className={styles.highlight}>
                <span className={styles.highlightLabel}>Kiemelt gondolat:</span>
                <span className={styles.highlightText}>Az álmok nem akkor múlnak el, amikor véget érnek.</span>
              </div>
            </section>

            <blockquote className={styles.bridge}>
              <p className={styles.bridgeText}>Itt sokan megkérdeznék:</p>
              <p className={styles.bridgeText}>„És akkor mit kell csinálni?”</p>
              <p className={styles.bridgeText}>Ez érthető kérdés.</p>
              <p className={styles.bridgeText}>Nem mindig hasznos.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>II. Átmenet</h2>
              <h3 className={styles.sectionSubtitle}>Mi történik ébredéskor</h3>

              <p className={styles.paragraph}>
                Az álom és az ébrenlét között van egy rövid, átmeneti állapot. Ebben a sávban az emlék még nem
                rendeződött történetté, és éppen ezért hozzáférhetőbb.
              </p>

              <p className={styles.paragraph}>
                Ilyenkor gyakran nem cselekmény marad meg, hanem képek, érzések, töredékek. Ez nem hiányosság,
                hanem az álom természetes formája ebben a fázisban.
              </p>

              <p className={styles.paragraph}>
                Amikor az ébrenlét túl gyorsan veszi át az irányítást, ez az átmenet megszakad.
              </p>

              <div className={styles.highlight}>
                <span className={styles.highlightLabel}>Kiemelt gondolat:</span>
                <span className={styles.highlightText}>Nem az álom van messze. Az ébrenlét érkezik túl gyorsan.</span>
              </div>
            </section>

            <blockquote className={styles.bridge}>
              <p className={styles.bridgeText}>Az álmokkal kapcsolatban a magyarázat</p>
              <p className={styles.bridgeText}>általában gyorsabban érkezik,</p>
              <p className={styles.bridgeText}>mint maga az álom.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>III. Viszonyulás</h2>
              <h3 className={styles.sectionSubtitle}>Mit várunk az álmoktól</h3>

              <p className={styles.paragraph}>Az álmok érzékenyek arra, hogyan közelítünk feléjük.</p>

              <p className={styles.paragraph}>
                Ha teljesítményt várunk, hamar elnémulnak. Ha semleges figyelemmel fordulunk feléjük, gyakrabban
                maradnak meg.
              </p>

              <p className={styles.paragraph}>
                Nem azért, mert így „jobbak” lennének, hanem mert nem kényszerítjük őket arra, hogy azonnal
                érthetővé váljanak.
              </p>

              <p className={styles.paragraph}>Nem kell jó álom.</p>
              <p className={styles.paragraph}>Nem kell jelentés.</p>
              <p className={styles.paragraph}>Elég, ha fontosnak tekintjük azt, ami történt.</p>

              <div className={styles.highlight}>
                <span className={styles.highlightLabel}>Kiemelt gondolat:</span>
                <span className={styles.highlightText}>Az álmok nem kérnek teljesítményt.</span>
              </div>
            </section>

            <blockquote className={styles.bridge}>
              <p className={styles.bridgeText}>Az álmokkal az a helyzet,</p>
              <p className={styles.bridgeText}>hogy nem szeretik,</p>
              <p className={styles.bridgeText}>ha vizsgáztatják őket.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>IV. Idő</h2>
              <h3 className={styles.sectionSubtitle}>Az álom ritmusa</h3>

              <p className={styles.paragraph}>Az álmok nem egyetlen éjszaka alatt rendeződnek.</p>
              <p className={styles.paragraph}>Az emlékezésük és megértésük lassú folyamat.</p>

              <p className={styles.paragraph}>
                A túlzott optimalizálás gyakran inkább zavarja ezt, mintsem segíti. A rendszeresség és a pihenés
                általában többet számít, mint bármilyen technika.
              </p>

              <p className={styles.paragraph}>Az álmok nem sietnek.</p>
              <p className={styles.paragraph}>És nem is működnek jól sietségben.</p>

              <div className={styles.highlight}>
                <span className={styles.highlightLabel}>Kiemelt gondolat:</span>
                <span className={styles.highlightText}>Az álmok nem sietnek jól.</span>
              </div>
            </section>

            <blockquote className={styles.bridge}>
              <p className={styles.bridgeText}>Van, amikor az értelmezés</p>
              <p className={styles.bridgeText}>csak késlelteti azt,</p>
              <p className={styles.bridgeText}>ami egyébként magától alakulna.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>V. Jelentés</h2>
              <h3 className={styles.sectionSubtitle}>Mikor nem segít a magyarázat</h3>

              <p className={styles.paragraph}>A túl korai értelmezés gyakran elvesz az álomból.</p>
              <p className={styles.paragraph}>
                A narratíva rendet teremt, de közben eltünteti a finom részleteket.
              </p>

              <p className={styles.paragraph}>
                Ezért az álommal való munka első lépése nem a megfejtés, hanem a rögzítés. Az értelmezés később is
                ráér — vagy akár el is maradhat.
              </p>

              <p className={styles.paragraph}>Az álom nem követel választ.</p>
              <p className={styles.paragraph}>És nem sértődik meg, ha nem kap azonnal.</p>

              <div className={styles.highlight}>
                <span className={styles.highlightLabel}>Kiemelt gondolat:</span>
                <span className={styles.highlightText}>Az álom nem kér magyarázatot.</span>
              </div>
            </section>

            <blockquote className={styles.bridge}>
              <p className={styles.bridgeText}>Ha most úgy érzed,</p>
              <p className={styles.bridgeText}>hogy nincs itt semmi,</p>
              <p className={styles.bridgeText}>amit azonnal alkalmazni kell,</p>
              <p className={styles.bridgeText}>az valószínűleg jó jel.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Zárás</h2>

              <p className={styles.closing}>Ez az alkalmazás nem azért van,</p>
              <p className={styles.closing}>hogy jobban álmodj.</p>

              <p className={styles.closing}>Hanem azért,</p>
              <p className={styles.closing}>hogy könnyebben meghalld azt,</p>
              <p className={styles.closing}>ami már most is történik.</p>
            </section>
          </div>
        </GlassCardSurface>
      </div>
    </Shell>
  );
}
