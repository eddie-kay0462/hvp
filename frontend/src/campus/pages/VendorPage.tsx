import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Calendar, ExternalLink, ImageIcon, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import api, { type PortfolioItem, type PublicVendorProfile } from "@/lib/api";
import { CAMPUS } from "@/config/appMode";
import { ContactButtons } from "../components/ContactButtons";
import { formatMonthYear, formatServicePrice } from "../lib/format";

/**
 * A vendor's public page — the link they share. Portfolio first, then their
 * live services, with contact buttons always in view.
 */
const VendorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<PublicVendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [openItem, setOpenItem] = useState<PortfolioItem | null>(null);

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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10 space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !vendor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">Vendor not found</h1>
          <p className="mt-2 text-muted-foreground">This profile doesn't exist or was removed.</p>
          <Button className="mt-6" onClick={() => navigate("/services")}>
            Browse services
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const memberSince = formatMonthYear(vendor.member_since);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Header + content */}
          <div className="min-w-0 space-y-10">
            <section className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar className="h-24 w-24 shrink-0">
                {vendor.profile_pic && <AvatarImage src={vendor.profile_pic} alt="" />}
                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                  {vendor.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground break-words">{vendor.display_name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {vendor.communities.map((c) => (
                    <Badge key={c.slug} variant="secondary">
                      {c.name}
                    </Badge>
                  ))}
                  {memberSince && <span>Member since {memberSince}</span>}
                </div>
                {vendor.bio && <p className="whitespace-pre-line text-foreground/90 leading-relaxed">{vendor.bio}</p>}
              </div>
            </section>

            {/* Portfolio */}
            <section>
              <h2 className="mb-4 text-xl font-bold text-foreground">Portfolio</h2>
              {vendor.portfolio.length === 0 ? (
                <p className="text-sm text-muted-foreground">No portfolio items yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {vendor.portfolio.map((item) => (
                    <Card
                      key={item.id}
                      className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                      onClick={() => setOpenItem(item)}
                    >
                      <div className="aspect-[4/3] bg-muted">
                        {item.image_urls[0] ? (
                          <img
                            src={item.image_urls[0]}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 p-4">
                        <h3 className="font-semibold text-foreground line-clamp-1">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        )}
                        {item.image_urls.length > 1 && (
                          <p className="text-xs text-muted-foreground">{item.image_urls.length} photos</p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Services */}
            <section>
              <h2 className="mb-4 text-xl font-bold text-foreground">Services</h2>
              {vendor.services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No live services right now.</p>
              ) : (
                <div className="grid gap-3">
                  {vendor.services.map((s) => (
                    <Link
                      key={s.id}
                      to={`/service/${s.id}`}
                      className="flex items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                        {s.image_urls?.[0] && <img src={s.image_urls[0]} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground line-clamp-1">{s.title}</p>
                        <p className="text-sm text-primary font-semibold">{formatServicePrice(s)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Contact sidebar */}
          <aside className="lg:sticky lg:top-24 h-fit space-y-4">
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold text-foreground">Contact {vendor.display_name.split(" ")[0]}</h2>
              <ContactButtons contact={vendor} />
              <p className="text-xs text-muted-foreground">
                Agree on the work and price directly with the vendor. Hustle Village doesn't handle payments here.
              </p>
            </Card>
            <Button variant="outline" className="w-full" onClick={copyLink}>
              <Link2 className="mr-2 h-4 w-4" />
              Copy profile link
            </Button>
          </aside>
        </div>
      </main>
      <Footer />

      <Dialog open={!!openItem} onOpenChange={(open) => !open && setOpenItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {openItem && (
            <>
              <DialogHeader>
                <DialogTitle>{openItem.title}</DialogTitle>
                {openItem.completed_on && (
                  <DialogDescription className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatMonthYear(openItem.completed_on)}
                  </DialogDescription>
                )}
              </DialogHeader>
              {openItem.description && <p className="whitespace-pre-line text-sm text-foreground/90">{openItem.description}</p>}
              <div className="grid gap-3">
                {openItem.image_urls.map((url) => (
                  <img key={url} src={url} alt={openItem.title} loading="lazy" className="w-full rounded-md" />
                ))}
              </div>
              {openItem.link_url && (
                <Button asChild variant="outline">
                  <a href={openItem.link_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View project
                  </a>
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorPage;
