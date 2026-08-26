export interface FortuneModeWatermark {
  assetPath: string;
  color: string;
  scale: number;
}

const MODE_WATERMARKS: Record<string, FortuneModeWatermark> = {
  situation_unfolding: {
    assetPath: "/fortune-journaling/modes/01-situation.svg",
    color: "#7B6450",
    scale: 1,
  },
  timeline: {
    assetPath: "/fortune-journaling/modes/02-time.svg",
    color: "#B58A58",
    scale: 0.98,
  },
  inner_roles: {
    assetPath: "/fortune-journaling/modes/03-internal-actors.svg",
    color: "#6F543D",
    scale: 1.04,
  },
  system_view: {
    assetPath: "/fortune-journaling/modes/04-system.svg",
    color: "#667A55",
    scale: 0.97,
  },
  perspective_shift: {
    assetPath: "/fortune-journaling/modes/05-perspective.svg",
    color: "#4F526E",
    scale: 1.02,
  },
  boundaries: {
    assetPath: "/fortune-journaling/modes/06-boundary.svg",
    color: "#7A5F43",
    scale: 1.03,
  },
  conflict_space: {
    assetPath: "/fortune-journaling/modes/07-conflict.svg",
    color: "#8E6075",
    scale: 0.99,
  },
};

export function getModeWatermark(modeId: string): FortuneModeWatermark | null {
  return MODE_WATERMARKS[modeId] ?? null;
}

export function getModeWatermarks(): FortuneModeWatermark[] {
  return Object.values(MODE_WATERMARKS);
}
