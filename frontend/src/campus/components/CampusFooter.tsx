import { Link } from "react-router-dom";
import { CAMPUS } from "@/config/appMode";

export const CampusFooter = () => (
  <footer className="bg-background border-t border-border">
    <div className="container mx-auto px-4 md:px-6 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2 max-w-sm">
          <h3 className="text-lg font-bold text-primary">Hustle Village · {CAMPUS?.shortName}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Discover services from {CAMPUS?.name} students and contact them directly. Hustle Village
            doesn't process payments here — agree on the work and price with the vendor.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <li>
            <Link to="/services" className="inline-flex min-h-[44px] items-center text-muted-foreground hover:text-primary">
              Browse services
            </Link>
          </li>
          <li>
            <Link to="/signup" className="inline-flex min-h-[44px] items-center text-muted-foreground hover:text-primary">
              Become a vendor
            </Link>
          </li>
          <li>
            <a
              href="https://hustlevillage.app"
              className="inline-flex min-h-[44px] items-center text-muted-foreground hover:text-primary"
            >
              Hustle Village marketplace
            </a>
          </li>
        </ul>
      </div>
      <p className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground">
        © {new Date().getFullYear()} Hustle Village. All rights reserved.
      </p>
    </div>
  </footer>
);
