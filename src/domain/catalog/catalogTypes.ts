export type DirectionContent = {
  type?: string;
  group?: string;
  micro_description?: string;
  safety?: any;
  ai_contract?: any;
  [key: string]: any;
};

export type DirectionCatalogItemDTO = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  sort_order: number;
  is_active: boolean;
  content: DirectionContent;
};
