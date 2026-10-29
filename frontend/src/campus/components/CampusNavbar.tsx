import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, Plus, Search } from "lucide-react";
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
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          <button type="button" className="flex items-center gap-2" onClick={() => go("/")} aria-label="Home">
            <NavLogo />
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {CAMPUS?.shortName}
            </span>
          </button>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" onClick={() => go("/services")}>
              <Search className="mr-2 h-4 w-4" />
              Browse
            </Button>
            {user ? (
              <>
                <Button variant="secondary" onClick={() => go("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  My dashboard
                </Button>
                <Button variant="outline" onClick={() => go("/list-service")}>
                  <Plus className="mr-2 h-4 w-4" />
                  List a service
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="Account menu">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">{initial}</AvatarFallback>
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
                <Button variant="ghost" onClick={() => go("/login")}>
                  Sign in
                </Button>
                <Button onClick={() => go("/signup")}>Join as a vendor</Button>
              </>
            )}
          </div>

          <button
            className="md:hidden flex items-center justify-center h-11 w-11 -mr-2 rounded-md"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-3 border-t border-border">
            <div className="flex flex-col gap-2">
              <Button variant="ghost" className="w-full" onClick={() => go("/services")}>
                <Search className="mr-2 h-4 w-4" />
                Browse
              </Button>
              {user ? (
                <>
                  <Button variant="secondary" className="w-full" onClick={() => go("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    My dashboard
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => go("/list-service")}>
                    <Plus className="mr-2 h-4 w-4" />
                    List a service
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="w-full" onClick={() => go("/login")}>
                    Sign in
                  </Button>
                  <Button className="w-full" onClick={() => go("/signup")}>
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
