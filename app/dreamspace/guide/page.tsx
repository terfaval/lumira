import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { Shell } from "@/components/Shell";
import { isGlossaryAdmin } from "@/src/lib/auth/adminAllowlist";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DreamspaceGuidePage() {
  const supabase = await supabaseServerAuthed();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;

  if (!userId || !isGlossaryAdmin(userId)) {
    notFound();
  }

  return (
    <Shell title="Álomtér" surface="ghost">
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Útikalaúz az álmokhoz</h1>
          <h2 className={styles.subtitle}>Hogyan érdemes az álmokat megközelíteni</h2>
        </header>

        <div className={styles.cardRow}>
          <GlassCardSurface className={styles.card} variant="soft" paper="plain">
            <div className={styles.cardInner}>
              <div className={styles.introGroup}>
                <p className={styles.intro}>Sokszor úgy beszélünk az álmokról, mintha feladatok lennének.</p>
                <p className={styles.intro}>Pedig inkább jelenségek.</p>
                <p className={styles.intro}>És a jelenségekhez néha elég egy jó közelítés.</p>
              </div>

              <p className={styles.intro}>
                Az alábbiak nem szabályok, és nem is ígéretek. Inkább terelők: apró mozdulatok, amelyek sok embernek
                megkönnyítik, hogy az álom egy kicsit hozzáférhetőbb legyen — anélkül, hogy bármit “jól” kellene csinálni.
              </p>

              <p className={styles.intro}>
                Ha valamelyik nem működik, az nem kudarc. Legfeljebb adat: ma ez nem az a nap, vagy nem ez az a kulcs.
                Az álmoknál ez teljesen rendben van.
              </p>

              <div className={styles.introGroupCentered}>
                <p className={styles.intro}>Nem kell jól csinálni.</p>
                <p className={styles.intro}>Elég, ha kíméletesen közelítesz.</p>
              </div>
            </div>
          </GlassCardSurface>

          <GlassCardSurface className={styles.card} variant="soft" paper="plain">
            <div className={styles.cardInner}>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>1. Nappali észlelés</h2>
                <h3 className={styles.sectionSubtitle}>Részletek jelölése napközben</h3>

                <p className={styles.paragraph}>
                  Néha az álomemlék nem reggel jön elő, hanem napközben. Egy fény, egy hang, egy mondat egyszer csak
                  furcsán ismerős lesz — és ezzel együtt felbukkanhat valami, ami reggel még elérhetetlennek tűnt.
                </p>

                <p className={styles.paragraph}>
                  Ezt nem kell erőltetni. Inkább kedvezni lehet neki: azzal, hogy napközben néha megállsz egy pillanatra,
                  és nem csak átmész a világon, hanem észreveszel belőle valamit.
                </p>

                <div className={styles.highlight}>
                  <span className={styles.highlightLabel}>Apró kapaszkodó:</span>
                  <span className={styles.highlightText}>
                    Naponta 1–2 alkalommal nézz körül, és nevezz meg magadban három részletet: „fény – forma – hang”.
                    Ennyi.
                  </span>
                </div>

                <blockquote className={styles.bridge}>
                  <p className={styles.bridgeText}>A részletek nem azért fontosak, mert megfejtik az álmot.</p>
                  <p className={styles.bridgeText}>Hanem mert néha hazavezetnek hozzá.</p>
                </blockquote>
              </section>
            </div>
          </GlassCardSurface>

          <GlassCardSurface className={styles.card} variant="soft" paper="plain">
            <div className={styles.cardInner}>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>2. Reggeli átmenet</h2>
                <h3 className={styles.sectionSubtitle}>A nap első fél pillanata</h3>

                <p className={styles.paragraph}>
                  Az álom sokszor nem azért tűnik el, mert gyenge, hanem mert az ébrenlét túl gyorsan átveszi a szót. A
                  legelső pillanatokban az emlék még nem történet: inkább kép, érzet, irány. És pont ezért tud megmaradni
                  — ha kap egy kis teret.
                </p>

                <p className={styles.paragraph}>
                  Ha ilyenkor rögtön magyarázni kezdünk, gyakran elsietjük azt, ami még épp megvan.
                </p>

                <div className={styles.highlight}>
                  <span className={styles.highlightLabel}>Apró kapaszkodó:</span>
                  <span className={styles.highlightText}>
                    Ébredés után maradj mozdulatlan 10–20 másodpercig, és csak azt kérdezd: „mi történt?” — ne azt, hogy
                    „mit jelent?”
                  </span>
                </div>

                <blockquote className={styles.bridge}>
                  <p className={styles.bridgeText}>Az ébrenlét nagyon lelkes.</p>
                  <p className={styles.bridgeText}>De nem kell rögtön munkába állítani.</p>
                </blockquote>
              </section>
            </div>
          </GlassCardSurface>

          <GlassCardSurface className={styles.card} variant="soft" paper="plain">
            <div className={styles.cardInner}>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>3. Töredék-rögzítés</h2>
                <h3 className={styles.sectionSubtitle}>Amiből később már lehet építkezni</h3>

                <p className={styles.paragraph}>
                  Sokan azért nem írnak álmot, mert „nem elég”. Pedig az álom nem vizsgafeladat. Egy szó, egy szín, egy
                  mozdulat is lehet kezdőpont — és néha pont ezek a legpontosabbak.
                </p>

                <p className={styles.paragraph}>
                  A cél itt nem az, hogy szép történetet gyártsunk, hanem hogy legyen valami nyoma annak, ami történt.
                  Később ebből a nyomból meglepően sok minden felépülhet magától.
                </p>

                <div className={styles.highlight}>
                  <span className={styles.highlightLabel}>Apró kapaszkodó:</span>
                  <span className={styles.highlightText}>
                    Írj le 3 dolgot: „hol voltam – mi volt a hangulat – milyen a kép”. Ennyi.
                  </span>
                </div>

                <blockquote className={styles.bridge}>
                  <p className={styles.bridgeText}>Az álmok gyakran fél mondatokban beszélnek.</p>
                  <p className={styles.bridgeText}>Neked sem kötelező befejezni őket.</p>
                </blockquote>
              </section>
            </div>
          </GlassCardSurface>

          <GlassCardSurface className={styles.card} variant="soft" paper="plain">
            <div className={styles.cardInner}>
              <p className={styles.closing}>Ha ebből ma csak annyi marad meg, hogy „kíméletesen” — már elég.</p>
              <p className={styles.closing}>A többi ráér.</p>
            </div>
          </GlassCardSurface>
        </div>
      </div>
    </Shell>
  );
}
