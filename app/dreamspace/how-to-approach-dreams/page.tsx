import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { Shell } from "@/components/Shell";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";
import { supabaseServer } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HowToApproachDreamsPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;

  if (!userId || !isGlossaryAdmin(userId)) {
    notFound();
  }

  return (
    <Shell title="Álomtér" surface="ghost">
      <div className={styles.page}>
        <GlassCardSurface className={styles.card} variant="soft" paper="plain">
          <div className={styles.content}>
            <header className={styles.header}>
              <h1 className={styles.title}>Útikalaúz az álmokhoz</h1>
              <h2 className={styles.subtitle}>Hogyan érdemes az álmokat megközelíteni</h2>
            </header>

            <div className={`${styles.introGroup} ${styles.padX}`}>
              <p className={styles.intro}>Sok mindent gondolunk az álmokról.</p>
              <p className={styles.intro}>Ezek egy része hasznosnak bizonyulhat.</p>
              <p className={styles.intro}>A többi inkább csak érdekes.</p>
            </div>

            <p className={`${styles.intro} ${styles.padX}`}>
              Az álmokkal kapcsolatban sok a félreértés. Nem azért, mert különösen bonyolultak lennének, hanem
              mert gyakran rossz kérdéseket teszünk fel nekik.
            </p>

            <p className={`${styles.intro} ${styles.padX}`}>
              Ez az oldal nem arra szolgál, hogy megmagyarázza az álmokat. Inkább azt mutatja meg, milyen
              feltételek között válnak hozzáférhetővé — és mi az, ami általában inkább megnehezíti ezt.
            </p>

            <div className={`${styles.introGroupCentered} ${styles.padX}`}>
              <p className={styles.intro}>Az itt leírtak nem szabályok.</p>
              <p className={styles.intro}>Inkább megfigyelések.</p>
            </div>

            <blockquote className={`${styles.bridge} ${styles.padXL}`}>
              <p className={styles.bridgeText}>Az álmok különös dolgok.</p>
              <p className={styles.bridgeText}>Általában akkor tűnnek el, amikor megpróbáljuk megragadni őket.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={`${styles.title} ${styles.padX}`}>I. Hozzáférés</h2>
              <h3 className={`${styles.subtitle} ${styles.padX}`}>Az álom emlékezhetővé válása</h3>

              <p className={`${styles.paragraph} ${styles.padX}`}>Az álmok többsége nem eltűnik.</p>
              <p className={`${styles.paragraph} ${styles.padX}`}>Inkább nem marad meg.</p>

              <p className={`${styles.paragraph} ${styles.padX}`}>Nem azért, mert ne lennének elég erősek,</p>
              <p className={`${styles.paragraph} ${styles.padX}`}>
                hanem mert egy rövid, törékeny állapothoz kötődnek, amely ébredés után meglepően gyorsan bezárul.
              </p>

              <p className={`${styles.paragraph} ${styles.padX}`}>Az álomemlékezés nem különleges képesség.</p>
              <p className={`${styles.paragraph} ${styles.padX}`}>
                Inkább annak a kérdése, hogy az ébredés pillanatában kap-e egy kis teret az, ami még épp csak
                jelen van.
              </p>

              <div className={`${styles.highlight} ${styles.padX}`}>
                <span className={styles.highlightLabel}>Kiemelt gondolat:</span>
                <span className={styles.highlightText}>Az álmok nem akkor múlnak el, amikor véget érnek.</span>
              </div>
            </section>

            <blockquote className={`${styles.bridge} ${styles.padXL}`}>
              <p className={styles.bridgeText}>Itt sokan megkérdeznék:</p>
              <p className={styles.bridgeText}>„És akkor mit kell csinálni?”</p>
              <p className={styles.bridgeText}>Ez érthető kérdés.</p>
              <p className={styles.bridgeText}>Nem mindig hasznos.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={`${styles.title} ${styles.padX}`}>II. Átmenet</h2>
              <h3 className={`${styles.subtitle} ${styles.padX}`}>Mi történik ébredéskor</h3>

              <p className={`${styles.paragraph} ${styles.padX}`}>
                Az álom és az ébrenlét között van egy rövid, átmeneti állapot. Ebben a sávban az emlék még nem
                rendeződött történetté, és éppen ezért hozzáférhetőbb.
              </p>

              <p className={`${styles.paragraph} ${styles.padX}`}>
                Ilyenkor gyakran nem cselekmény marad meg, hanem képek, érzések, töredékek. Ez nem hiányosság,
                hanem az álom természetes formája ebben a fázisban.
              </p>

              <p className={`${styles.paragraph} ${styles.padX}`}>
                Amikor az ébrenlét túl gyorsan veszi át az irányítást, ez az átmenet megszakad.
              </p>

              <div className={`${styles.highlight} ${styles.padX}`}>
                <span className={styles.highlightLabel}>Kiemelt gondolat:</span>
                <span className={styles.highlightText}>Nem az álom van messze. Az ébrenlét érkezik túl gyorsan.</span>
              </div>
            </section>

            <blockquote className={`${styles.bridge} ${styles.padXL}`}>
              <p className={styles.bridgeText}>Az álmokkal kapcsolatban a magyarázat</p>
              <p className={styles.bridgeText}>általában gyorsabban érkezik,</p>
              <p className={styles.bridgeText}>mint maga az álom.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={`${styles.title} ${styles.padX}`}>III. Viszonyulás</h2>
              <h3 className={`${styles.subtitle} ${styles.padX}`}>Mit várunk az álmoktól</h3>

              <p className={`${styles.paragraph} ${styles.padX}`}>
                Az álmok érzékenyek arra, hogyan közelítünk feléjük.
              </p>

              <p className={`${styles.paragraph} ${styles.padX}`}>
                Ha teljesítményt várunk, hamar elnémulnak. Ha semleges figyelemmel fordulunk feléjük, gyakrabban
                maradnak meg.
              </p>

              <p className={`${styles.paragraph} ${styles.padX}`}>
                Nem azért, mert így „jobbak” lennének, hanem mert nem kényszerítjük őket arra, hogy azonnal
                érthetővé váljanak.
              </p>

              <p className={`${styles.paragraph} ${styles.padX}`}>Nem kell jó álom.</p>
              <p className={`${styles.paragraph} ${styles.padX}`}>Nem kell jelentés.</p>
              <p className={`${styles.paragraph} ${styles.padX}`}>Elég, ha fontosnak tekintjük azt, ami történt.</p>

              <div className={`${styles.highlight} ${styles.padX}`}>
                <span className={styles.highlightLabel}>Kiemelt gondolat:</span>
                <span className={styles.highlightText}>Az álmok nem kérnek teljesítményt.</span>
              </div>
            </section>

            <blockquote className={`${styles.bridge} ${styles.padXL}`}>
              <p className={styles.bridgeText}>Az álmokkal az a helyzet,</p>
              <p className={styles.bridgeText}>hogy nem szeretik,</p>
              <p className={styles.bridgeText}>ha vizsgáztatják őket.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={`${styles.title} ${styles.padX}`}>IV. Idő</h2>
              <h3 className={`${styles.subtitle} ${styles.padX}`}>Az álom ritmusa</h3>

              <p className={`${styles.paragraph} ${styles.padX}`}>Az álmok nem egyetlen éjszaka alatt rendeződnek.</p>
              <p className={`${styles.paragraph} ${styles.padX}`}>Az emlékezésük és megértésük lassú folyamat.</p>

              <p className={`${styles.paragraph} ${styles.padX}`}>
                A túlzott optimalizálás gyakran inkább zavarja ezt, mintsem segíti. A rendszeresség és a pihenés
                általában többet számít, mint bármilyen technika.
              </p>

              <p className={`${styles.paragraph} ${styles.padX}`}>Az álmok nem sietnek.</p>
              <p className={`${styles.paragraph} ${styles.padX}`}>És nem is működnek jól sietségben.</p>

              <div className={`${styles.highlight} ${styles.padX}`}>
                <span className={styles.highlightLabel}>Kiemelt gondolat:</span>
                <span className={styles.highlightText}>Az álmok nem sietnek jól.</span>
              </div>
            </section>

            <blockquote className={`${styles.bridge} ${styles.padXL}`}>
              <p className={styles.bridgeText}>Van, amikor az értelmezés</p>
              <p className={styles.bridgeText}>csak késlelteti azt,</p>
              <p className={styles.bridgeText}>ami egyébként magától alakulna.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={`${styles.title} ${styles.padX}`}>V. Jelentés</h2>
              <h3 className={`${styles.subtitle} ${styles.padX}`}>Mikor nem segít a magyarázat</h3>

              <p className={`${styles.paragraph} ${styles.padX}`}>A túl korai értelmezés gyakran elvesz az álomból.</p>
              <p className={`${styles.paragraph} ${styles.padX}`}>
                A narratíva rendet teremt, de közben eltünteti a finom részleteket.
              </p>

              <p className={`${styles.paragraph} ${styles.padX}`}>
                Ezért az álommal való munka első lépése nem a megfejtés, hanem a rögzítés. Az értelmezés később is
                ráér — vagy akár el is maradhat.
              </p>

              <p className={`${styles.paragraph} ${styles.padX}`}>Az álom nem követel választ.</p>
              <p className={`${styles.paragraph} ${styles.padX}`}>És nem sértődik meg, ha nem kap azonnal.</p>

              <div className={`${styles.highlight} ${styles.padX}`}>
                <span className={styles.highlightLabel}>Kiemelt gondolat:</span>
                <span className={styles.highlightText}>Az álom nem kér magyarázatot.</span>
              </div>
            </section>

            <blockquote className={`${styles.bridge} ${styles.padXL}`}>
              <p className={styles.bridgeText}>Ha most úgy érzed,</p>
              <p className={styles.bridgeText}>hogy nincs itt semmi,</p>
              <p className={styles.bridgeText}>amit azonnal alkalmazni kell,</p>
              <p className={styles.bridgeText}>az valószínűleg jó jel.</p>
            </blockquote>

            <section className={styles.section}>
              <h2 className={`${styles.title} ${styles.padX}`}>Zárás</h2>

              <p className={`${styles.closing} ${styles.padX}`}>Ez az alkalmazás nem azért van,</p>
              <p className={`${styles.closing} ${styles.padX}`}>hogy jobban álmodj.</p>

              <p className={`${styles.closing} ${styles.padX}`}>Hanem azért,</p>
              <p className={`${styles.closing} ${styles.padX}`}>hogy könnyebben meghalld azt,</p>
              <p className={`${styles.closing} ${styles.padX}`}>ami már most is történik.</p>
            </section>
          </div>
        </GlassCardSurface>
      </div>
    </Shell>
  );
}
