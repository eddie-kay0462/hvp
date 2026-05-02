import { useEffect, useState } from "react";
import { ServiceCard } from "@/components/services/ServiceCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";

interface ServicesShowcaseProps {
  title?: string;
  /** Category slugs to include; fetches verified active services matching any. */
  categorySlugs?: string[];
  limit?: number;
}

/**
 * Client-side grid of live services (respects RLS: verified + active only for guests).
 * Use for themed strips (e.g. printing + shipping) on the landing page.
 */
export function ServicesShowcase({
  title = "Printing, design & Ghana delivery",
  categorySlugs = ["printing_merch", "shipping_logistics", "design_creative"],
  limit = 8,
}: ServicesShowcaseProps) {
  const { categories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<
    {
      id: string;
      title: string;
      description: string;
      price: number;
      imageUrls: string[];
      sellerName: string;
      categoryLabel: string;
      averageRating: number | null;
      reviewCount: number;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        let query = supabase
          .from("services")
          .select(
            "id, title, description, default_price, image_urls, user_id, category",
          )
          .eq("is_verified", true)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(limit * 3);

        if (categorySlugs.length > 0) {
          query = query.in("category", categorySlugs);
        }

        const { data: services, error } = await query;
        if (error) throw error;
        const slice = (services || []).slice(0, limit);

        const userIds = [
          ...new Set(slice.map((s) => s.user_id).filter(Boolean)),
        ] as string[];

        let profilesMap: Record<string, { first_name: string | null; last_name: string | null }> =
          {};
        if (userIds.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", userIds);
          profilesMap = Object.fromEntries(
            (profiles || []).map((p) => [p.id, p]),
          );
        }

        const mapped = slice.map((s) => {
          const p = profilesMap[s.user_id];
          const sellerName =
            `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || "Seller";
          const categoryLabel =
            categories.find((c) => c.slug === s.category)?.name || s.category;
          return {
            id: s.id,
            title: s.title,
            description: s.description,
            price: s.default_price ?? 0,
            imageUrls: s.image_urls || [],
            sellerName,
            categoryLabel,
            averageRating: null,
            reviewCount: 0,
          };
        });

        if (!cancelled) setItems(mapped);
      } catch (e) {
        console.error("ServicesShowcase:", e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [categories, categorySlugs.join(","), limit]);

  if (loading) {
    return (
      <section className="py-12 md:py-16 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-xl md:text-2xl font-bold mb-6">{title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden bg-card">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-[85%]" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-xl md:text-2xl font-bold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
          Verified hustlers offering custom merch, creative work, and local shipping—priced in
          Ghana cedis.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((s) => (
            <ServiceCard
              key={s.id}
              id={s.id}
              title={s.title}
              description={s.description}
              price={s.price}
              pricingType="fixed"
              imageUrls={s.imageUrls}
              sellerName={s.sellerName}
              sellerVerified
              averageRating={s.averageRating}
              reviewCount={s.reviewCount}
              category={s.categoryLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
