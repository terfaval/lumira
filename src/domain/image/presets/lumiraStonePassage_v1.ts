import type { ImageStylePreset } from "./types";

export const lumiraStonePassage_v1: ImageStylePreset = {
  id: "lumira_stone_passage",
  version: 1,
  name: "Lumira — Stone Chamber / Structural Absence",

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
no doorway logic, no architectural intent,
the void is a dark matte absence, not an opening,
no light source, no glow, no visible space beyond,
the absence feels like erosion or removal, not passage,
carvings and stone geometry are abruptly interrupted near the break
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
    {
      key: "morning",
      label: "Morning",
      light_prompt: `
cool diffuse daylight filtered indirectly into the chamber,
soft and even illumination,
very low contrast,
stone textures gently readable,
one wall slightly darker than the other,
no strong shadows
      `.trim(),
    },
    {
      key: "dawn",
      label: "Dawn",
      light_prompt: `
very soft pre-dawn blue-gray ambient light,
extremely low contrast,
quiet and barely-awake atmosphere,
tiny blue pinpoints slightly more noticeable,
subtle tonal separation between surfaces,
no directional shadows
      `.trim(),
    },
    {
      key: "night",
      label: "Night",
      light_prompt: `
deep night ambience with dark indigo-blue fill light,
very low contrast and enclosed feeling,
details barely visible but still present,
a faint warm spill light touching one stone edge only,
no glow bloom, no dramatic lighting
      `.trim(),
    },
  ],

  canvas: {
    aspect: "desktop_16_9",
    width: 1536,
    height: 1024,
  },

  seed_strategy: "deterministic",
};
