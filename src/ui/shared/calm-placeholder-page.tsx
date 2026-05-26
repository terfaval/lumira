import Link from "next/link";

import styles from "@/src/ui/shared/calm-placeholder-page.module.css";

interface CalmPlaceholderPageProps {
  title: string;
  description: string;
  quietNote?: string;
}

export function CalmPlaceholderPage({ title, description, quietNote }: CalmPlaceholderPageProps) {
  return (
    <section className={styles.shell}>
      <p className={styles.overline}>Orientation Surface</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {quietNote ? <p className={styles.quiet}>{quietNote}</p> : null}
      <div className={styles.actions}>
        <Link className={styles.link} href="/">
          Return to home
        </Link>
      </div>
    </section>
  );
}
