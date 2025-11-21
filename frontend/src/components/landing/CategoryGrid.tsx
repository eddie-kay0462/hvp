import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, Palette, BookOpen, Scissors, Music, Code, Search, LucideIcon, ShoppingBag, Users, Laptop, Headphones, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, Category } from "@/hooks/useCategories";

// Icon mapping for lucide-react icons
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

// Map category slugs to tab values
const categoryToTabMap: Record<string, string> = {
  tutoring: 'tutoring',
  design_creative: 'design',
  events_music: 'music',
  tech_dev: 'tech',
  food_baking: 'food',
  beauty_hair: 'beauty',
};

// Map tab values to category slugs
const tabToCategoryMap: Record<string, string[]> = {
  all: [],
  tutoring: ['tutoring'],
  design: ['design_creative'],
  music: ['events_music'],
  tech: ['tech_dev'],
  events: ['events_music'],
  food: ['food_baking'],
  beauty: ['beauty_hair'],
};

// Tab label mapping for better display
const tabLabelMap: Record<string, string> = {
  all: 'All',
  tutoring: 'Tutoring',
  design: 'Design',
  music: 'Music & DJ',
  tech: 'Tech',
  events: 'Events',
  food: 'Food & Baking',
  beauty: 'Beauty & Hair',
};

export const CategoryGrid = () => {
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading } = useCategories();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (categories.length > 0) {
    fetchCategoryCounts();
    }
  }, [categories]);

  const fetchCategoryCounts = async () => {
    try {
      // Get counts for each category
      const categorySlugs = categories.map(cat => cat.slug);
      
      const { data, error } = await supabase
        .from('services')
        .select('category')
        .eq('is_active', true)
        .in('category', categorySlugs);

      if (error) throw error;

      const counts: Record<string, number> = {};
      
      data?.forEach((service) => {
        if (service.category) {
        counts[service.category] = (counts[service.category] || 0) + 1;
        }
      });
      
      setCategoryCounts(counts);
    } catch (error) {
      console.error('Error fetching category counts:', error);
    }
  };

  const getIcon = (category: Category) => {
    if (category.icon_name && iconMap[category.icon_name]) {
      return iconMap[category.icon_name];
    }
    // Fallback based on category slug
    const slugIconMap: Record<string, LucideIcon> = {
      tutoring: BookOpen,
      design_creative: Pencil,
      events_music: Headphones,
      tech_dev: Code,
      food_baking: Utensils,
      beauty_hair: Scissors,
    };
    return slugIconMap[category.slug] || Code;
  };

  // Get categories for a specific tab
  const getCategoriesForTab = (tabValue: string) => {
    if (tabValue === 'all') {
      return categories;
    }
    const categorySlugs = tabToCategoryMap[tabValue] || [];
    return categories.filter(cat => categorySlugs.includes(cat.slug));
  };

  // Get unique tab values from categories
  const getAvailableTabs = () => {
    const tabs = ['all'];
    categories.forEach(cat => {
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
      <Card className="overflow-hidden transition-all hover:shadow-md cursor-pointer" onClick={() => navigate(`/services?category=${category.slug}`)}>
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <Icon className="h-8 w-8 text-primary" />
                  </div>
          <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
          <p className="text-sm text-muted-foreground">{count} {count === 1 ? 'service' : 'services'}</p>
        </CardContent>
              </Card>
            );
  };

  if (categoriesLoading) {
    return (
      <section className="container mx-auto py-12 px-4 md:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Browse Services</h2>
          <p className="text-muted-foreground mt-2">Discover talented students offering services on your campus</p>
        </div>
        <div className="text-center text-muted-foreground py-8">
          Loading categories...
        </div>
      </section>
    );
  }

  const availableTabs = getAvailableTabs();

  return (
    <section className="container mx-auto py-12 px-4 md:px-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight">Browse Services</h2>
        <p className="text-muted-foreground mt-2">Discover talented students offering services on your campus</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList>
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tabLabelMap[tab] || tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {availableTabs.map((tabValue) => {
          const tabCategories = getCategoriesForTab(tabValue);
          
          return (
            <TabsContent key={tabValue} value={tabValue}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                
                {/* Browse All Services card - only show in "all" tab */}
                {tabValue === 'all' && (
                  <Card className="flex items-center justify-center h-40 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <Search className="h-8 w-8 text-muted-foreground mb-2" />
                      <button
                        onClick={() => navigate('/services')}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Browse All Services
                      </button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
};
