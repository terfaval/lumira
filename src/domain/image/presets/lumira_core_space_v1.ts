import type { ImageStylePreset } from "./types";

export const lumiraCoreSpace_v1: ImageStylePreset = {
  id: "lumira_core_space",
  version: 1,
  name: "Lumira — Core Space / Structural Absence",

  locks: {
    base_style: `
hand-illustrated 2D environment background,
editorial illustration style rather than animation still,
subtle inked linework with soft painterly fills,

muted cool blues and blue-gray stone tones,
globally restrained contrast with localized visual emphasis,
ancient through erosion and abandonment, not through mythology,
quiet, inward-facing, static composition,

no cinematic lighting, no spectacle,
no realism, no 3D render, no dramatic effects
    `.trim(),

    scene: `
an enclosed ancient stone chamber carved into rock,
the space feels eroded and worn rather than constructed,

the camera is positioned inside the chamber,
clearly offset toward the left side of the space,
creating a calm diagonal perspective across the room,
never frontal, never symmetrical,

the camera is set back many steps from the far wall,
allowing a spacious, quiet foreground to unfold,

the broken opening is located in the far wall,
drifting subtly toward the right side of the frame,
never centered, never aligned to the camera axis,

the stone floor occupies a large portion of the image,
uneven, cracked, and gently leading the eye inward,

this is not a corridor, tunnel, or passageway,
no implied path, no visual invitation to move forward,
it simply holds presence like a reclaimed haven
    `.trim(),

    portal: `
a large structural void where stone is missing from the wall,

the edges are broken, collapsed, and asymmetrical,
surrounded by loose stones and structural debris,

the absence itself is a flat, matte darkness,
uniform in tone, without texture or depth cues,

no light source, no glow, no visible space beyond,
the darkness is secondary to the broken stone edge,

this is not a doorway or gate,
it reads clearly as wall damage, erosion, or removal
    `.trim(),

    detail: `
the stone walls show layered erosion,
with surface material worn away in irregular patches,

edges are chipped and softened,
corners rounded by time rather than impact,

some sections reveal deeper stone strata beneath,
uneven, coarse, and untreated,

the degradation is gradual and quiet,
never dramatic, never catastrophic

  the space is archaeological but not ritualistic,
utilitarian rather than ceremonial,

    abstract geometric markings are etched into the stone walls,
the markings resemble structural measurement traces,
not symbols, not writing, not language

the markings feel embedded in deeper stone layers,
as if revealed slowly by erosion rather than applied,
their brightness is low but internally consistent,

lines, circles, and measurement-like traces align loosely,
suggesting forgotten surveying or calibration,
never symbolic, never readable, never ornamental,

vegetation is denser near the far wall and collapsed areas,
where moisture and debris have accumulated,

growth there appears less controlled,
but still subdued and secondary to the stone

a quiet variety of plant life has reclaimed the chamber,
soft moss blankets floor seams, step edges, and wall joints,

small ferns and low leafy plants grow from cracks and fallen stones,
delicate grasses and tiny sprouts emerge in foreground fractures,

thin climbing vines extend further up the walls,
some reaching into mid-wall height before fading,

plant growth appears in multiple scales,
from tiny sprouts to longer, thread-like tendrils,

vegetation follows cracks, gravity, and moisture lines,
never evenly distributed, never mirrored,

the growth feels slow, patient, and established,
as if the space has been quietly alive for generations,

tiny mineral inclusions with a muted blue tint,
non-emissive in daylight, matte, visible only as subtle color variation

subtle dust rests in the air, calm and non-magical
    `.trim(),

    negative: `
portal, gateway, doorway, entrance, arch, gate,
interdimensional opening, other world visible, space beyond,
corridor, hallway, tunnel, passageway, stairs leading out,

temple, shrine, altar, ritual, religion, worship,
mythic fantasy, epic fantasy aesthetics,

runes, glyphs, magic symbols, sigils, readable writing,
text, letters, numbers, signage,

glow effects, bloom, halo, light rays, god rays,
volumetric light, fog beams, sparkles, particles, energy effects,
high contrast lighting, cinematic lighting, dramatic lighting,

characters, people, faces, silhouettes, creatures,
photorealism, hyperrealism,
3d render, CGI, unreal engine, octane, ray tracing
    `.trim(),
  },

  variants: [
    {
      key: "dawn",
      label: "Hajnal",
      light_prompt: `
very soft pre-dawn blue-gray ambient light,
extremely low contrast, quiet and barely-awake atmosphere,

the chamber is readable in broad shapes only,
fine texture remains subdued, no crisp highlights,

the structural void stays flat matte darkness,
no depth cues, no glow, no space beyond,

vegetation is present but understated,
slightly darker than stone, damp and quiet,

geometric markings are barely perceptible,
appearing as faint tonal differences within the stone,
never bright, never emissive,

keep the exact same composition, camera position, and geometry as the base scene
      `.trim(),
    },

    {
      key: "morning",
      label: "Reggel",
      light_prompt: `
cool diffuse daylight filtered indirectly into the chamber,
soft and even illumination, low contrast, no direct sun,

stone textures become gently readable,
edges remain soft, no hard shadows,

the structural void stays flat matte darkness,
no glow, no reflected light inside the absence,

vegetation appears fresher and slightly more saturated than stone,
moss and small leaves readable in clusters near debris and seams,

geometric markings are subtly discernible as etched traces,
still low brightness, never decorative, never luminous,

keep the exact same composition, camera position, and geometry as the base scene
      `.trim(),
    },

    {
      key: "noon",
      label: "Dél",
      light_prompt: `
neutral, evenly distributed ambient daylight,
the brightest state of the day without harshness,
still restrained contrast, no sparkle, no dramatic highlights,

stone surfaces are clearly readable but not emphasized,
no glossy reflections, no sharp shadow shapes,

the structural void remains flat matte darkness,
the darkest region in the frame, still without depth,

vegetation is most readable in this state,
multiple scales of growth visible in cracks and seams,
still calm, not lush, never overgrown into a jungle,

geometric markings are the clearest here,
as quiet measurement-like traces within the stone,
no glow, no magical effect,

no bokeh, no depth-of-field blur,
keep the exact same composition, camera position, and geometry as the base scene
      `.trim(),
    },

    {
      key: "afternoon",
      label: "Délután",
      light_prompt: `
slightly warmer, softened ambient light,
gentle transition toward evening tones,
low contrast with mild shadow presence, still diffuse,

stone textures remain readable but begin to soften again,
shadows are broad and quiet, never directional beams,

the structural void stays flat matte darkness,
no rim light, no outline glow,

vegetation gains a mild warmth on some edges,
subtle tonal separation in leaves and vines,
still secondary to stone, never decorative,

geometric markings remain readable as faint etched systems,
less clear than at noon, still internally consistent,

keep the exact same composition, camera position, and geometry as the base scene
      `.trim(),
    },

    {
      key: "evening",
      label: "Este",
      light_prompt: `
cooling ambient light with subdued warmth fading,
details begin to recede into shadow,
very low contrast, enclosed and inward atmosphere,

stone surfaces become less descriptive,
forms remain clear, textures soften and merge,

the structural void remains flat matte darkness,
no visible depth, no reflected light, no glow,

vegetation becomes more silhouette-like in places,
clusters remain visible near debris and seams,
never turning into high-contrast shapes,

geometric markings fade back into the stone,
visible only as occasional faint lines and circles,
never luminous,

keep the exact same composition, camera position, and geometry as the base scene
      `.trim(),
    },

    {
      key: "night",
      label: "Éjszaka",
      light_prompt: `
deep night ambience with dark indigo-blue fill light,
very low contrast and enclosed atmosphere,
details barely visible but still present,

the structural void remains flat matte darkness,
no visible depth, no glow, no space beyond,

a few sparse mineral pinpoints in the stone appear faintly emissive,
tiny dim blue points of light only, localized and controlled,
no halo, no bloom, no spill, no volumetric rays,
never bright enough to illuminate the room,

the geometric markings appear slightly brighter than the surrounding stone,
as a gentle tonal lift only, not a light source,

no bokeh, no depth-of-field blur,
keep the exact same composition, camera position, and geometry as the base scene
      `.trim(),
    },

    // --- Spec variants ---
    {
      key: "night_fireflies",
      label: "Éjszaka — Szentjánosbogár",
      light_prompt: `
deep night ambience, very low contrast, enclosed atmosphere,

the structural void stays flat matte darkness,
no depth, no glow, no space beyond,

a small number of tiny warm points appear near vegetation clusters,
very sparse, very dim, localized and controlled,
no trails, no swarms, no sparkle, no bloom, no halo,
no bokeh, no depth-of-field blur,

mineral blue pinpoints may remain faint and minimal,
never competing with the warm points,
nothing illuminates the room,

keep the exact same composition, camera position, and geometry as the base scene
      `.trim(),
    },

    {
      key: "night_fullmoon",
      label: "Éjszaka — Telihold",
      light_prompt: `
cool, even moonlit ambience, still very low contrast,
a gentle tonal lift touches some upper stone planes,
source remains unseen, no visible window, no beams,
no exterior cues, no stars, no sky light visible,

the structural void stays flat matte darkness,
no rim-glow, no outlined edge, no reflected interior light,

stone edges gain a barely perceptible soft relief,
no sharp highlights, no cinematic lighting,

geometric markings become slightly clearer than base night,
as quiet etched traces, never luminous,

keep the exact same composition, camera position, and geometry as the base scene
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
