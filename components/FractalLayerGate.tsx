"use client";

import { useEffect, useState } from "react";
import FractalBackground from "@/components/FractalBackground";

export default function FractalLayerGate() {
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

    const obs = new MutationObserver(compute);
    obs.observe(body, { attributes: true, attributeFilter: ["data-space", "data-napszak"] });

    return () => obs.disconnect();
  }, []);

  return (
    <FractalBackground
      enabled={enabled}
      opacity={0.085}
      baseZoom={1.7}
      zoomSpeed={0.009}
      iterations={150}
      maxDevicePixelRatio={1.5}
    />
  );
}
