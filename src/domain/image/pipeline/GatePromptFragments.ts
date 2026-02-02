// GatePromptFragments.ts
// Converts a structured GateSpec into safe, non-narrative prompt fragments.
// IMPORTANT: Fragments must never override locks (scene/style/negatives).

export type GateSpec = {
  material?: "stone" | "metal" | "wood" | "crystal" | "unknown";
  material_state?: "smooth" | "cracked" | "eroded" | "timeless";
  edge_quality?: "sharp" | "blurred" | "fractured" | "unstable";
  scale?: "narrow" | "passable" | "wide" | "monumental";
  light_behavior?: "none" | "faint" | "rim" | "outlined";
  environment?: "overgrown" | "dusty" | "ruined" | "clean";
  particles?: "none" | "dust" | "mist" | "light_sparks";
  mood?: "calm" | "neutral" | "tense" | "mysterious" | "somber";
};

export function buildGatePromptFragments(spec?: GateSpec): string[] {
  if (!spec) return [];

  const fragments: string[] = [];

  // --- material ---
  switch (spec.material) {
    case "stone":
      fragments.push("the surrounding structure is carved stone");
      break;
    case "metal":
      fragments.push(
        "the surrounding structure includes aged metal elements, matte and worn"
      );
      break;
    case "wood":
      fragments.push(
        "the surrounding structure includes dark, aged wood elements, dry and quiet"
      );
      break;
    case "crystal":
      fragments.push(
        "the surrounding structure includes crystalline stone elements, matte and subdued, no sparkle"
      );
      break;
    case "unknown":
      fragments.push("the material feels ambiguous and hard to classify");
      break;
  }

  // --- material state ---
  switch (spec.material_state) {
    case "smooth":
      fragments.push("stone surfaces feel mostly smooth with minimal wear");
      break;
    case "cracked":
      fragments.push("hairline cracks and stressed seams are visible in the stone");
      break;
    case "eroded":
      fragments.push("edges and surfaces show erosion and softened wear");
      break;
    case "timeless":
      fragments.push(
        "surfaces feel ancient yet preserved, neither new nor decayed"
      );
      break;
  }

  // --- edge quality (void boundary) ---
  switch (spec.edge_quality) {
    case "sharp":
      fragments.push("the void edge is cleanly cut and sharply defined");
      break;
    case "blurred":
      fragments.push(
        "the void edge is softly dissolved, with an uncertain boundary, no glow"
      );
      break;
    case "fractured":
      fragments.push(
        "the void edge is fractured and broken, with small collapsed sections"
      );
      break;
    case "unstable":
      fragments.push(
        "the void edge feels unstable and unresolved, as if still shifting"
      );
      break;
  }

  // --- scale ---
  switch (spec.scale) {
    case "narrow":
      fragments.push("the void feels narrow and constricted in scale");
      break;
    case "passable":
      fragments.push("the void feels human-passable in scale");
      break;
    case "wide":
      fragments.push("the void feels wide and spacious");
      break;
    case "monumental":
      fragments.push("the void feels monumental and towering");
      break;
  }

  // --- light behavior (extremely restrained) ---
  switch (spec.light_behavior) {
    case "faint":
      fragments.push(
        "light is barely present around the void edge, extremely subtle"
      );
      break;
    case "rim":
      fragments.push(
        "a very soft rim light touches the stone near the void edge, no glow"
      );
      break;
    case "outlined":
      fragments.push(
        "the void edge is suggested only by ambient contrast, not emitted light"
      );
      break;
    // "none" → nothing
  }

  // --- environment ---
  switch (spec.environment) {
    case "overgrown":
      fragments.push(
        "subtle moss and small plants grow along stone seams and corners"
      );
      break;
    case "dusty":
      fragments.push("fine dust settles on surfaces, the air feels dry");
      break;
    case "ruined":
      fragments.push(
        "stonework shows partial collapse and scattered rubble"
      );
      break;
    case "clean":
      fragments.push(
        "stone surfaces feel relatively clean and undisturbed"
      );
      break;
  }

  // --- particles ---
  switch (spec.particles) {
    case "dust":
      fragments.push("a few faint dust motes are visible in the air");
      break;
    case "mist":
      fragments.push(
        "a very thin mist hangs low near the floor, barely visible"
      );
      break;
    case "light_sparks":
      fragments.push(
        "tiny sparse pinpoints drift subtly, non-magical and non-decorative"
      );
      break;
    // "none" → nothing
  }

  // --- mood ---
  switch (spec.mood) {
    case "calm":
      fragments.push("the space feels calm and settled");
      break;
    case "neutral":
      fragments.push("the space feels neutral and quiet");
      break;
    case "tense":
      fragments.push("the space feels tense and compressed");
      break;
    case "mysterious":
      fragments.push("the space feels mysterious but restrained");
      break;
    case "somber":
      fragments.push("the space feels somber and heavy");
      break;
  }

  return fragments;
}
