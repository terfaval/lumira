"use client";

import { useEffect, useMemo, useState } from "react";
import { registerObserver } from "@/src/lib/perfDebug";
import styles from "./CosmicNeonLayerGate.module.css"; // <-- állítsd a helyes path-ra

type Props = {
  imageUrl: string;
  intensity?: number;
  forceEnabled?: boolean;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(!!mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

export default function CosmicNeonLayerGate({
  imageUrl,
  intensity = 0.85,
  forceEnabled = false,
}: Props) {
  const [enabled, setEnabled] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const body = document.body;

    const compute = () => {
      const space = body.getAttribute("data-space");
      const napszak = body.getAttribute("data-napszak");

      const okSpace = !space || ["dream", "evening", "flow"].includes(space);
      const okNapszak =
        !napszak ||
        ["morning", "day", "evening", "night", "default"].includes(napszak);

      setEnabled(okSpace && okNapszak);
    };

    compute();

    const release = registerObserver("MutationObserver:CosmicNeonLayerGate", 1);
    const obs = new MutationObserver(compute);
    obs.observe(body, {
      attributes: true,
      attributeFilter: ["data-space", "data-napszak"],
    });

    return () => {
      obs.disconnect();
      release();
    };
  }, []);

  const on = forceEnabled ? true : enabled;

  const styleVars = useMemo(() => {
    const base = Math.max(0, Math.min(1, intensity));
    return {
      ["--bg-intensity" as any]: String(base),
      ["--bg-image" as any]: `url("${imageUrl}")`,
      ["--aura-1" as any]: String(0.32 * base),
      ["--aura-2" as any]: String(0.22 * base),
      ["--mist" as any]: String(0.18 * base),
      ["--grain" as any]: String(0.07 * base),
    } as React.CSSProperties;
  }, [imageUrl, intensity]);

  if (!on) return null;

  return (
    <div
      aria-hidden
      className={`${styles.bg} ${reducedMotion ? styles.still : ""}`}
      style={styleVars}
    />
  );
}
