import { useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { PortfolioItem } from "@/lib/api";
import { formatMonthYear } from "../lib/format";

interface PortfolioLightboxProps {
  item: PortfolioItem | null;
  onClose: () => void;
}

/** Full-size photos of one portfolio piece, with arrow-key and button navigation. */
export const PortfolioLightbox = ({ item, onClose }: PortfolioLightboxProps) => {
  const [index, setIndex] = useState(0);
  const count = item?.image_urls.length ?? 0;

  useEffect(() => setIndex(0), [item]);

  const step = (delta: number) => count > 1 && setIndex((i) => (i + delta + count) % count);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[92vh] max-w-5xl gap-0 overflow-y-auto rounded-2xl p-0 sm:rounded-2xl"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        {item && (
          <div className="grid md:grid-cols-[1fr_300px]">
            <div className="relative flex min-h-[16rem] items-center justify-center bg-accent">
              {count > 0 ? (
                <img
                  key={item.image_urls[index]}
                  src={item.image_urls[index]}
                  alt={`${item.title}, photo ${index + 1} of ${count}`}
                  className="max-h-[70vh] w-full object-contain duration-300 animate-in fade-in"
                />
              ) : (
                <p className="p-10 text-sm text-accent-foreground/70">No photos for this piece.</p>
              )}
              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-accent shadow hover:bg-white"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-accent shadow hover:bg-white"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
                    {index + 1} / {count}
                  </span>
                </>
              )}
            </div>
            <div className="space-y-4 p-6">
              <DialogTitle className="font-display pr-6 text-xl font-medium leading-snug">{item.title}</DialogTitle>
              {item.completed_on ? (
                <DialogDescription className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatMonthYear(item.completed_on)}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">Portfolio piece</DialogDescription>
              )}
              {item.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{item.description}</p>
              )}
              {item.link_url && (
                <Button asChild variant="outline" className="w-full rounded-xl">
                  <a href={item.link_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View project
                  </a>
                </Button>
              )}
              {count > 1 && (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {item.image_urls.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`aspect-square overflow-hidden rounded-lg ring-2 transition ${
                        i === index ? "ring-accent" : "ring-transparent opacity-70 hover:opacity-100"
                      }`}
                      aria-label={`Show photo ${i + 1}`}
                      aria-pressed={i === index}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
