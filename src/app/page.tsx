"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";

type DirectionRow = {
  slug: string;
  title: string;
  description: string;
  is_active: boolean;
};

export default function Home() {
  const [rows, setRows] = useState<DirectionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("direction_catalog")
        .select("slug,title,description,is_active")
        .eq("is_active", true)
        .limit(10);

      if (error) setError(error.message);
      else setRows((data as DirectionRow[]) ?? []);
    })();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>
        Mira – Supabase smoke test
      </h1>

      {error ? (
        <p style={{ marginTop: 16, color: "crimson" }}>Error: {error}</p>
      ) : (
        <>
          <p style={{ marginTop: 12 }}>
            Aktív irányok a <code>direction_catalog</code>-ból:
          </p>
          <ul style={{ marginTop: 12 }}>
            {rows.map((r) => (
              <li key={r.slug} style={{ marginBottom: 10 }}>
                <b>{r.title}</b>{" "}
                <span style={{ opacity: 0.7 }}>({r.slug})</span>
                <div style={{ opacity: 0.85 }}>{r.description}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
