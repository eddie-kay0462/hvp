import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import api, { type PublicVendorProfile } from "@/lib/api";
import { ContactButtons } from "../components/ContactButtons";
import { formatServicePrice } from "../lib/format";

interface ServiceDetail {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  pricing_type: string | null;
  default_price: number | null;
  default_delivery_time: string | null;
  price_min: number | null;
  price_max: number | null;
  image_urls: string[] | null;
  service_packages: { name: string; price: number; description?: string }[] | null;
}

/**
 * Campus version of the service page: the same listing, but "Book Now" and
 * in-app messaging are replaced by the vendor's own contact channels.
 */
const CampusServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [vendor, setVendor] = useState<PublicVendorProfile | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = (await api.services.getById(id)) as { data?: ServiceDetail };
        if (cancelled || !res.data) return;
        setService(res.data);
        setActiveImage(0);
        const profile = await api.sellers.getPublicProfile(res.data.user_id);
        if (!cancelled) setVendor(profile.data ?? null);
      } catch (err) {
        console.error("Failed to load service:", err);
        if (!cancelled) setService(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10 grid gap-8 lg:grid-cols-[1fr_340px]">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">Service not found</h1>
          <p className="mt-2 text-muted-foreground">It may have been paused or removed.</p>
          <Button className="mt-6" onClick={() => navigate("/services")}>
            Browse services
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const images = service.image_urls ?? [];
  const categoryName = categories.find((c) => c.slug === service.category)?.name ?? service.category;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-10">
        <Button variant="ghost" className="mb-4 -ml-3" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            {images.length > 0 && (
              <div className="space-y-3">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                  <img src={images[activeImage]} alt={service.title} className="h-full w-full object-cover" />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setActiveImage(i)}
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                          i === activeImage ? "border-primary" : "border-transparent"
                        }`}
                        aria-label={`Show image ${i + 1}`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Badge variant="secondary">{categoryName}</Badge>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{service.title}</h1>
              <p className="text-xl font-bold text-primary">{formatServicePrice(service)}</p>
              {service.default_delivery_time && (
                <p className="text-sm text-muted-foreground">Typical turnaround: {service.default_delivery_time}</p>
              )}
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground">About this service</h2>
              <p className="whitespace-pre-line text-foreground/90 leading-relaxed">{service.description}</p>
            </div>

            {service.pricing_type === "packages" && (service.service_packages?.length ?? 0) > 0 && (
              <div>
                <h2 className="mb-3 font-semibold text-foreground">Packages</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {service.service_packages!.map((p) => (
                    <Card key={p.name} className="p-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="font-semibold text-primary">GH₵ {p.price}</p>
                      </div>
                      {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 h-fit">
            <Card className="p-5 space-y-5">
              {vendor ? (
                <>
                  <Link to={`/sellers/${vendor.user_id}`} className="flex items-center gap-3 group">
                    <Avatar className="h-12 w-12">
                      {vendor.profile_pic && <AvatarImage src={vendor.profile_pic} alt="" />}
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {vendor.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground group-hover:underline truncate">{vendor.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {vendor.portfolio.length > 0
                          ? `${vendor.portfolio.length} portfolio item${vendor.portfolio.length === 1 ? "" : "s"}`
                          : "View profile"}
                      </p>
                    </div>
                  </Link>
                  <ContactButtons contact={vendor} context={service.title} />
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/sellers/${vendor.user_id}`)}>
                    See portfolio
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Vendor details are unavailable right now.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Agree on the work and price directly with the vendor. Hustle Village doesn't handle payments here.
              </p>
            </Card>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CampusServiceDetail;
