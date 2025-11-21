import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, CheckCircle2, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ServiceCard } from "@/components/services/ServiceCard";
import { useCategories } from "@/hooks/useCategories";
import { BookingForm } from "@/components/bookings/BookingForm";
import { useConversation } from "@/hooks/useConversation";

interface Service {
  id: string;
  title: string;
  description: string;
  default_price: number | null;
  express_price: number | null;
  default_delivery_time: string | null;
  express_delivery_time: string | null;
  category: string;
  portfolio: string | null;
  image_urls: string[] | null;
  user_id: string;
  created_at: string;
}

interface Seller {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_pic: string | null;
  role: string | null;
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer: {
    first_name: string | null;
    last_name: string | null;
    profile_pic: string | null;
  };
}

const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories } = useCategories();
  const { getOrCreateConversation, loading: conversationLoading } = useConversation();
  const [service, setService] = useState<Service | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [relatedServices, setRelatedServices] = useState<any[]>([]);
  const [sellerServices, setSellerServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (id) {
      fetchServiceDetails();
    }
  }, [id]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);

      // Step 1: Fetch service details first (needed for everything else)
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

      if (serviceError) throw serviceError;
      setService(serviceData as unknown as Service);
      
      // Set images from service data
      if ((serviceData as any)?.image_urls && (serviceData as any).image_urls.length > 0) {
        setCurrentImageIndex(0);
      }

      // Step 2: Parallelize independent queries that depend only on serviceData
      const [
        sellerResult,
        reviewsResult,
        relatedServicesResult,
        sellerServicesResult,
        bookingCheckResult
      ] = await Promise.all([
        // Fetch seller details
        supabase
          .from('profiles')
          .select('*')
          .eq('id', serviceData.user_id)
          .single(),
        
        // Fetch reviews for this seller
        supabase
          .from('reviews' as any)
          .select('id, rating, review_text, created_at, reviewer_id')
          .eq('reviewee_id', serviceData.user_id)
          .order('created_at', { ascending: false }),
        
        // Fetch related services (same category, different seller)
        supabase
          .from('services')
          .select('*')
          .eq('category', serviceData.category)
          .eq('is_active', true)
          .neq('user_id', serviceData.user_id)
          .limit(4),
        
        // Fetch more services from this seller
        supabase
          .from('services')
          .select('*')
          .eq('user_id', serviceData.user_id)
          .eq('is_active', true)
          .neq('id', id)
          .limit(4),
        
        // Check if user can review (parallel with other queries)
        user
          ? supabase
              .from('bookings')
              .select('id')
              .eq('service_id', id)
              .eq('buyer_id', user.id)
              .eq('status', 'completed')
              .maybeSingle()
          : Promise.resolve({ data: null, error: null })
      ]);

      // Handle seller result
      if (sellerResult.error) throw sellerResult.error;
      setSeller(sellerResult.data);

      // Handle reviews result
      if (reviewsResult.error) throw reviewsResult.error;
      const reviewsData = ((reviewsResult.data || []) as unknown) as Array<{
        id: string;
        rating: number;
        review_text: string | null;
        created_at: string;
        reviewer_id: string;
      }>;

      // Calculate average rating
      if (reviewsData.length > 0) {
        const avg = reviewsData.reduce((acc, r) => acc + r.rating, 0) / reviewsData.length;
        setAverageRating(avg);
      }

      // Handle booking check
      if (bookingCheckResult.data) {
        setCanReview(!!bookingCheckResult.data);
      }

      // Step 3: Parallelize dependent queries
      const relatedData = relatedServicesResult.data || [];
      const sellerServicesData = sellerServicesResult.data || [];

      // Prepare data for related services queries
      const allServiceIds = [
        ...relatedData.map(s => s.id),
        ...sellerServicesData.map(s => s.id)
      ];
      const allSellerIds = [
        ...new Set([
          ...relatedData.map(s => s.user_id),
          ...sellerServicesData.map(s => s.user_id)
        ])
      ];

      // Get reviewer IDs for this service's reviews
      const reviewerIds = reviewsData.length > 0
        ? [...new Set(reviewsData.map(r => r.reviewer_id))]
        : [];

      // Parallelize fetching reviewer profiles, seller profiles, and related service reviews
      const [
        reviewerProfilesResult,
        sellerProfilesResult,
        relatedReviewsResult
      ] = await Promise.all([
        // Fetch reviewer profiles (if there are reviews)
        reviewerIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, first_name, last_name, profile_pic')
              .in('id', reviewerIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Fetch seller profiles for related services
        allSellerIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .in('id', allSellerIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Fetch reviews for all related services
        allServiceIds.length > 0
          ? supabase
              .from('reviews' as any)
              .select('service_id, rating')
              .in('service_id', allServiceIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      // Process reviews with reviewer data
      if (reviewsData.length > 0 && reviewerProfilesResult.data) {
        const profilesMap: Record<string, any> = {};
        reviewerProfilesResult.data.forEach(profile => {
          profilesMap[profile.id] = profile;
        });

        const mappedReviews = reviewsData.map((review: any) => ({
          id: review.id,
          rating: review.rating,
          review_text: review.review_text,
          created_at: review.created_at,
          reviewer: profilesMap[review.reviewer_id] || {
            first_name: null,
            last_name: null,
            profile_pic: null,
          },
        }));

        setReviews(mappedReviews);
      } else {
        setReviews([]);
      }

      // Process related services data
      const sellerProfilesMap: Record<string, any> = {};
      (sellerProfilesResult.data || []).forEach(profile => {
        sellerProfilesMap[profile.id] = profile;
      });

      // Calculate ratings per service
      const serviceRatingsMap: Record<string, { sum: number; count: number; avg: number }> = {};
      (((relatedReviewsResult.data || []) as unknown) as Array<{ service_id: string; rating: number }>).forEach((review) => {
        if (!serviceRatingsMap[review.service_id]) {
          serviceRatingsMap[review.service_id] = { sum: 0, count: 0, avg: 0 };
        }
        serviceRatingsMap[review.service_id].count++;
        serviceRatingsMap[review.service_id].sum += review.rating;
      });

      // Calculate averages
      Object.keys(serviceRatingsMap).forEach(serviceId => {
        const rating = serviceRatingsMap[serviceId];
        rating.avg = rating.count > 0 ? rating.sum / rating.count : 0;
      });

      // Map related services with proper props
      const mappedRelatedServices = relatedData.map((srv: any) => {
        const sellerProfile = sellerProfilesMap[srv.user_id];
        const sellerName = sellerProfile
          ? (sellerProfile.first_name && sellerProfile.last_name
              ? `${sellerProfile.first_name} ${sellerProfile.last_name}`
              : sellerProfile.first_name || sellerProfile.last_name || 'Unknown')
          : 'Unknown';
        const ratings = serviceRatingsMap[srv.id] || { avg: 0, count: 0 };

        return {
          id: srv.id,
          title: srv.title,
          description: srv.description,
          price: srv.default_price || 0,
          pricingType: 'fixed',
          imageUrls: srv.image_urls || [],
          sellerName,
          sellerVerified: false,
          averageRating: ratings.avg || null,
          reviewCount: ratings.count || 0,
          category: srv.category,
        };
      });

      // Map seller services with proper props
      const mappedSellerServices = sellerServicesData.map((srv: any) => {
        const ratings = serviceRatingsMap[srv.id] || { avg: 0, count: 0 };

        return {
          id: srv.id,
          title: srv.title,
          description: srv.description,
          price: srv.default_price || 0,
          pricingType: 'fixed',
          imageUrls: srv.image_urls || [],
          sellerName: getSellerName(sellerResult.data),
          sellerVerified: false,
          averageRating: ratings.avg || null,
          reviewCount: ratings.count || 0,
          category: srv.category,
        };
      });

      setRelatedServices(mappedRelatedServices);
      setSellerServices(mappedSellerServices);
    } catch (error) {
      console.error('Error fetching service details:', error);
      toast.error('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'Price on request';
    return `GH₵${price}`;
  };
  
  const getSellerName = (seller: Seller | null) => {
    if (!seller) return 'Unknown';
    if (seller.first_name && seller.last_name) {
      return `${seller.first_name} ${seller.last_name}`;
    }
    return seller.first_name || seller.last_name || 'Unknown';
  };

  const getCategoryLabel = (categorySlug: string) => {
    const category = categories.find(c => c.slug === categorySlug);
    return category?.name || categorySlug;
  };

  const handleBookNow = () => {
    if (!user) {
      toast.error('Please login to book a service');
      navigate('/login');
      return;
    }
    setShowBookingForm(true);
  };

  const handleBookingSuccess = (bookingId: string) => {
    setShowBookingForm(false);
    toast.success('Booking created successfully!');
    navigate(`/booking/${bookingId}`);
  };

  const handleMessageSeller = async () => {
    if (!user) {
      toast.error('Please login to message sellers');
      navigate('/login');
      return;
    }

    if (!service || !seller) {
      toast.error('Service information not available');
      return;
    }

    try {
      // Get or create conversation with seller
      const conversation = await getOrCreateConversation(seller.id, service.id);
      
      // Navigate to messages page with conversation ID
      navigate(`/messages/${conversation.id}`);
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast.error(error.message || 'Failed to start conversation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 bg-background">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-96 w-full mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!service || !seller) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Service not found</h2>
            <Button onClick={() => navigate('/services')}>Browse Services</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Use service images or placeholder
  const images = (service?.image_urls && service.image_urls.length > 0) 
    ? service.image_urls 
    : ['/placeholder.svg'];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Back button */}
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => navigate('/services')}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Services
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Images and Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <Card className="overflow-hidden">
                <div className="relative aspect-video bg-muted">
                  <img
                    src={images[currentImageIndex]}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2"
                        onClick={() => setCurrentImageIndex((i) => (i - 1 + images.length) % images.length)}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                        onClick={() => setCurrentImageIndex((i) => (i + 1) % images.length)}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>
                
                {images.length > 1 && (
                  <div className="flex gap-2 p-4 overflow-x-auto">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                          idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {/* Description Section */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">About This Service</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{service.description}</p>
              </Card>

              {/* Booking Details */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">What to Expect</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Default Price</h3>
                    <p className="text-muted-foreground">
                      {service.default_price ? `GH₵${service.default_price}` : 'Price on request'}
                      {service.default_delivery_time && ` - Delivery: ${service.default_delivery_time}`}
                    </p>
                  </div>
                  {service.express_price && (
                    <div>
                      <h3 className="font-semibold mb-2">Express Option</h3>
                      <p className="text-muted-foreground">
                        {`GH₵${service.express_price}`}
                        {service.express_delivery_time && ` - Delivery: ${service.express_delivery_time}`}
                      </p>
                    </div>
                  )}
                  {service.portfolio && (
                  <div>
                      <h3 className="font-semibold mb-2">Portfolio</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{service.portfolio}</p>
                  </div>
                  )}
                </div>
              </Card>

              {/* Reviews Section */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Reviews</h2>
                  {canReview && (
                    <Button onClick={() => toast.info('Review functionality coming soon!')}>
                      Write a Review
                    </Button>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No reviews yet. Be the first to book!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                      <div className="flex items-center gap-2">
                        <Star className="w-8 h-8 fill-primary text-primary" />
                        <span className="text-4xl font-bold">{averageRating.toFixed(1)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                      </div>
                    </div>

                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b pb-6 last:border-b-0">
                          <div className="flex items-start gap-4">
                            <Avatar>
                              <AvatarImage src={review.reviewer.profile_pic || undefined} />
                              <AvatarFallback>
                                {((review.reviewer.first_name || review.reviewer.last_name)?.charAt(0) || 'U').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-semibold">
                                    {review.reviewer.first_name && review.reviewer.last_name
                                      ? `${review.reviewer.first_name} ${review.reviewer.last_name}`
                                      : review.reviewer.first_name || review.reviewer.last_name || 'User'}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < review.rating
                                            ? 'fill-primary text-primary'
                                            : 'text-muted'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(review.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              {review.review_text && (
                                <p className="text-muted-foreground">{review.review_text}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </div>

            {/* Right Column - Service Info Card */}
            <div className="space-y-6">
              <Card className="p-6 sticky top-8">
                <div className="space-y-6">
                  {/* Service Title and Badge */}
                  <div>
                    <Badge variant="category" className="mb-3">{getCategoryLabel(service.category)}</Badge>
                    <h1 className="text-2xl font-bold mb-4">{service.title}</h1>
                    <div className="text-3xl font-bold text-primary mb-6">
                      {formatPrice(service.default_price)}
                    </div>
                    {service.express_price && (
                      <div className="text-lg text-muted-foreground mb-6">
                        Express: {formatPrice(service.express_price)}
                      </div>
                    )}
                  </div>

                  {/* Seller Info */}
                  <div className="border-t border-b py-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={seller.profile_pic || undefined} />
                        <AvatarFallback className="text-lg">
                          {getSellerName(seller).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{getSellerName(seller)}</p>
                        </div>
                        {reviews.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-primary text-primary" />
                            <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
                            <span className="text-sm text-muted-foreground">
                              ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/sellers/${seller.id}`)}
                    >
                      View Profile
                    </Button>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-3">
                    <Button className="w-full" size="lg" onClick={handleBookNow}>
                      Book Now
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={handleMessageSeller}
                      disabled={conversationLoading}
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      {conversationLoading ? 'Loading...' : 'Message Seller'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Related Services */}
          {sellerServices.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-6">More from this seller</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {sellerServices.map((srv) => (
                  <ServiceCard
                    key={srv.id}
                    id={srv.id}
                    title={srv.title}
                    description={srv.description}
                    price={srv.price}
                    pricingType={srv.pricingType}
                    imageUrls={srv.imageUrls}
                    sellerName={srv.sellerName}
                    sellerVerified={srv.sellerVerified}
                    averageRating={srv.averageRating}
                    reviewCount={srv.reviewCount}
                    category={srv.category}
                  />
                ))}
              </div>
            </div>
          )}

          {relatedServices.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-6">Similar services</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedServices.map((srv) => (
                  <ServiceCard
                    key={srv.id}
                    id={srv.id}
                    title={srv.title}
                    description={srv.description}
                    price={srv.price}
                    pricingType={srv.pricingType}
                    imageUrls={srv.imageUrls}
                    sellerName={srv.sellerName}
                    sellerVerified={srv.sellerVerified}
                    averageRating={srv.averageRating}
                    reviewCount={srv.reviewCount}
                    category={srv.category}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Booking Form Dialog */}
      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Service: {service?.title}</DialogTitle>
          </DialogHeader>
          {service && (
            <BookingForm
              serviceId={service.id}
              serviceTitle={service.title}
              defaultPrice={service.default_price}
              expressPrice={service.express_price}
              onSuccess={handleBookingSuccess}
              onCancel={() => setShowBookingForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceDetail;
