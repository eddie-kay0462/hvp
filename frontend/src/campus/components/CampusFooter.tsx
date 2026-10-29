import { Link } from "react-router-dom";
import { CAMPUS } from "@/config/appMode";

const linkClass = "inline-flex min-h-[44px] items-center text-sm text-muted-foreground hover:text-foreground";

export const CampusFooter = () => (
  <footer className="border-t border-border bg-white dark:bg-card">
    <div className="container mx-auto px-4 py-12 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] md:px-6">
      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm space-y-3">
          <p className="text-xl font-semibold text-foreground">
            Hustle Village {CAMPUS?.shortName}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Find services from {CAMPUS?.name} students and contact them directly. Hustle Village doesn't take
            payments here, so agree on the work and price with the vendor.
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold text-foreground">Hire</p>
          <ul>
            <li>
              <Link to="/services" className={linkClass}>
                Browse services
              </Link>
            </li>
            <li>
              <a href="https://hustlevillage.app" className={linkClass}>
                Hustle Village marketplace
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold text-foreground">Sell</p>
          <ul>
            <li>
              <Link to="/signup" className={linkClass}>
                Become a vendor
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className={linkClass}>
                Vendor dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Hustle Village
      </p>
    </div>
  </footer>
);
