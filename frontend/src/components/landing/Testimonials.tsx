import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
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

      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          review_text,
          rating,
          created_at,
          reviewer_id,
          service_id
        `,
        )
        .not("review_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      if (!reviewsData || reviewsData.length === 0) {
        setTestimonials([]);
        return;
      }

      const reviewerIds = [...new Set(reviewsData.map((r) => r.reviewer_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, profile_pic")
        .in("id", reviewerIds);

      const profilesMap: Record<string, any> = {};
      profilesData?.forEach((profile) => {
        profilesMap[profile.id] = profile;
      });

      const serviceIds = reviewsData
        .map((r) => r.service_id)
        .filter((id) => id !== null) as string[];

      let servicesMap: Record<string, any> = {};
      if (serviceIds.length > 0) {
        const { data: servicesData } = await supabase
          .from("services")
          .select("id, title")
          .in("id", serviceIds);

        servicesData?.forEach((service) => {
          servicesMap[service.id] = service;
        });
      }

      const mappedTestimonials: Testimonial[] = reviewsData.map(
        (review: any) => ({
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
        }),
      );

      setTestimonials(mappedTestimonials);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0).toUpperCase() || "";
    const last = lastName?.charAt(0).toUpperCase() || "";
    return `${first}${last}` || "U";
  };

  const getName = (firstName: string | null, lastName: string | null) => {
    if (firstName && lastName) return `${firstName} ${lastName}`;
    return firstName || lastName || "Student";
  };

  if (loading) {
    return (
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-8 md:mb-10">
            What students say
          </h2>
          <p className="text-sm text-muted-foreground">
            Loading testimonials…
          </p>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="py-12 md:py-20 bg-background border-b border-border">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-8 md:mb-10">
          What students say
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.id}
              className="rounded-xl border border-border bg-background p-6"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < testimonial.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed mb-6">
                "{testimonial.review_text}"
              </p>

              {testimonial.service && (
                <p className="text-xs text-muted-foreground mb-4">
                  Service:{" "}
                  <span className="font-medium text-foreground">
                    {testimonial.service.title}
                  </span>
                </p>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={testimonial.reviewer.profile_pic || undefined}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(
                      testimonial.reviewer.first_name,
                      testimonial.reviewer.last_name,
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {getName(
                      testimonial.reviewer.first_name,
                      testimonial.reviewer.last_name,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(testimonial.created_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
