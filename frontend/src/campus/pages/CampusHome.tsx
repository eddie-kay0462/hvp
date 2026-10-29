import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { CAMPUS } from "@/config/appMode";
import api from "@/lib/api";
import { CampusServiceCard, type CampusCatalogService } from "../components/CampusServiceCard";
import { categoryIcon } from "../lib/categories";
import { gsap, MOTION_OK, useGSAP, useReveal } from "../lib/motion";

/** Unsplash photos (free licence). The first one is what reduced-motion users see. */
const HERO_PHOTOS = ["1726690330713-18c0c0efbdc0", "1612115958726-9af4b6bd28d1"];
const VENDOR_PHOTO = "1612299273045-362a39972259";

const unsplash = (id: string, width: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=70`;

const STEPS = [
  {
    title: "Find someone",
    body: "Search or browse by category. Every listing comes from a student on campus.",
  },
  {
    title: "Look at their work",
    body: "Vendors keep a portfolio of past jobs, so you can judge the quality before you ask.",
  },
  {
    title: "Message them directly",
    body: "Reach out on WhatsApp, phone or email and agree on the job and price between you.",
  },
];

const VENDOR_PERKS = [
  "A portfolio page that shows off your best work",
  "WhatsApp, phone and Instagram buttons in one place",
  "One link to put in your bio and status",
];

const CampusHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories } = useCategories();
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<CampusCatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    api.services
      .getAll({ community: CAMPUS?.slug, limit: 8 })
      .then((res) => {
        const data = (res as { data?: { services?: CampusCatalogService[] } }).data;
        setServices(data?.services ?? []);
      })
      .catch((err) => console.error("Failed to load campus services:", err))
      .finally(() => setLoading(false));
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(".hero-line", { autoAlpha: 0, y: 24, duration: 0.8, ease: "power3.out", stagger: 0.08 });

        // Slow crossfade between hero photos; later photos sit on top of earlier ones.
        const [, ...rest] = gsap.utils.toArray<HTMLElement>(".hero-photo");
        if (rest.length === 0) return;
        const tl = gsap.timeline({ repeat: -1 });
        rest.forEach((photo) => tl.to(photo, { opacity: 1, duration: 1.4, ease: "power1.inOut" }, "+=6"));
        tl.to(rest, { opacity: 0, duration: 1.4, ease: "power1.inOut" }, "+=6");
      });
      return () => mm.revert();
    },
    { scope: heroRef }
  );

  useReveal(mainRef, [loading, categories.length]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/services?search=${encodeURIComponent(q)}` : "/services");
  };

  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const vendorCta = user ? "/dashboard" : "/signup";

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Navbar />

      <section ref={heroRef} className="relative isolate overflow-hidden bg-neutral-900 text-white">
        {HERO_PHOTOS.map((id, i) => (
          <img
            key={id}
            src={unsplash(id, 1600)}
            srcSet={`${unsplash(id, 800)} 800w, ${unsplash(id, 1600)} 1600w, ${unsplash(id, 2400)} 2400w`}
            sizes="100vw"
            alt=""
            loading={i === 0 ? "eager" : "lazy"}
            className="hero-photo absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center]"
            style={{ opacity: i === 0 ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/15" />

        <div className="container mx-auto px-4 py-20 md:py-28 lg:py-36">
          <div className="max-w-xl">
            <h1 className="hero-line text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Hire {CAMPUS?.shortName} students for the work you need done
            </h1>
            <p className="hero-line mt-5 max-w-md text-lg leading-relaxed text-white/80">
              Hair, photography, tutoring, design, food and more, from people you see on campus.
            </p>

            <form
              onSubmit={onSearch}
              role="search"
              className="hero-line mt-8 flex items-center rounded-xl bg-white p-1.5 pl-4"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for any service"
                aria-label="Search services"
                className="h-11 min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-lg bg-accent hover:bg-accent/90" aria-label="Search">
                <Search className="h-5 w-5" />
              </Button>
            </form>

            {categories.length > 0 && (
              <div className="hero-line mt-5 flex flex-wrap gap-2">
                {categories.slice(0, 4).map((c) => (
                  <Link
                    key={c.slug}
                    to={`/services?category=${c.slug}`}
                    className="rounded-lg border border-white/40 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-white hover:text-foreground"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <main ref={mainRef}>
        {categories.length > 0 && (
          <section className="container mx-auto px-4 pt-10 md:pt-12">
            <div className="campus-scroll-row -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-8">
              {categories.map((c) => {
                const Icon = categoryIcon(c);
                return (
                  <Link
                    key={c.slug}
                    data-reveal
                    to={`/services?category=${c.slug}`}
                    className="flex w-28 shrink-0 snap-start flex-col gap-3 rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-md md:w-auto dark:bg-card"
                  >
                    <Icon className="h-6 w-6 text-foreground/70" strokeWidth={1.25} />
                    <span className="text-sm leading-tight text-foreground">{c.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 py-14 md:py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 data-reveal className="font-display text-2xl font-medium text-foreground md:text-3xl">
              New on campus
            </h2>
            {services.length > 0 && (
              <Link to="/services" className="shrink-0 text-sm font-medium text-foreground underline-offset-4 hover:underline">
                See all services
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border bg-white dark:bg-card">
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div data-reveal className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-white p-8 dark:bg-card md:flex-row md:items-center md:justify-between md:p-10">
              <div>
                <p className="text-xl font-medium text-foreground">No services listed yet</p>
                <p className="mt-2 max-w-md text-muted-foreground">
                  Sell something on campus? List it now and be the first {CAMPUS?.shortName} vendor people find here.
                </p>
              </div>
              <Button size="lg" className="rounded-lg" onClick={() => navigate(user ? "/list-service" : "/signup")}>
                List your service
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((s) => (
                <div key={s.id} data-reveal>
                  <CampusServiceCard service={s} categoryName={categoryName(s.category)} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="container mx-auto px-4 pb-14 md:pb-20">
          <h2 data-reveal className="font-display text-2xl font-medium text-foreground md:text-3xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-8 border-t border-border pt-8 md:grid-cols-3">
            {STEPS.map(({ title, body }, i) => (
              <li key={title} data-reveal>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/20 text-sm text-foreground/70">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-medium text-foreground">{title}</h3>
                <p className="mt-1.5 max-w-xs leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="container mx-auto px-4 pb-16 md:pb-24">
          <div data-reveal className="grid items-center overflow-hidden rounded-2xl bg-accent text-accent-foreground md:grid-cols-[1.2fr_1fr]">
            <div className="p-8 md:p-12">
              <h2 className="font-display text-3xl font-medium leading-tight md:text-4xl">Got a hustle? Give it a home page.</h2>
              <ul className="mt-6 space-y-2.5 text-accent-foreground/80">
                {VENDOR_PERKS.map((text) => (
                  <li key={text} className="flex gap-3">
                    <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent-foreground/70" />
                    {text}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="mt-8 rounded-lg bg-white text-accent hover:bg-white/90"
                onClick={() => navigate(vendorCta)}
              >
                {user ? "Go to my dashboard" : "Join as a vendor for free"}
              </Button>
            </div>
            <img
              src={unsplash(VENDOR_PHOTO, 900)}
              alt=""
              loading="lazy"
              className="h-64 w-full object-cover md:h-full md:min-h-[22rem]"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CampusHome;
