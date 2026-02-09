"use client";

import { useEffect, useState } from "react";
import BackgroundImageLayer from "@/components/BackgroundImageLayer";
import { resolveBackground } from "@/src/domain/background/resolveBackground";
import { localBackgroundFor } from "@/src/domain/background/localBackgroundMap";

const ENABLE_SUPABASE_BACKGROUND = true;

export default function BackgroundLayerGate() {
  const [space, setSpace] = useState<string | undefined>(undefined);
  const [napszak, setNapszak] = useState<string | undefined>(undefined);
  const [src, setSrc] = useState<string>(() => localBackgroundFor(undefined));

  useEffect(() => {
    const body = document.body;

    const compute = () => {
      const nextSpace = body.getAttribute("data-space") ?? undefined;
      const nextNapszak = body.getAttribute("data-napszak") ?? undefined;
      setSpace(nextSpace);
      setNapszak(nextNapszak);

      // azonnali local váltás, hogy ne villanjon üresen
      setSrc(localBackgroundFor(nextNapszak));
    };

    compute();
    const obs = new MutationObserver(compute);
    obs.observe(body, { attributes: true, attributeFilter: ["data-space", "data-napszak"] });

    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!ENABLE_SUPABASE_BACKGROUND) return;
    let cancelled = false;

    resolveBackground({ space, napszak })
      .then((url) => {
        if (!cancelled && url) setSrc(url);
      })
      .catch(() => {
        // ha Supabase fail → marad a local
      });

    return () => {
      cancelled = true;
    };
  }, [space, napszak]);

  return <BackgroundImageLayer enabled src={src} />;
}
