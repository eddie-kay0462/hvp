import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, MessageCircle, Search, UserCheck } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ServiceCard } from "@/components/services/ServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { CAMPUS } from "@/config/appMode";
import api from "@/lib/api";

interface CatalogService {
  id: string;
  title: string;
  description: string;
  category: string;
  pricing_type: string;
  default_price: number | null;
  price_min: number | null;
  price_max: number | null;
  image_urls: string[] | null;
  average_rating: number | null;
  review_count: number;
  seller?: { display_name?: string; title?: string } | null;
}

const STEPS = [
  {
    icon: Search,
    title: "Find a service",
    body: "Browse photography, design, tutoring, food and more — all from students on campus.",
  },
  {
    icon: UserCheck,
    title: "Check their work",
    body: "Every vendor has a portfolio of past work, so you know what you're getting.",
  },
  {
    icon: MessageCircle,
    title: "Contact them directly",
    body: "Reach out on WhatsApp, phone or email, and agree on the job and price together.",
  },
];

const CampusHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.services
      .getAll({ community: CAMPUS?.slug, limit: 8 })
      .then((res) => {
        const data = (res as { data?: { services?: CatalogService[] } }).data;
        setServices(data?.services ?? []);
      })
      .catch((err) => console.error("Failed to load campus services:", err))
      .finally(() => setLoading(false));
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/services?search=${encodeURIComponent(q)}` : "/services");
  };

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/10 to-background">
          <div className="container mx-auto px-4 py-14 md:py-20 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{CAMPUS?.name}</p>
            <h1 className="mt-3 text-3xl md:text-5xl font-bold text-foreground">{CAMPUS?.tagline}</h1>
            <p className="mx-auto mt-4 max-w-xl text-base md:text-lg text-muted-foreground">
              One place to discover student vendors, see their work, and get in touch.
            </p>
            <form onSubmit={onSearch} className="mx-auto mt-8 flex max-w-xl gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try “photography” or “braids”"
                  className="h-12 pl-10"
                  aria-label="Search services"
                />
              </div>
              <Button type="submit" className="h-12 px-6">
                Search
              </Button>
            </form>
          </div>
        </section>

        {/* Latest services */}
        <section className="container mx-auto px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Latest on campus</h2>
            <Button variant="ghost" onClick={() => navigate("/services")}>
              See all
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-72 w-full" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium text-foreground">No services listed yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Be the first {CAMPUS?.shortName} vendor on Hustle Village.</p>
              <Button className="mt-4" onClick={() => navigate(user ? "/list-service" : "/signup")}>
                List your service
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((s) => (
                <ServiceCard
                  key={s.id}
                  id={s.id}
                  title={s.title}
                  description={s.description}
                  price={s.default_price || 0}
                  pricingType={s.pricing_type}
                  priceMin={s.price_min}
                  priceMax={s.price_max}
                  imageUrls={s.image_urls ?? []}
                  sellerName={s.seller?.display_name || s.seller?.title || "Vendor"}
                  sellerVerified
                  averageRating={s.average_rating}
                  reviewCount={s.review_count}
                  category={s.category}
                />
              ))}
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="bg-muted/40">
          <div className="container mx-auto px-4 py-12">
            <h2 className="text-center text-xl md:text-2xl font-bold text-foreground">How it works</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-lg bg-background p-6 shadow-sm">
                  <Icon className="h-8 w-8 text-primary" />
                  <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vendor CTA */}
        <section className="container mx-auto px-4 py-14 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Got a hustle?</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Build a portfolio that shows off your best work and put all your contact details in one link.
          </p>
          <Button size="lg" className="mt-6" onClick={() => navigate(user ? "/dashboard" : "/signup")}>
            {user ? "Go to my dashboard" : "Join as a vendor — it's free"}
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CampusHome;
