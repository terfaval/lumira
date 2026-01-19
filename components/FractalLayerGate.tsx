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

      const blocked = ["auth", "pricing"]; // példák
      const okSpace = !space || !blocked.includes(space);
      const okNapszak = !napszak || ["morning", "day", "evening", "night", "default"].includes(napszak);

      setEnabled(okSpace && okNapszak);
    };

    compute();

    const release = registerObserver("MutationObserver:FractalLayerGate", 1);
    const obs = new MutationObserver(compute);
    obs.observe(body, { attributes: true, attributeFilter: ["data-space", "data-napszak"] });

    return () => {
      obs.disconnect();
      release();
    };
  }, []);

  return (
    <FractalBackground
      enabled={enabled}
      opacity={0.085}
      baseZoom={1.4}
      zoomSpeed={-0.0022}
      zoomMode="exp"
      timeWrapSeconds={600}
      zoomLoopSeconds={240}
      zoomAmplitude={0.45}
      iterations={140}
      maxDevicePixelRatio={1.25}
      targetFps={24}
    />
  );
}
