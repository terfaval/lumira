import type { ImageStylePreset } from "./types";

export const lumiraStonePassage_v0: ImageStylePreset = {
  id: "lumira_stone_passage",
  version: 0,
  name: "Lumira — Stone Passage / Portal",

  locks: {
    base_style: `
stylized digital illustration, hand-drawn and painterly look,
slightly textured surfaces, visible brush and grain,
non-photorealistic,
muted color palette with dominant cool blues,
soft edges, low contrast,
calm, ancient, quiet atmosphere,
no cinematic lighting, no dramatic effects,
illustrated rather than realistic
    `.trim(),

    scene: `
enclosed ancient stone corridor carved deep inside rock,
narrow and inward-facing passage,
walls close to each other, creating a contained interior feeling,
no visible exterior or open space,
the corridor continues beyond a subtle internal rupture in space,
no clear exit point, no doorway,
the space feels layered and folded rather than leading outside,
low eye-level perspective, slightly below human standing height,
the camera positioned inside the corridor, not outside,
the floor occupies a significant portion of the foreground,
strong depth created by receding floor stones and steps,
walls converge inward, reinforcing an enclosed interior feeling,
no wide-angle distortion, no dramatic perspective
    `.trim(),

    portal: `
within the corridor, a vertical area of absence interrupts the stone,
not an opening outward but a break within the interior,
the void does not reveal another world or exterior,
it feels like a missing section of the corridor itself,
the surrounding stone remains dominant and enclosing,
slightly off-center composition,
asymmetrical framing,
walls partially obscuring the void,
the void is not fully visible at once
    `.trim(),

    detail: `
stone walls etched with abstract ritual markings,
markings are non-linguistic, unreadable, decorative,
thin geometric lines and circular motifs,
faintly present, integrated into the stone,
small embedded points of soft blue light,
no recognizable symbols, no known writing systems
    `.trim(),

    negative: `
no people, no animals,
no fantasy creatures,
no glowing portals,
no magical energy effects,
no readable text,
no recognizable cultures,
no high contrast,
no realism,
no sci-fi elements
    `.trim(),
  },

  variants: [
    {
      key: "morning",
      label: "Morning",
      light_prompt: `
clear, cool daylight,
even and stable illumination,
neutral blue tones,
the space feels calm and balanced,
stone textures gently readable,
no dramatic shadows
      `.trim(),
    },
    {
      key: "dawn",
      label: "Dawn",
      light_prompt: `
very soft pre-dawn illumination,
cool pale blue-gray ambient light,
minimal contrast,
the space feels quiet and barely awake,
details gently visible but subdued,
no strong shadows
      `.trim(),
    },
    {
      key: "night",
      label: "Night",
      light_prompt: `
deep night atmosphere,
dark blue ambient light,
very low contrast,
the space feels enclosed and inward,
details are barely visible but still present,
no glow, no dramatic lighting
      `.trim(),
    },
  ],

  canvas: {
    aspect: "desktop_16_9",
    width: 1920,
    height: 1080,
  },

  seed_strategy: "deterministic",
};
