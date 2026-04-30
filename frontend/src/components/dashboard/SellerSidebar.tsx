import {
  GaugeCircle,
  Layers,
  CalendarDays,
  Wallet,
  UserRound,
  ShieldCheck,
  Menu,
  X,
  House,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const SIDEBAR_PIN_STORAGE_KEY = "hv-seller-sidebar-pinned";

function readPinned(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY);
    return v === "true";
  } catch {
    return false;
  }
}

const transition =
  "duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none motion-reduce:duration-0";

export const SellerSidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState<boolean>(readPinned);
  const [hovered, setHovered] = useState(false);
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // expanded on desktop when either pinned by user or hovered
  const expanded = pinned || hovered;
  // any time we want to show labels: desktop expanded OR mobile drawer open
  const showLabels = expanded || mobileOpen;

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setIsAdmin(data?.role === "admin");
    };

    checkAdminStatus();
  }, [user]);

  const togglePinned = () => {
    setPinned((p) => {
      const next = !p;
      try {
        window.localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const navigation = [
    { name: "Marketplace", href: "/", icon: House },
    { name: "Dashboard", href: "/seller/dashboard", icon: GaugeCircle },
    { name: "My Services", href: "/seller/services", icon: Layers },
    { name: "Bookings", href: "/seller/bookings", icon: CalendarDays },
    { name: "Payments", href: "/seller/payments", icon: Wallet },
    { name: "Profile", href: "/seller/profile", icon: UserRound },
    ...(isAdmin
      ? [
          {
            name: "Admin dashboard",
            href: "/admin/services/pending",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  const navItemClass = cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-accent-foreground/85",
    transition,
    "transition-colors hover:bg-accent-foreground/10",
    "relative min-h-[2.75rem]",
    "lg:justify-start",
    !showLabels && "lg:justify-center",
  );

  const navItemActiveClass =
    "bg-accent-foreground/12 text-accent-foreground font-medium shadow-sm";

  const labelClass = cn(
    "whitespace-nowrap text-sm font-medium tracking-tight",
    transition,
    "lg:transition-[max-width,opacity,transform] lg:duration-300 lg:ease-[cubic-bezier(0.4,0,0.2,1)]",
    showLabels
      ? "lg:max-w-[14rem] lg:translate-x-0 lg:opacity-100"
      : "lg:max-w-0 lg:translate-x-1 lg:opacity-0 lg:overflow-hidden lg:pointer-events-none",
  );

  const brandTextClass = cn(
    "min-w-0 flex-1",
    transition,
    "lg:transition-[max-width,opacity,transform] lg:duration-300 lg:ease-[cubic-bezier(0.4,0,0.2,1)]",
    showLabels
      ? "lg:max-w-[14rem] lg:translate-x-0 lg:opacity-100"
      : "lg:max-w-0 lg:translate-x-1 lg:opacity-0 lg:overflow-hidden lg:pointer-events-none",
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen shrink-0 flex-col",
          "border-r border-accent-foreground/10 bg-accent text-accent-foreground shadow-sm",
          "w-64 max-w-[min(100vw,16rem)] overflow-hidden",
          "transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          "lg:sticky lg:max-w-none lg:translate-x-0 lg:shadow-none",
          transition,
          "lg:transition-[width]",
          expanded ? "lg:w-64" : "lg:w-[4.25rem]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "flex min-h-[4.25rem] items-center border-b border-accent-foreground/10",
              "px-4 py-4 transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              showLabels
                ? "lg:justify-start lg:px-5 lg:py-5"
                : "lg:justify-center lg:px-3 lg:py-3",
            )}
          >
            <div className={brandTextClass}>
              <h2 className="text-base font-bold leading-tight tracking-tight">
                Hustle Village
              </h2>
              <p className="mt-0.5 text-xs text-accent-foreground/65">
                Seller dashboard
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={togglePinned}
              aria-pressed={pinned}
              aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
              title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
              className={cn(
                "hidden h-8 w-8 shrink-0 text-accent-foreground/75 hover:bg-accent-foreground/10 hover:text-accent-foreground lg:flex",
                transition,
                showLabels ? "opacity-100" : "opacity-0 pointer-events-none",
              )}
            >
              {pinned ? (
                <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
              ) : (
                <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
              )}
            </Button>
          </div>

          <nav
            className={cn(
              "flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden py-4 transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              showLabels ? "px-2 lg:px-3" : "px-2 lg:px-1.5",
            )}
          >
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                title={showLabels ? undefined : item.name}
                className={navItemClass}
                activeClassName={navItemActiveClass}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon
                  className="h-5 w-5 shrink-0 stroke-[2] transition-transform duration-300"
                  aria-hidden
                />
                <span className={labelClass}>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
    </>
  );
};
