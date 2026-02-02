import type { ImageStylePreset } from "./types";

export const lumiraCoreSpace_v1: ImageStylePreset = {
  id: "lumira_core_space",
  version: 1.1,
  name: "Lumira — Core Space / Structural Absence",

  locks: {
    base_style: `
      stylized 2D animation background,
      subtle inked linework with soft painterly fills,
      paper-like grain and stone-wash texture,
      illustrated, non-photorealistic,

      muted cool blues and blue-gray stone tones,
      globally restrained contrast with localized visual emphasis,
      calm and ancient atmosphere,
      quiet, inward-facing, static composition,

      no cinematic lighting, no spectacle,
      no realism, no 3D render, no dramatic effects
    `.trim(),

    scene: `
      an enclosed ancient stone chamber carved into rock,
      walls feel close, heavy, and inward-pressing,
      the space feels eroded rather than constructed,

      the camera is positioned inside the chamber,
      set back several steps from a structural absence in the far wall,
      allowing a calm foreground space to unfold,

      the stone floor occupies a larger portion of the frame,
      uneven, worn, and gently leading the eye inward,
      depth is created through layering and perspective,

      not a corridor, not a tunnel, not a passageway,
      the space does not lead anywhere; it simply holds presence
    `.trim(),

    portal: `
      a large irregular absence where stone is missing,
      located in the far wall of the chamber,

      edges are broken, collapsed, and asymmetrical,
      the absence is a flat, matte darkness,
      uniform in tone, without texture or depth cues,

      no light source, no glow, no visible space beyond,
      it does not function as a doorway or passage,
      it feels like erosion, loss, or removal
    `.trim(),

    detail: `
      abstract geometric markings are clearly present on the stone walls,
      they form a subtle but deliberate visual system,

      the geometric markings feel etched into deeper stone layers,
      as if revealed by erosion rather than applied to the surface,
      their brightness is subtle but internally coherent,

      markings align into faint horizontal bands or systems,
      suggesting measurement, calibration, or forgotten surveying,
      never ornamental, never expressive,
      non-linguistic, non-symbolic, never readable,

      stone surfaces carry partial circles, lines,
      and measurement-like traces integrated into the rock itself,

      soft moss and small plants emerge directly from the stone,
      growing inside cracks, seams, and fractures,
      the stone and the growth feel inseparable,
      as if the chamber has been breathing slowly for a long time,
      thin vines and small plants grow quietly from cracks and seams,

      tiny embedded blue pinpoints appear very sparsely,
      as if light is trapped inside mineral inclusions,
      they do not float, flicker, or move,
      they feel geological, not atmospheric,

      subtle dust in the air, calm and non-magical
    `.trim(),

    negative: `
      corridor, hallway, tunnel,
      doorway, entrance, gate, arch,
      landscape, exterior world, horizon,
      clear passage beyond, visible other side,

      temple, shrine, altar,
      religious symbolism,
      mythic fantasy aesthetics,

      fantasy, magic symbols, runes, glyphs,
      glow effects, sparkles, energy,
      high contrast lighting, cinematic lighting, volumetric light,

      characters, people, faces, silhouettes,
      photorealism, 3d render, unreal engine, octane,
      text, letters, readable symbols
    `.trim(),
  },

  variants: [
    {
      key: "dawn",
      label: "Hajnal",
      light_prompt: `
        very soft pre-dawn blue-gray ambient light,
        extremely low contrast,
        quiet and barely-awake atmosphere,
        subtle tonal separation between surfaces,
        no directional shadows
      `.trim(),
    },
    {
      key: "morning",
      label: "Reggel",
      light_prompt: `
        cool diffuse daylight filtered indirectly into the chamber,
        soft and even illumination,
        low contrast with gentle readability of textures,
        one wall slightly darker than the other,
        no strong shadows
      `.trim(),
    },
    {
      key: "noon",
      label: "Dél",
      light_prompt: `
        neutral, evenly distributed ambient light,
        the brightest state of the day without harshness,
        still very low contrast and restrained,
        stone textures clearly readable but not emphasized
      `.trim(),
    },
    {
      key: "afternoon",
      label: "Délután",
      light_prompt: `
        slightly warmer, softened ambient light,
        gentle transition toward evening tones,
        low contrast with mild shadow presence,
        the space feels settled and quiet
      `.trim(),
    },
    {
      key: "evening",
      label: "Este",
      light_prompt: `
        cooling ambient light with subdued warmth fading,
        details begin to recede into shadow,
        very low contrast and enclosed feeling,
        the space feels inward and still
      `.trim(),
    },
    {
      key: "night",
      label: "Éjszaka",
      light_prompt: `
        deep night ambience with dark indigo-blue fill light,
        very low contrast and closed atmosphere,
        details barely visible but still present,
        no glow, no dramatic lighting,

        a barely perceptible tonal separation around the structural absence,
        the darkness feels slightly heavier than the surrounding stone,

        the markings appear faintly more luminous than the stone,
        without glow, halo, or light spill,
        as if the stone itself remembers light
      `.trim(),
    },

    // --- Spec variants ---
    {
      key: "night_fireflies",
      label: "Éjszaka — Szentjánosbogár",
      light_prompt: `
        deep night ambience with extremely subtle warm pinpoints,
        sparse, embedded points of light within the stone itself,
        non-decorative, non-magical,
        the chamber remains calm and restrained
      `.trim(),
    },
    {
      key: "night_fullmoon",
      label: "Éjszaka — Telihold",
      light_prompt: `
        cool, even moonlit ambience,
        soft rim light gently touching some stone edges,
        very low contrast, no sparkle or glow,
        the space feels open yet still enclosed
      `.trim(),
    },
  ],

  canvas: {
    aspect: "desktop_3_2",
    width: 1536,
    height: 1024,
  },

  seed_strategy: "deterministic",
};
