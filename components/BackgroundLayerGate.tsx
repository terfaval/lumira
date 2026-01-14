"use client";

import { useEffect, useState } from "react";
import BackgroundImageLayer from "@/components/BackgroundImageLayer";

export default function BackgroundLayerGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const body = document.body;

    const compute = () => {
      const space = body.getAttribute("data-space");
      const napszak = body.getAttribute("data-napszak");

      // ugyanaz a logika, mint nálad:
      const okSpace = space === "evening" || space === "flow" || space === "dream";
      const okNapszak = napszak === "evening" || napszak === "night" || napszak === "default";

      setEnabled(okSpace && okNapszak);
    };

    compute();
    const obs = new MutationObserver(compute);
    obs.observe(body, { attributes: true, attributeFilter: ["data-space", "data-napszak"] });

    return () => obs.disconnect();
  }, []);

  return <BackgroundImageLayer enabled={enabled} src="/background/background.png" />;
}
