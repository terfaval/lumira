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
the corridor continues deeper before a distant structural absence in space,
no clear exit point, no doorway, no threshold,
the space feels layered and folded rather than leading outside,
low eye-level perspective, slightly below human standing height,
the camera positioned inside the corridor, slightly offset to the left,
not centered, looking along the corridor's length,
the floor occupies a significant portion of the foreground,
strong depth created by tightly receding floor stones and steps,
the corridor feels longer and more compressed before the cut,
walls converge inward, reinforcing an enclosed interior feeling,
no wide-angle distortion, no dramatic perspective
    `.trim(),

    portal: `
within the corridor, a far wall-to-wall structural absence interrupts the stone,
not an entrance, doorway, portal, or threshold,
it spans from left wall to right wall and floor to ceiling,
edges are irregular, misaligned, and partially collapsed,
no clean rectangular boundary or symmetry,
the corridor appears to attempt to continue, but fails,
the void is a missing continuation, not a passage,
no exterior view, no revealed space beyond,
stone carvings do not end cleanly at the cut,
markings are interrupted mid-line and slightly misaligned near the absence,
the surrounding stone remains dominant and enclosing,
the absence sits off-center, not a focal point,
asymmetrical framing, partially obscured by the walls,
the absence is not fully visible at once
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
    width: 1536,
    height: 1024,
  },

  seed_strategy: "deterministic",
};
