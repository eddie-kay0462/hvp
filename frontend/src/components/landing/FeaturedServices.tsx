import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, ArrowRight, BadgeCheck } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

interface FeaturedService {
  id: string;
  title: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  provider: string;
  university: string;
  imageUrls?: string[];
}

export const FeaturedServices = () => {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [services, setServices] = useState<FeaturedService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedServices();
  }, []);

  const fetchFeaturedServices = async () => {
    try {
      setLoading(true);

      let { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .eq("is_verified", true)
        .limit(3);

      if (servicesError || !servicesData || servicesData.length === 0) {
        const { data: allActiveServices, error: allActiveError } =
          await supabase
            .from("services")
            .select("*")
            .or("is_active.eq.true,is_active.is.null")
            .limit(3);

        if (allActiveError) {
          console.error("Error fetching active services:", allActiveError);
          throw allActiveError;
        }

        servicesData = allActiveServices;
      }

      if (servicesError) {
        console.error("Error fetching verified services:", servicesError);
      }

      if (!servicesData || servicesData.length === 0) {
        setServices([]);
        return;
      }

      if (!Array.isArray(servicesData)) {
        console.error("servicesData is not an array:", servicesData);
        setServices([]);
        return;
      }

      const userIds = [
        ...new Set(servicesData.map((s: any) => s.user_id).filter(Boolean)),
      ];
      let profilesMap: Record<
        string,
        { first_name: string | null; last_name: string | null }
      > = {};

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        } else if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.id] = {
              first_name: profile.first_name,
              last_name: profile.last_name,
            };
          });
        }
      }

      let reviewsMap: Record<string, { rating: number; count: number }> = {};

      try {
        const { data: reviewsData } = await supabase
          .from("reviews" as any)
          .select("reviewee_id, rating")
          .in("reviewee_id", userIds);

        if (reviewsData) {
          reviewsData.forEach((review: any) => {
            if (!reviewsMap[review.reviewee_id]) {
              reviewsMap[review.reviewee_id] = { rating: 0, count: 0 };
            }
            reviewsMap[review.reviewee_id].rating += review.rating;
            reviewsMap[review.reviewee_id].count += 1;
          });

          Object.keys(reviewsMap).forEach((userId) => {
            const total = reviewsMap[userId].rating;
            const count = reviewsMap[userId].count;
            reviewsMap[userId].rating = count > 0 ? total / count : 0;
          });
        }
      } catch {
        // Reviews table not available
      }

      const featuredServices: FeaturedService[] = servicesData.map(
        (service: any) => {
          const profile = profilesMap[service.user_id];
          const providerName = profile
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
              "Student"
            : "Student";

          const reviews = reviewsMap[service.user_id] || {
            rating: 0,
            count: 0,
          };
          const categoryName =
            categories.find((c) => c.slug === service.category)?.name ||
            service.category;

          return {
            id: service.id,
            title: service.title,
            category: categoryName,
            price: service.default_price || 0,
            rating: reviews.rating,
            reviews: reviews.count,
            provider: providerName,
            university: "Ashesi University",
            imageUrls: service.image_urls || [],
          };
        },
      );

      setServices(featuredServices);
    } catch (error) {
      console.error("Error fetching featured services:", error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = () => (
    <div className="flex items-end justify-between gap-4 mb-8 md:mb-10">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
        Featured services
      </h2>
      <button
        onClick={() => navigate("/services")}
        className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-hover transition-colors group"
      >
        View all
        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );

  if (loading) {
    return (
      <section className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <SectionHeader />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-white overflow-hidden"
              >
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (services.length === 0) {
    return (
      <section className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <SectionHeader />
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No services listed yet.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <SectionHeader />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <article
              key={service.id}
              onClick={() => navigate(`/service/${service.id}`)}
              className="group flex flex-col rounded-xl border border-border bg-white overflow-hidden hover:border-foreground/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                {service.imageUrls && service.imageUrls.length > 0 ? (
                  <img
                    src={service.imageUrls[0]}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}

                <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-1 rounded-full">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </span>

                <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-foreground text-xs font-medium px-2 py-1 rounded-full border border-border">
                  {service.category}
                </span>
              </div>

              <div className="flex flex-col flex-1 p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-base text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  {service.reviews > 0 ? (
                    <div className="flex items-center gap-1 text-sm flex-shrink-0">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-foreground">
                        {service.rating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        ({service.reviews})
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
                      New
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  by {service.provider}
                </p>

                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>{service.university}</span>
                </div>

                <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="text-lg font-bold text-foreground">
                      GH₵{service.price}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/service/${service.id}`);
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  >
                    Book now
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
