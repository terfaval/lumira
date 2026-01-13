"use client";

import { useEffect, useState } from "react";
import styles from "./CosmicLayerGate.module.css";
import { registerObserver } from "@/src/lib/perfDebug";

export default function CosmicLayerGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const body = document.body;

    const compute = () => {
      const space = body.getAttribute("data-space");
      const napszak = body.getAttribute("data-napszak");

      const okSpace = !space || ["dream", "evening", "flow"].includes(space);
      const okNapszak = !napszak || ["morning", "day", "evening", "night", "default"].includes(napszak);

      setEnabled(okSpace && okNapszak);
    };

    compute();

    const release = registerObserver("MutationObserver:CosmicLayerGate", 1);
    const obs = new MutationObserver(compute);
    obs.observe(body, { attributes: true, attributeFilter: ["data-space", "data-napszak"] });

    return () => {
      obs.disconnect();
      release();
    };
  }, []);

  if (!enabled) return null;

  return (
  <div className={styles.veils} aria-hidden="true">
    <div className={styles.base} />
    <div className={styles.auras} />
    <div className={styles.specks} />
    <div className={styles.noise} />
  </div>
);
}
