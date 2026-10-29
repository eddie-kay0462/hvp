import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { categoryIcon } from "../lib/categories";
import { formatServicePrice, initials } from "../lib/format";

export interface CampusCatalogService {
  id: string;
  title: string;
  category: string;
  pricing_type?: string | null;
  default_price: number | null;
  price_min?: number | null;
  price_max?: number | null;
  image_urls?: string[] | null;
  average_rating: number | null;
  review_count: number;
  seller?: { display_name?: string; title?: string } | null;
}

interface CampusServiceCardProps {
  service: CampusCatalogService;
  categoryName?: string;
}

/** Catalog card: cover image, vendor, title, rating (or "New") and price. */
export const CampusServiceCard = ({ service, categoryName }: CampusServiceCardProps) => {
  const vendorName = service.seller?.display_name || service.seller?.title || "Vendor";
  const cover = service.image_urls?.[0];
  const Icon = categoryIcon(service.category);
  const rated = service.review_count > 0 && service.average_rating != null;

  return (
    <Link
      to={`/service/${service.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-shadow duration-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-accent/5">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon className="h-10 w-10 text-accent/30" strokeWidth={1.5} />
          </div>
        )}
        {categoryName && (
          <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-xs font-medium text-foreground">
            {categoryName}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground"
          >
            {initials(vendorName)}
          </span>
          <span className="truncate text-sm font-medium text-foreground/80">{vendorName}</span>
        </div>

        <h3 className="mt-3 line-clamp-2 text-base font-medium leading-snug text-foreground group-hover:underline group-hover:underline-offset-4">
          {service.title}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          {rated ? (
            <span className="inline-flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-semibold text-foreground">{service.average_rating!.toFixed(1)}</span>
              <span className="text-muted-foreground">({service.review_count})</span>
            </span>
          ) : (
            <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground/70">New</span>
          )}
          <span className="text-base font-semibold text-foreground">{formatServicePrice(service)}</span>
        </div>
      </div>
    </Link>
  );
};
