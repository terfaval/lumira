"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import styles from "@/src/ui/auth/auth-screen.module.css";

type AuthMode = "sign_in" | "sign_up";

interface AuthResponse {
  error?: string;
  hasSession?: boolean;
}

async function postJson(path: string, body: Record<string, string>): Promise<AuthResponse> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as AuthResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Auth request failed.");
  }

  return payload;
}

export function AuthScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = useMemo(() => (mode === "sign_in" ? "Sign in" : "Create account"), [mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const path = mode === "sign_in" ? "/api/auth/sign-in" : "/api/auth/sign-up";
      const result = await postJson(path, { email, password });

      if (mode === "sign_up" && !result.hasSession) {
        setMessage("Account created. If email confirmation is enabled, confirm your email then sign in.");
        setMode("sign_in");
      } else {
        router.replace("/");
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Auth request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.shell}>
      <section className={styles.card}>
        <h1 className={styles.title}>Reflective Space</h1>
        <p className={styles.subtle}>Private, user-owned reflective continuity.</p>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${mode === "sign_in" ? styles.tabActive : ""}`}
            onClick={() => setMode("sign_in")}
            disabled={isSubmitting}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`${styles.tab} ${mode === "sign_up" ? styles.tabActive : ""}`}
            onClick={() => setMode("sign_up")}
            disabled={isSubmitting}
          >
            Register
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>

          <button className={styles.submit} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : submitLabel}
          </button>
        </form>

        {message ? <p className={styles.message}>{message}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </div>
  );
}
