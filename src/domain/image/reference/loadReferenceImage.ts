import fs from "fs/promises";
import path from "path";

export type ReferenceKey = "style"; // később: | "structure" | "both"

const REFERENCE_MAP: Record<ReferenceKey, { relPath: string; mime: string; filename: string }> = {
  style: {
    relPath: "assets/backgrounds/lumira/reference/lumira_stone_passage_ref_style_v1.png",
    mime: "image/png",
    filename: "lumira_stone_passage_ref_style_v1.png",
  },
};

export async function loadReferenceImage(key: ReferenceKey) {
  const entry = REFERENCE_MAP[key];
  const abs = path.join(process.cwd(), entry.relPath);
  const bytes = new Uint8Array(await fs.readFile(abs));
  return { bytes, mime: entry.mime, filename: entry.filename };
}
