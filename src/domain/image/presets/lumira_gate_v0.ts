import type { ImageStylePreset } from "./types";

export const lumiraGate_v2: ImageStylePreset = {
  id: "lumira_gate",
  version: 2,
  name: "Lumira — Gate / Structural Absence (Passage-Based)",

  locks: {
    base_style: `
stylized 2D environment illustration, painterly concept art,
soft brushwork with subtle grain and paper-like texture,
illustrated, non-photorealistic,
muted cool blues and stone grays,
low contrast, calm and ancient atmosphere,
quiet, static, inward-facing space,
no cinematic lighting, no dramatic effects
    `.trim(),

    // ⬇️ DIRECTLY BASED ON lumiraStonePassage_v1
    scene: `
an enclosed stone chamber carved directly into rock,
walls feel close, heavy, and inward-pressing,
no clear architectural layout, the space feels eroded rather than constructed,
not a corridor, not a hallway, not a tunnel,
the camera is positioned inside the space, slightly off-center,
foreground stone floor is visible, uneven and cracked,
depth is suggested through layering rather than linear perspective,
the space feels folded and compressed rather than directional
    `.trim(),

    portal: `
a large irregular structural void where stone is missing,
the void interrupts the chamber wall without framing,
edges are broken, collapsed, and asymmetrical,
stone carvings and etched markings are abruptly cut off at the void edges,
no doorway logic, no architectural intent,

inside the void:
a flat, matte, uniform darkness,
no texture, no pattern, no depth cues,
slightly darker than surrounding stone,
absorbing light rather than emitting it,

the void is not an opening,
it feels like erosion, removal, or loss,
not a passage, not an entrance
    `.trim(),

    detail: `
stone surfaces etched with faint abstract, non-linguistic markings,
fragmented lines and partial circular traces,
markings are subtle, utilitarian, and secondary to material,
small cracks and uneven stone edges throughout,
moss, vines, and small plants grow along seams and corners,
tiny scattered blue pinpoints embedded in stone or air, very subtle,
dust motes barely visible, restrained and non-magical
    `.trim(),

    negative: `
corridor, hallway, tunnel,
doorway, entrance, gate, arch,
symmetrical composition, centered framing,
clear architectural design, temple interior,
fantasy portal, magic glow, energy effects,
high contrast lighting, cinematic lighting, volumetric light,
photorealism, 3d render, unreal engine, octane,
sci-fi elements, holograms, UI overlays,
readable text, real alphabets, known symbols
    `.trim(),
  },

  variants: [
    { key: "dawn", label: "Hajnal", light_prompt: "very soft pre-dawn blue-gray ambient light, extremely low contrast" },
    { key: "morning", label: "Reggel", light_prompt: "cool diffuse daylight filtered indirectly into the chamber, low contrast" },
    { key: "noon", label: "Dél", light_prompt: "neutral, evenly distributed light, restrained and calm" },
    { key: "afternoon", label: "Délután", light_prompt: "slightly warmer ambient light, gentle and subdued" },
    { key: "evening", label: "Este", light_prompt: "cooling light, details receding into shadow, inward feeling" },
    { key: "night", label: "Éjszaka", light_prompt: "deep indigo-blue night ambience, very low contrast" },

    // spec variants stay registered
    { key: "night_fireflies", label: "Éjszaka — Szentjánosbogár", light_prompt: "deep night ambience with extremely subtle warm pinpoints, non-magical" },
    { key: "night_fullmoon", label: "Éjszaka — Telihold", light_prompt: "cool moonlit ambience with very soft rim light, no glow" },
  ],

  canvas: {
    aspect: "desktop_16_9",
    width: 1536,
    height: 1024,
  },

  seed_strategy: "deterministic",
};
