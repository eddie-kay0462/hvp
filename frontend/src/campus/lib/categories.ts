import {
  BookOpen,
  Code,
  Headphones,
  Laptop,
  Music,
  Palette,
  Pencil,
  Scissors,
  ShoppingBag,
  Sparkles,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/hooks/useCategories";

// Only icons the main marketplace already ships: Services.tsx imports this
// module (behind IS_CAMPUS) and new icons would leak into the main vendor chunk.

const BY_ICON_NAME: Record<string, LucideIcon> = {
  Utensils,
  Palette,
  BookOpen,
  Scissors,
  Music,
  Code,
  ShoppingBag,
  Users,
  Laptop,
  Headphones,
  Pencil,
};

const BY_SLUG: Record<string, LucideIcon> = {
  tutoring: BookOpen,
  design_creative: Palette,
  printing_merch: ShoppingBag,
  shipping_logistics: ShoppingBag,
  events_music: Headphones,
  tech_dev: Code,
  food_baking: Utensils,
  beauty_hair: Scissors,
};

/** Icon for a category, from its configured icon name or its slug. */
export const categoryIcon = (category: Pick<Category, "slug" | "icon_name"> | string): LucideIcon => {
  if (typeof category === "string") return BY_SLUG[category] ?? Sparkles;
  return (category.icon_name && BY_ICON_NAME[category.icon_name]) || BY_SLUG[category.slug] || Sparkles;
};
