import { LayoutDashboard, Package, Calendar, DollarSign, User, Menu, X } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard },
  { name: "My Services", href: "/seller/services", icon: Package },
  { name: "Bookings", href: "/seller/bookings", icon: Calendar },
  { name: "Payments", href: "/seller/payments", icon: DollarSign },
  { name: "Profile", href: "/seller/profile", icon: User },
];

export const SellerSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen bg-accent text-accent-foreground
          w-64 transform transition-transform duration-200 ease-in-out z-40
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-accent-foreground/10">
            <h2 className="text-xl font-bold">Hustle Village</h2>
            <p className="text-sm text-accent-foreground/70 mt-1">Seller Dashboard</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-accent-foreground/80 hover:bg-accent-foreground/10 transition-colors"
                activeClassName="bg-accent-foreground/10 text-accent-foreground font-medium"
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-accent-foreground/10">
            <NavLink
              to="/"
              className="text-sm text-accent-foreground/70 hover:text-accent-foreground"
            >
              ← Back to Marketplace
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
