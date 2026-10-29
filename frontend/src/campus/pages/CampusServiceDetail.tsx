import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Clock, HandCoins, ImageIcon, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import api, { type PublicVendorProfile } from "@/lib/api";
import { ContactButtons, MobileContactBar } from "../components/ContactButtons";
import { categoryIcon } from "../lib/categories";
import { hasContactDetails } from "../lib/contact";
import { firstName, formatServicePrice, initials } from "../lib/format";
import { useReveal } from "../lib/motion";

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

const Gallery = ({ images, title }: { images: string[]; title: string }) => {
  const [active, setActive] = useState(0);
  const [slide, setSlide] = useState(0);

  if (images.length === 0) return null;

  return (
    <>
      {/* Phones: swipeable strip */}
      <div className="-mx-4 md:hidden">
        <div
          className="campus-scroll-row flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setSlide(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {images.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={i === 0 ? title : ""}
              className="aspect-[4/3] w-full shrink-0 snap-center object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
            {images.map((url, i) => (
              <span key={url} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-5 bg-accent" : "w-1.5 bg-accent/25"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Tablet and up: main image + thumbnails */}
      <div className="hidden space-y-3 md:block">
        <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
          <img
            key={images[active]}
            src={images[active]}
            alt={title}
            className="h-full w-full object-cover duration-300 animate-in fade-in"
          />
        </div>
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setActive(i)}
                className={`h-20 w-24 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-background transition ${
                  i === active ? "ring-accent" : "ring-transparent opacity-70 hover:opacity-100"
                }`}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-pressed={i === active}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

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
  const [loading, setLoading] = useState(true);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = (await api.services.getById(id)) as { data?: ServiceDetail };
        if (cancelled || !res.data) return;
        setService(res.data);
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

  useReveal(mainRef, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-medium text-foreground">This service isn't available</h1>
          <p className="mt-2 text-muted-foreground">The vendor may have paused or removed it.</p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate("/services")}>
            Browse other services
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const images = service.image_urls ?? [];
  const category = categories.find((c) => c.slug === service.category);
  const categoryName = category?.name ?? service.category;
  const CategoryIcon = categoryIcon(category ?? service.category);
  const packages = service.pricing_type === "packages" ? service.service_packages ?? [] : [];
  const portfolioPreview = (vendor?.portfolio ?? []).filter((p) => p.image_urls[0]).slice(0, 4);
  const vendorFirst = vendor ? firstName(vendor.display_name) : "";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main ref={mainRef} className="container mx-auto px-4 pb-16 pt-6 md:pt-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/services" className="hover:text-foreground">
            Services
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/services?category=${service.category}`} className="hover:text-foreground">
            {categoryName}
          </Link>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-12">
          <div className="min-w-0 space-y-8">
            <header className="space-y-4">
              <h1 className="font-display text-3xl font-medium leading-tight text-foreground md:text-4xl">{service.title}</h1>
              <p className="font-display text-2xl font-medium text-foreground lg:hidden">{formatServicePrice(service)}</p>
              {vendor && (
                <Link to={`/sellers/${vendor.user_id}`} className="group inline-flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {vendor.profile_pic && <AvatarImage src={vendor.profile_pic} alt="" />}
                    <AvatarFallback className="bg-accent text-sm text-accent-foreground">{initials(vendor.display_name)}</AvatarFallback>
                  </Avatar>
                  <span className="leading-tight">
                    <span className="block font-semibold text-foreground group-hover:underline">{vendor.display_name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {vendor.communities[0]?.name ?? "Student vendor"}
                    </span>
                  </span>
                </Link>
              )}
            </header>

            {images.length > 0 ? (
              <Gallery images={images} title={service.title} />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-accent/[0.05]">
                <CategoryIcon className="h-14 w-14 text-accent/30" strokeWidth={1.4} />
              </div>
            )}

            <section data-reveal>
              <h2 className="font-display text-xl font-medium text-foreground">About this service</h2>
              <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-foreground/85">{service.description}</p>
            </section>

            {packages.length > 0 && (
              <section data-reveal>
                <h2 className="font-display text-xl font-medium text-foreground">Packages</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {packages.map((p) => (
                    <div key={p.name} className="flex flex-col rounded-2xl border border-border bg-white p-5 dark:bg-card">
                      <p className="font-semibold text-foreground">{p.name}</p>
                      <p className="font-display mt-1 text-2xl font-medium text-foreground">GH₵ {p.price}</p>
                      {p.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {vendor && (
              <section data-reveal className="rounded-2xl border border-border bg-white p-6 dark:bg-card">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      {vendor.profile_pic && <AvatarImage src={vendor.profile_pic} alt="" />}
                      <AvatarFallback className="bg-accent text-lg text-accent-foreground">{initials(vendor.display_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-display text-lg font-medium text-foreground">About {vendorFirst}</h2>
                      <p className="text-sm text-muted-foreground">
                        {vendor.portfolio.length} portfolio piece{vendor.portfolio.length === 1 ? "" : "s"},{" "}
                        {vendor.services.length} service{vendor.services.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to={`/sellers/${vendor.user_id}`}>See full profile</Link>
                  </Button>
                </div>
                {vendor.bio && <p className="mt-4 line-clamp-4 whitespace-pre-line leading-relaxed text-foreground/85">{vendor.bio}</p>}
                {portfolioPreview.length > 0 && (
                  <Link to={`/sellers/${vendor.user_id}`} className="mt-5 grid grid-cols-4 gap-2" aria-label={`See ${vendorFirst}'s portfolio`}>
                    {portfolioPreview.map((p) => (
                      <img key={p.id} src={p.image_urls[0]} alt="" loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                    ))}
                  </Link>
                )}
              </section>
            )}
          </div>

          <aside className="h-fit lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_16px_40px_-24px_rgb(18_73_25_/_0.3)] dark:bg-card">
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="font-display mt-0.5 text-3xl font-medium text-foreground">{formatServicePrice(service)}</p>

              <ul className="mt-5 space-y-3 border-y border-border py-5 text-sm">
                {service.default_delivery_time && (
                  <li className="flex items-center gap-3 text-foreground/85">
                    <Clock className="h-4 w-4 shrink-0 text-accent" />
                    Usually done in {service.default_delivery_time}
                  </li>
                )}
                <li className="flex items-center gap-3 text-foreground/85">
                  <MessageCircle className="h-4 w-4 shrink-0 text-accent" />
                  Talk to {vendorFirst || "the vendor"} before you commit
                </li>
                <li className="flex items-center gap-3 text-foreground/85">
                  <HandCoins className="h-4 w-4 shrink-0 text-accent" />
                  Pay the vendor directly
                </li>
              </ul>

              <div className="mt-5">
                {vendor ? (
                  <ContactButtons contact={vendor} context={service.title} />
                ) : (
                  <p className="text-sm text-muted-foreground">Vendor details are unavailable right now.</p>
                )}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Hustle Village doesn't handle payments on campus sites. Agree on the work and price with the vendor.
              </p>
            </div>
            {portfolioPreview.length === 0 && vendor && (
              <p className="mt-3 flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                {vendorFirst} hasn't added portfolio pieces yet.
              </p>
            )}
          </aside>
        </div>
      </main>
      <Footer />
      {vendor && hasContactDetails(vendor) && (
        <>
          {/* Keeps the footer clear of the pinned contact bar on phones */}
          <div className="h-[5.5rem] bg-white md:hidden dark:bg-card" />
          <MobileContactBar contact={vendor} context={service.title} vendorName={vendorFirst} />
        </>
      )}
    </div>
  );
};

export default CampusServiceDetail;
