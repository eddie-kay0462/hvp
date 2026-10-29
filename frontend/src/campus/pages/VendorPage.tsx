import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ImageIcon, Images, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import api, { type PortfolioItem, type PublicVendorProfile } from "@/lib/api";
import { CAMPUS } from "@/config/appMode";
import { ContactButtons, MobileContactBar } from "../components/ContactButtons";
import { PortfolioLightbox } from "../components/PortfolioLightbox";
import { hasContactDetails } from "../lib/contact";
import { firstName, formatMonthYear, formatServicePrice, initials } from "../lib/format";
import { gsap, MOTION_OK, useGSAP, useReveal } from "../lib/motion";

/**
 * A vendor's public page — the link they share. Portfolio first, then their
 * live services, with contact buttons always in view.
 */
const VendorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vendor, setVendor] = useState<PublicVendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [openItem, setOpenItem] = useState<PortfolioItem | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.sellers
      .getPublicProfile(id)
      .then((res) => setVendor(res.data ?? null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (vendor) document.title = `${vendor.display_name} · Hustle Village ${CAMPUS?.shortName ?? ""}`.trim();
  }, [vendor]);

  useGSAP(
    () => {
      if (!vendor) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".profile-avatar", { autoAlpha: 0, scale: 0.85, duration: 0.6 })
          .from(".profile-line", { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.07 }, "-=0.35");
      });
      return () => mm.revert();
    },
    { scope: pageRef, dependencies: [vendor?.user_id], revertOnUpdate: true }
  );

  useReveal(pageRef, [vendor?.user_id]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: vendor?.display_name, url });
        return;
      } catch {
        // Cancelled or unsupported target — fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-36 bg-[#E7EEE4] md:h-48" />
        <div className="container mx-auto -mt-14 space-y-6 px-4">
          <Skeleton className="h-28 w-28 rounded-full border-4 border-background" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound || !vendor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-medium text-foreground">We couldn't find this vendor</h1>
          <p className="mt-2 text-muted-foreground">The link may be wrong, or the profile was removed.</p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate("/services")}>
            Browse services
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const name = vendor.display_name;
  const first = firstName(name);
  const memberSince = formatMonthYear(vendor.member_since);
  const isOwner = user?.id === vendor.user_id;
  const [featured, ...restPortfolio] = vendor.portfolio;
  const stats = [
    { value: vendor.portfolio.length, label: vendor.portfolio.length === 1 ? "portfolio piece" : "portfolio pieces" },
    { value: vendor.services.length, label: vendor.services.length === 1 ? "live service" : "live services" },
    ...(memberSince ? [{ value: memberSince, label: "joined" }] : []),
  ];
  const showBar = hasContactDetails(vendor);

  return (
    <div ref={pageRef} className="min-h-screen bg-background">
      <Navbar />

      <div className="h-36 bg-[#E7EEE4] md:h-48" />

      <main className="container mx-auto px-4 pb-16">
        <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
            <Avatar className="profile-avatar -mt-14 h-28 w-28 border-4 border-background shadow-lg md:-mt-16 md:h-32 md:w-32">
              {vendor.profile_pic && <AvatarImage src={vendor.profile_pic} alt="" className="object-cover" />}
              <AvatarFallback className="font-display bg-primary text-3xl font-medium text-primary-foreground">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 md:pt-4">
              <h1 className="profile-line font-display break-words text-3xl font-medium leading-tight text-foreground md:text-4xl">
                {name}
              </h1>
              <div className="profile-line mt-2 flex flex-wrap items-center gap-2">
                {vendor.communities.map((c) => (
                  <span key={c.slug} className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="profile-line flex gap-2 md:pt-5">
            {isOwner && (
              <Button variant="outline" className="rounded-xl bg-white dark:bg-card" onClick={() => navigate("/dashboard/profile")}>
                Edit my page
              </Button>
            )}
            <Button variant="outline" className="rounded-xl bg-white dark:bg-card" onClick={share}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </header>

        <dl className={`profile-line mt-8 grid max-w-xl ${stats.length === 3 ? "grid-cols-3" : "grid-cols-2"} divide-x divide-border rounded-2xl border border-border bg-white py-4 dark:bg-card`}>
          {stats.map((s) => (
            <div key={s.label} className="px-4 text-center">
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-display text-xl font-medium text-foreground md:text-2xl">{s.value}</dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">{s.label}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-12">
          <div className="min-w-0 space-y-12">
            {vendor.bio && (
              <section data-reveal>
                <h2 className="font-display text-xl font-medium text-foreground">About {first}</h2>
                <p className="mt-3 max-w-prose whitespace-pre-line text-lg leading-relaxed text-foreground/85">{vendor.bio}</p>
              </section>
            )}

            <section>
              <h2 data-reveal className="font-display text-xl font-medium text-foreground">
                Portfolio
              </h2>
              {!featured ? (
                <div data-reveal className="mt-4 flex items-center gap-4 rounded-2xl bg-accent/[0.05] p-6">
                  <ImageIcon className="h-8 w-8 shrink-0 text-accent/40" />
                  <p className="text-muted-foreground">
                    {isOwner ? (
                      <>
                        Add photos of past jobs so customers can see your work.{" "}
                        <Link to="/dashboard/portfolio" className="font-semibold text-primary underline-offset-4 hover:underline">
                          Add portfolio pieces
                        </Link>
                      </>
                    ) : (
                      `${first} hasn't added portfolio pieces yet. Ask them for examples when you get in touch.`
                    )}
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[featured, ...restPortfolio].map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      data-reveal
                      onClick={() => setOpenItem(item)}
                      className={`group relative overflow-hidden rounded-2xl bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        i === 0 && vendor.portfolio.length > 2 ? "sm:col-span-2" : ""
                      }`}
                    >
                      <div className={i === 0 && vendor.portfolio.length > 2 ? "aspect-[16/9]" : "aspect-[4/3]"}>
                        {item.image_urls[0] ? (
                          <img
                            src={item.image_urls[0]}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-accent/[0.06]">
                            <ImageIcon className="h-10 w-10 text-accent/30" />
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-12">
                        <p className="font-display line-clamp-1 font-medium text-white">{item.title}</p>
                        {item.completed_on && <p className="text-xs text-white/75">{formatMonthYear(item.completed_on)}</p>}
                      </div>
                      {item.image_urls.length > 1 && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
                          <Images className="h-3.5 w-3.5" />
                          {item.image_urls.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 data-reveal className="font-display text-xl font-medium text-foreground">
                Services
              </h2>
              {vendor.services.length === 0 ? (
                <p data-reveal className="mt-3 text-muted-foreground">
                  No live services right now. You can still contact {first} directly.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {vendor.services.map((s) => (
                    <Link
                      key={s.id}
                      data-reveal
                      to={`/service/${s.id}`}
                      className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-3 pr-5 transition-colors hover:border-accent/40 dark:bg-card"
                    >
                      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-accent/[0.06]">
                        {s.image_urls?.[0] && <img src={s.image_urls[0]} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display line-clamp-2 font-medium text-foreground group-hover:underline">{s.title}</p>
                      </div>
                      <p className="font-display shrink-0 font-medium text-foreground">{formatServicePrice(s)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="h-fit lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_16px_40px_-24px_rgb(18_73_25_/_0.3)] dark:bg-card">
              <h2 className="font-display text-lg font-medium text-foreground">Contact {first}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Say what you need and when. Most vendors reply on WhatsApp.</p>
              <ContactButtons contact={vendor} className="mt-5" />
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Hustle Village doesn't handle payments on campus sites. Agree on the work and price with {first}.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
      {showBar && (
        <>
          {/* Keeps the footer clear of the pinned contact bar on phones */}
          <div className="h-[5.5rem] bg-white md:hidden dark:bg-card" />
          <MobileContactBar contact={vendor} vendorName={first} />
        </>
      )}

      <PortfolioLightbox item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  );
};

export default VendorPage;
