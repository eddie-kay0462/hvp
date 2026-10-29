import { NavLink, Outlet } from "react-router-dom";
import { ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const TABS = [
  { to: "/dashboard/profile", label: "Profile & contacts" },
  { to: "/dashboard/portfolio", label: "Portfolio" },
  { to: "/dashboard/services", label: "Services" },
];

/** Vendor dashboard for campus sites: profile, portfolio, services. */
const CampusDashboardLayout = () => {
  const { user } = useAuth();
  const profilePath = `/sellers/${user?.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${profilePath}`);
      toast.success("Profile link copied — share it anywhere");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My dashboard</h1>
              <p className="text-sm text-muted-foreground">Your profile page is the link you share with customers.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Link2 className="mr-2 h-4 w-4" />
                Copy link
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <a href={profilePath} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View my page
                </a>
              </Button>
            </div>
          </div>
          <nav className="mt-5 flex gap-1 overflow-x-auto" aria-label="Dashboard sections">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
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
        <Outlet />
      </main>
    </div>
  );
};

export default CampusDashboardLayout;
