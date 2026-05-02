import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Utensils,
  Palette,
  BookOpen,
  Scissors,
  Music,
  Code,
  LucideIcon,
  ShoppingBag,
  Users,
  Laptop,
  Headphones,
  Pencil,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, Category } from "@/hooks/useCategories";

const iconMap: Record<string, LucideIcon> = {
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

const categoryToTabMap: Record<string, string> = {
  tutoring: "tutoring",
  design_creative: "design",
  printing_merch: "design",
  shipping_logistics: "tech",
  events_music: "music",
  tech_dev: "tech",
  food_baking: "food",
  beauty_hair: "beauty",
};

const tabToCategoryMap: Record<string, string[]> = {
  all: [],
  tutoring: ["tutoring"],
  design: ["design_creative", "printing_merch"],
  music: ["events_music"],
  tech: ["tech_dev", "shipping_logistics"],
  events: ["events_music"],
  food: ["food_baking"],
  beauty: ["beauty_hair"],
};

const tabLabelMap: Record<string, string> = {
  all: "All",
  tutoring: "Tutoring",
  design: "Design",
  music: "Music & DJ",
  tech: "Tech",
  events: "Events",
  food: "Food & Baking",
  beauty: "Beauty & Hair",
};

export const CategoryGrid = () => {
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading } = useCategories();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    if (categories.length > 0) {
      fetchCategoryCounts();
    }
  }, [categories]);

  const fetchCategoryCounts = async () => {
    try {
      const categorySlugs = categories.map((cat) => cat.slug);
      const { data, error } = await supabase
        .from("services")
        .select("category")
        .eq("is_active", true)
        .eq("is_verified", true)
        .in("category", categorySlugs);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((service) => {
        if (service.category) {
          counts[service.category] = (counts[service.category] || 0) + 1;
        }
      });
      setCategoryCounts(counts);
    } catch (error) {
      console.error("Error fetching category counts:", error);
    }
  };

  const getIcon = (category: Category) => {
    if (category.icon_name && iconMap[category.icon_name]) {
      return iconMap[category.icon_name];
    }
    const slugIconMap: Record<string, LucideIcon> = {
      tutoring: BookOpen,
      design_creative: Pencil,
      printing_merch: ShoppingBag,
      shipping_logistics: ShoppingBag,
      events_music: Headphones,
      tech_dev: Code,
      food_baking: Utensils,
      beauty_hair: Scissors,
    };
    return slugIconMap[category.slug] || Code;
  };

  const getCategoriesForTab = (tabValue: string) => {
    if (tabValue === "all") return categories;
    const categorySlugs = tabToCategoryMap[tabValue] || [];
    return categories.filter((cat) => categorySlugs.includes(cat.slug));
  };

  const getAvailableTabs = () => {
    const tabs = ["all"];
    categories.forEach((cat) => {
      const tabValue = categoryToTabMap[cat.slug];
      if (tabValue && !tabs.includes(tabValue)) {
        tabs.push(tabValue);
      }
    });
    return tabs;
  };

  interface CategoryCardProps {
    category: Category;
    count: number;
  }

  const CategoryCard = ({ category, count }: CategoryCardProps) => {
    const Icon = getIcon(category);

    return (
      <button
        onClick={() => navigate(`/services?category=${category.slug}`)}
        className="flex items-start gap-4 text-left rounded-xl border border-border bg-background p-5 hover:border-foreground/20 transition-colors duration-200"
      >
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-muted text-foreground flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-base text-foreground">
            {category.name}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {count} {count === 1 ? "service" : "services"}
          </p>
        </div>
      </button>
    );
  };

  if (categoriesLoading) {
    return (
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-8 md:mb-10">
            Browse by category
          </h2>
          <p className="text-sm text-muted-foreground">Loading categories…</p>
        </div>
      </section>
    );
  }

  const availableTabs = getAvailableTabs();

  return (
    <section className="py-12 md:py-20 bg-background border-b border-border">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-8 md:mb-10">
          Browse by category
        </h2>

        <Tabs defaultValue="all" className="w-full">
          <div className="mb-6 md:mb-8 -mx-4 px-4 overflow-x-auto">
            <TabsList className="inline-flex h-auto bg-muted p-1 rounded-lg border border-border">
              {availableTabs.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="text-xs sm:text-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border"
                >
                  {tabLabelMap[tab] ||
                    tab.charAt(0).toUpperCase() + tab.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {availableTabs.map((tabValue) => {
            const tabCategories = getCategoriesForTab(tabValue);

            return (
              <TabsContent key={tabValue} value={tabValue}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {tabCategories.map((category) => {
                    const count = categoryCounts[category.slug] || 0;
                    return (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        count={count}
                      />
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
};
