"use client";

import { useEffect, useState } from "react";
import BackgroundImageLayer from "@/components/BackgroundImageLayer";
import { resolveBackground } from "@/src/domain/background/resolveBackground";

const ENABLE_SUPABASE_BACKGROUND = true;

export default function BackgroundLayerGate() {
  const [space, setSpace] = useState<string | undefined>(undefined);
  const [napszak, setNapszak] = useState<string | undefined>(undefined);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const body = document.body;

    const compute = () => {
      setSpace(body.getAttribute("data-space") ?? undefined);
      setNapszak(body.getAttribute("data-napszak") ?? undefined);
    };

    compute();
    const obs = new MutationObserver(compute);
    obs.observe(body, { attributes: true, attributeFilter: ["data-space", "data-napszak"] });

    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!ENABLE_SUPABASE_BACKGROUND) return;
    let cancelled = false;
    setSrc(null);

    resolveBackground({ space, napszak })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [space, napszak]);

  if (!ENABLE_SUPABASE_BACKGROUND || !src) return null;

  return <BackgroundImageLayer enabled src={src} />;
}
