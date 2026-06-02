"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/src/ui/auth/session-controls.module.css";

interface SessionPayload {
  user: { userId: string; source: string } | null;
  admin: boolean;
}

async function loadSession(): Promise<SessionPayload> {
  const response = await fetch("/api/auth/session");
  if (!response.ok) {
    throw new Error("A munkamenet betöltése sikertelen.");
  }

  return (await response.json()) as SessionPayload;
}

export function SessionControls() {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadSession()
      .then((payload) => setSession(payload))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "A munkamenet lekérése sikertelen."))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSignOut() {
    setError(null);
    setMessage(null);

    const response = await fetch("/api/auth/sign-out", { method: "POST" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "A kilépés sikertelen.");
      return;
    }

    router.replace("/auth");
    router.refresh();
  }

  async function handleBootstrapAdmin() {
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/bootstrap", { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; status?: string };

    if (!response.ok) {
      setError(payload.error ?? "Az admin aktiválása sikertelen.");
      return;
    }

    if (payload.status === "bootstrapped") {
      setMessage("Az admin jogosultság aktiválva.");
    } else {
      setMessage("A fiók már admin jogosultsággal rendelkezik.");
    }

    const nextSession = await loadSession();
    setSession(nextSession);
  }

  if (isLoading) {
    return <p className={styles.message}>Munkamenet betöltése...</p>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div>
      <div className={styles.row}>
        {!session.admin ? (
          <button type="button" className={styles.button} onClick={() => void handleBootstrapAdmin()}>
            Admin aktiválása
          </button>
        ) : null}
        <button
          type="button"
          className={`${styles.button} ${styles.buttonDanger}`}
          onClick={() => void handleSignOut()}
        >
          Kilépés
        </button>
      </div>
      {message ? <p className={styles.message}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
