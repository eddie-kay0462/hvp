import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ExternalLink, LayoutDashboard, LogOut, Menu, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NavLogo } from "@/components/landing/NavLogo";
import { useAuth } from "@/contexts/AuthContext";
import { CAMPUS } from "@/config/appMode";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors ${
    isActive ? "text-foreground" : "text-foreground/70 hover:text-foreground"
  }`;

/** Discovery-only navbar for campus sites: browse, list, dashboard. */
export const CampusNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const go = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const initial = (user?.user_metadata?.firstName || user?.email || "U").charAt(0).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center gap-4">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label={`Hustle Village ${CAMPUS?.shortName ?? ""} home`}>
            <NavLogo />
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
              {CAMPUS?.shortName}
            </span>
          </Link>

          <div className="ml-auto hidden items-center gap-1 md:flex">
            <NavLink to="/services" className={navLinkClass}>
              Browse services
            </NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                <Button variant="outline" className="ml-2 rounded-full bg-white dark:bg-card" onClick={() => go("/list-service")}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  List a service
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative ml-1 h-10 w-10 rounded-full p-0" aria-label="Account menu">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-accent text-accent-foreground">{initial}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate text-sm font-medium">{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => go("/dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      My dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => go(`/sellers/${user.id}`)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View my public page
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Sign in
                </NavLink>
                <Button className="ml-2 rounded-full" onClick={() => go("/signup")}>
                  Join as a vendor
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="-mr-2 ml-auto flex h-11 w-11 items-center justify-center rounded-full md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-border py-3 md:hidden">
            <div className="flex flex-col">
              <button type="button" className="h-12 rounded-xl px-3 text-left font-medium text-foreground hover:bg-accent/5" onClick={() => go("/services")}>
                Browse services
              </button>
              {user ? (
                <>
                  <button type="button" className="h-12 rounded-xl px-3 text-left font-medium text-foreground hover:bg-accent/5" onClick={() => go("/dashboard")}>
                    My dashboard
                  </button>
                  <button type="button" className="h-12 rounded-xl px-3 text-left font-medium text-foreground hover:bg-accent/5" onClick={() => go(`/sellers/${user.id}`)}>
                    View my public page
                  </button>
                  <Button className="mt-2 h-12 w-full rounded-xl" onClick={() => go("/list-service")}>
                    <Plus className="mr-2 h-4 w-4" />
                    List a service
                  </Button>
                  <Button variant="ghost" className="mt-1 h-12 w-full rounded-xl text-destructive" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <button type="button" className="h-12 rounded-xl px-3 text-left font-medium text-foreground hover:bg-accent/5" onClick={() => go("/login")}>
                    Sign in
                  </button>
                  <Button className="mt-2 h-12 w-full rounded-xl" onClick={() => go("/signup")}>
                    Join as a vendor
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
