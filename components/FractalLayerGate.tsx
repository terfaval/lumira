"use client";

import { useEffect, useState } from "react";
import FractalBackground from "@/components/FractalBackground";
import { registerObserver } from "@/src/lib/perfDebug";

export default function FractalLayerGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const body = document.body;

    const compute = () => {
      const space = body.getAttribute("data-space");
      const napszak = body.getAttribute("data-napszak");

      // Tiltólista – minden más oldalon mehet
      const blocked = ["auth", "pricing"];
      const okSpace = !space || !blocked.includes(space);

      const okNapszak =
        !napszak ||
        ["morning", "day", "evening", "night", "default"].includes(napszak);

      setEnabled(okSpace && okNapszak);
    };

    compute();

    const release = registerObserver("MutationObserver:FractalLayerGate", 1);
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

  return (
    <FractalBackground
      enabled={enabled}

      /* vizuális erő */
      opacity={0.08}

      /* Clarke-féle “távolról befelé” érzet */
      baseZoom={2.8}
      zoomMode="loop"
      zoomLoopSeconds={260}   // lassú, hipnotikus
      zoomAmplitude={0.55}    // erősebb befelé-légzés

      /* teljesítmény */
      iterations={140}
      maxDevicePixelRatio={1.25}
      targetFps={24}

      /* színfázis – nagyon lassú, örök kör */
      phaseSpeed={0.012}
    />
  );
}
