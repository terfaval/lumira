// src/db/repositories/catalogRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { DirectionCatalogItemDTO, DirectionContent } from "@/src/domain/catalog/catalogTypes";
import { normalizeDirectionContent } from "@/src/domain/catalog/normalizeDirectionContent";

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

export async function fetchDirectionSlugsActive(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("direction_catalog")
    .select("slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row: any) => row.slug).filter((s: any) => typeof s === "string");
}

function toDirectionCatalogDTO(row: DirectionCatalogRow): DirectionCatalogItemDTO {
  const normalized = normalizeDirectionContent(row.content);
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    tags: Array.isArray(row.tags) ? row.tags : [],
    sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
    is_active: Boolean(row.is_active),
    content: (normalized.obj ?? {}) as DirectionContent,
  };
}

export async function fetchDirectionCatalogDTO(
  supabase: SupabaseClient,
  opts?: {
    slugs?: string[];
    tagsAny?: string[]; // OR semantics via overlaps
    includeInactive?: boolean;
  }
): Promise<DirectionCatalogItemDTO[]> {
  const rows = await fetchDirectionCatalog(supabase, opts);
  return rows.map(toDirectionCatalogDTO);
}
