import { SupabaseClient } from "@supabase/supabase-js";
import { DirectionCatalogItemDTO } from "@/src/domain/catalog/catalogTypes";
import {
  fetchDirectionCatalogDTO,
  fetchDirectionSlugsActive,
} from "@/src/db/repositories/catalogRepo";

export class CatalogService {
  static async getActiveSlugs(supabase: SupabaseClient): Promise<string[]> {
    return fetchDirectionSlugsActive(supabase);
  }

  static async getActiveCatalog(supabase: SupabaseClient): Promise<DirectionCatalogItemDTO[]> {
    return fetchDirectionCatalogDTO(supabase);
  }

  static async getDirectionBySlug(
    supabase: SupabaseClient,
    slug: string
  ): Promise<DirectionCatalogItemDTO | null> {
    const rows = await fetchDirectionCatalogDTO(supabase, { slugs: [slug] });
    return rows.find((row) => row.slug === slug) ?? null;
  }

  static async getGroupMapForSlugs(
    supabase: SupabaseClient,
    slugs: string[]
  ): Promise<Map<string, string>> {
    if (slugs.length === 0) return new Map<string, string>();
    const rows = await fetchDirectionCatalogDTO(supabase, { slugs });
    const map = new Map<string, string>();
    for (const row of rows) {
      const rawGroup = typeof row.content?.group === "string" ? row.content.group : "";
      const group = rawGroup.trim().replace(/\s+/g, " ");
      if (group) map.set(row.slug, group);
    }
    return map;
  }
}
