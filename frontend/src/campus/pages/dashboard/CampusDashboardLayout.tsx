import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import api, { type PublicVendorProfile } from "@/lib/api";
import { hasContactDetails } from "../../lib/contact";
import type { DashboardContext } from "../../lib/dashboard";
import { firstName, initials } from "../../lib/format";

const TABS = [
  { to: "/dashboard/profile", label: "Profile & contacts" },
  { to: "/dashboard/portfolio", label: "Portfolio" },
  { to: "/dashboard/services", label: "Services" },
];

/** Vendor dashboard for campus sites: profile, portfolio, services. */
const CampusDashboardLayout = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [profile, setProfile] = useState<PublicVendorProfile | null>(null);
  const profilePath = `/sellers/${user?.id}`;
  const profileUrl = `${window.location.origin}${profilePath}`;

  const refreshSetup = useCallback(() => {
    if (!user) return;
    api.sellers
      .getPublicProfile(user.id)
      .then((res) => setProfile(res.data ?? null))
      .catch((err) => console.error("Failed to load vendor profile:", err));
  }, [user]);

  // Services are edited on a shared page, so re-check whenever the tab changes too.
  useEffect(refreshSetup, [refreshSetup, pathname]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied. Share it anywhere.");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const name = profile?.display_name ?? user?.user_metadata?.firstName ?? "there";
  const steps = profile
    ? [
        { done: !!profile.bio?.trim(), label: "Write a short bio", to: "/dashboard/profile" },
        { done: hasContactDetails(profile), label: "Add a way to contact you", to: "/dashboard/profile" },
        { done: profile.portfolio.length > 0, label: "Add a portfolio piece", to: "/dashboard/portfolio" },
        { done: profile.services.length > 0, label: "Get a service live", to: "/dashboard/services" },
      ]
    : [];
  const doneCount = steps.filter((s) => s.done).length;
  const setupComplete = steps.length > 0 && doneCount === steps.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="border-b border-border bg-white dark:bg-card">
        <div className="container mx-auto px-4 pt-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-medium text-accent-foreground">
                {initials(name)}
              </span>
              <div>
                <h1 className="font-display text-2xl font-medium text-foreground md:text-3xl">Hi, {firstName(name)}</h1>
                <p className="text-sm text-muted-foreground">Everything here shows on your public page.</p>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex h-10 min-w-0 items-center rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground sm:max-w-xs">
                <span className="truncate">{profileUrl.replace(/^https?:\/\//, "")}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl sm:flex-none" onClick={copyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
                <Button asChild className="flex-1 rounded-xl sm:flex-none">
                  <a href={profilePath} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View my page
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {steps.length > 0 && !setupComplete && (
            <div className="mt-6 rounded-2xl bg-accent-light/40 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display font-medium text-foreground">Get your page ready for customers</p>
                <p className="text-sm text-foreground/70">
                  {doneCount} of {steps.length} done
                </p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70" aria-hidden>
                <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
              </div>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step) => (
                  <li key={step.label}>
                    <Link
                      to={step.to}
                      className={`flex h-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm transition-colors dark:bg-card ${
                        step.done ? "text-muted-foreground" : "font-medium text-foreground hover:bg-white/70"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          step.done ? "border-accent bg-accent text-accent-foreground" : "border-accent/30"
                        }`}
                      >
                        {step.done && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className={step.done ? "line-through decoration-foreground/30" : ""}>{step.label}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <nav className="campus-scroll-row mt-6 flex gap-1 overflow-x-auto" aria-label="Dashboard sections">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <main>
        <Outlet context={{ refreshSetup } satisfies DashboardContext} />
      </main>
    </div>
  );
};

export default CampusDashboardLayout;
