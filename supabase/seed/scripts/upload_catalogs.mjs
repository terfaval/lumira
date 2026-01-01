import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function readJson(relPath) {
  const fullPath = path.resolve(process.cwd(), relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

async function upsertDirections() {
  const rows = readJson("supabase/seed/direction_catalog.json");

  const payload = rows.map((r) => ({
    slug: r.slug,
    version: r.version ?? "v1",
    title: r.title,
    description: r.description,
    content: r.content,
    tags: r.tags ?? [],
    sort_order: r.sort_order ?? 1000,
    is_active: r.is_active ?? true
  }));

  const { error } = await supabase.from("direction_catalog").upsert(payload, {
    onConflict: "slug"
  });

  if (error) throw error;
  console.log(`direction_catalog upsert OK: ${payload.length} rows`);
}

async function upsertEveningCards() {
  // csak ha már megvan a fájl
  const p = path.resolve(process.cwd(), "supabase/seed/evening_card_catalog.json");
  if (!fs.existsSync(p)) {
    console.log("evening_card_catalog.json not found, skipping evening cards.");
    return;
  }

  const rows = JSON.parse(fs.readFileSync(p, "utf-8"));

  const payload = rows.map((r) => ({
    slug: r.slug,
    version: r.version ?? "v3",
    title: r.title,
    content: r.content,
    tags: r.tags ?? [],
    sort_order: r.sort_order ?? 1000,
    level: r.level ?? null,
    is_active: r.is_active ?? true
  }));

  const { error } = await supabase.from("evening_card_catalog").upsert(payload, {
    onConflict: "slug"
  });

  if (error) throw error;
  console.log(`evening_card_catalog upsert OK: ${payload.length} rows`);
}

(async function main() {
  await upsertDirections();
  await upsertEveningCards();
  console.log("Done.");
})().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
