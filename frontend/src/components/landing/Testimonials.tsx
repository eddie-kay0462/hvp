import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  id: string;
  review_text: string;
  rating: number;
  created_at: string;
  reviewer: {
    first_name: string | null;
    last_name: string | null;
    profile_pic: string | null;
  };
  service?: {
    title: string;
  };
}

export const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      
      // Fetch reviews with reviewer info
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select(`
          id,
          review_text,
          rating,
          created_at,
          reviewer_id,
          service_id
        `)
        .not('review_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      if (!reviewsData || reviewsData.length === 0) {
        setTestimonials([]);
        return;
      }

      // Fetch reviewer profiles
      const reviewerIds = [...new Set(reviewsData.map(r => r.reviewer_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_pic')
        .in('id', reviewerIds);

      const profilesMap: Record<string, any> = {};
      profilesData?.forEach(profile => {
        profilesMap[profile.id] = profile;
      });

      // Fetch service titles if service_id exists
      const serviceIds = reviewsData
        .map(r => r.service_id)
        .filter(id => id !== null) as string[];
      
      let servicesMap: Record<string, any> = {};
      if (serviceIds.length > 0) {
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, title')
          .in('id', serviceIds);
        
        servicesData?.forEach(service => {
          servicesMap[service.id] = service;
        });
      }

      // Map reviews to testimonials
      const mappedTestimonials: Testimonial[] = reviewsData.map((review: any) => ({
        id: review.id,
        review_text: review.review_text,
        rating: review.rating,
        created_at: review.created_at,
        reviewer: profilesMap[review.reviewer_id] || {
          first_name: null,
          last_name: null,
          profile_pic: null,
        },
        service: review.service_id ? servicesMap[review.service_id] : undefined,
      }));

      setTestimonials(mappedTestimonials);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0).toUpperCase() || '';
    const last = lastName?.charAt(0).toUpperCase() || '';
    return `${first}${last}` || 'U';
  };

  const getName = (firstName: string | null, lastName: string | null) => {
    if (firstName && lastName) return `${firstName} ${lastName}`;
    return firstName || lastName || 'Student';
  };

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">What Students Say</h2>
            <p className="text-muted-foreground mt-2">Real feedback from our community</p>
          </div>
          <div className="text-center text-muted-foreground py-8">
            Loading testimonials...
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) {
    return null; // Don't show section if no testimonials
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">What Students Say</h2>
          <p className="text-muted-foreground mt-2">Real feedback from our community</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="relative overflow-hidden">
              <CardContent className="p-6">
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/20" />
                
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < testimonial.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-muted-foreground mb-6 italic">
                  "{testimonial.review_text}"
                </p>

                {testimonial.service && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Service: {testimonial.service.title}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={testimonial.reviewer.profile_pic || undefined} />
                    <AvatarFallback>
                      {getInitials(testimonial.reviewer.first_name, testimonial.reviewer.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">
                      {getName(testimonial.reviewer.first_name, testimonial.reviewer.last_name)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(testimonial.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

