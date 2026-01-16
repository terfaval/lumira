// src/db/repositories/catalogRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type DirectionCatalogRow = {
  slug: string;
  version: string;
  title: string;
  description: string;
  content: any;
  tags: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchDirectionCatalog(
  supabase: SupabaseClient,
  opts?: {
    slugs?: string[];
    tagsAny?: string[]; // OR semantics via overlaps
    includeInactive?: boolean;
  }
): Promise<DirectionCatalogRow[]> {
  let q = supabase
    .from("direction_catalog")
    .select("slug,version,title,description,content,tags,sort_order,is_active,created_at,updated_at");

  if (!opts?.includeInactive) q = q.eq("is_active", true);

  if (opts?.slugs?.length) q = q.in("slug", opts.slugs);

  // tagsAny (OR semantics): row.tags overlaps opts.tagsAny
  if (opts?.tagsAny?.length) {
    q = q.overlaps("tags", opts.tagsAny);
  }

  const { data, error } = await q
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DirectionCatalogRow[];
}
