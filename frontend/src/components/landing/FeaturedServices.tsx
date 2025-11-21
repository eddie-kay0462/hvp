import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, ArrowRight } from "lucide-react";
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
      
      // Fetch featured services (active services, prefer verified but show all active)
      // First try to get verified services, if none, get any active services
      // Note: Using '*' to get all columns, including image_urls if it exists
      let { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true)
        .limit(3);

      // If no verified services, get any active services (including null is_active)
      if (servicesError || !servicesData || servicesData.length === 0) {
        const { data: allActiveServices, error: allActiveError } = await supabase
          .from('services')
          .select('*')
          .or('is_active.eq.true,is_active.is.null')
          .limit(3);

        if (allActiveError) {
          console.error('Error fetching active services:', allActiveError);
          throw allActiveError;
        }

        servicesData = allActiveServices;
      }

      if (servicesError) {
        console.error('Error fetching verified services:', servicesError);
      }

      if (!servicesData || servicesData.length === 0) {
        setServices([]);
        return;
      }

      // Ensure servicesData is a valid array
      if (!Array.isArray(servicesData)) {
        console.error('servicesData is not an array:', servicesData);
        setServices([]);
        return;
      }

      // Fetch profiles separately for all user_ids
      const userIds = [...new Set(servicesData.map((s: any) => s.user_id).filter(Boolean))];
      let profilesMap: Record<string, { first_name: string | null; last_name: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.id] = {
              first_name: profile.first_name,
              last_name: profile.last_name,
            };
          });
        }
      }

      // Fetch reviews for rating calculation
      let reviewsMap: Record<string, { rating: number; count: number }> = {};

      // Try to fetch reviews if table exists
      try {
        const { data: reviewsData } = await supabase
          .from('reviews' as any)
          .select('reviewee_id, rating')
          .in('reviewee_id', userIds);

        if (reviewsData) {
          reviewsData.forEach((review: any) => {
            if (!reviewsMap[review.reviewee_id]) {
              reviewsMap[review.reviewee_id] = { rating: 0, count: 0 };
            }
            reviewsMap[review.reviewee_id].rating += review.rating;
            reviewsMap[review.reviewee_id].count += 1;
          });

          // Calculate averages
          Object.keys(reviewsMap).forEach(userId => {
            const total = reviewsMap[userId].rating;
            const count = reviewsMap[userId].count;
            reviewsMap[userId].rating = count > 0 ? total / count : 0;
          });
        }
      } catch (error) {
        // Reviews table might not exist, use default values
        // Reviews table not available
      }

      // Map services to featured format
      const featuredServices: FeaturedService[] = servicesData.map((service: any) => {
        const profile = profilesMap[service.user_id];
        const providerName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Student'
          : 'Student';
        
        const reviews = reviewsMap[service.user_id] || { rating: 0, count: 0 };
        const categoryName = categories.find(c => c.slug === service.category)?.name || service.category;

        return {
          id: service.id,
          title: service.title,
          category: categoryName,
          price: service.default_price || 0,
          rating: reviews.rating || 4.5, // Default rating if no reviews
          reviews: reviews.count || 0,
          provider: providerName,
          university: 'Ashesi University', // Default university
          imageUrls: service.image_urls || [],
        };
      });

      setServices(featuredServices);
    } catch (error) {
      console.error('Error fetching featured services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (categoryName: string) => {
    return categoryName;
  };

  if (loading) {
    return (
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/3 translate-y-1/3" />
        
        <div className="container mx-auto px-4 md:px-6 relative">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Featured Services</h2>
              <p className="text-muted-foreground mt-2">Top-rated services from talented students</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (services.length === 0) {
    return (
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/3 translate-y-1/3" />
        
        <div className="container mx-auto px-4 md:px-6 relative">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Featured Services</h2>
              <p className="text-muted-foreground mt-2">Top-rated services from talented students</p>
            </div>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No services available yet. Be the first to list a service!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Featured Services</h2>
            <p className="text-muted-foreground mt-2">Top-rated services from talented students</p>
          </div>
          <Button variant="ghost" className="mt-4 md:mt-0 group" onClick={() => navigate('/services')}>
            View all services
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <Card
              key={service.id}
              className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-muted/60"
            >
              <div className="aspect-[4/3] relative overflow-hidden">
                {service.imageUrls && service.imageUrls.length > 0 ? (
                  <img
                    src={service.imageUrls[0]}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <div className="text-6xl mb-2">🎨</div>
                      <div className="text-xs">Service Image</div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm text-foreground">
                  {service.category}
                </Badge>
              </div>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      <button
                        onClick={() => navigate(`/service/${service.id}`)}
                        className="hover:underline text-left"
                      >
                        {service.title}
                      </button>
                    </h3>
                    <p className="text-sm text-muted-foreground">{service.provider}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">GH₵{service.price}</div>
                    <div className="flex items-center text-sm">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 mr-1" />
                      <span>{service.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground ml-1">({service.reviews})</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center mt-3 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>{service.university}</span>
                </div>
              </CardContent>
              <CardFooter className="p-5 pt-0 flex justify-between">
                <Button variant="outline" size="sm" onClick={() => navigate(`/service/${service.id}`)}>
                  View Details
                </Button>
                <Button size="sm" onClick={() => navigate(`/service/${service.id}`)}>
                  Book Now
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
