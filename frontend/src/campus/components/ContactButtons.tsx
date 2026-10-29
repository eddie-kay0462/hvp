import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VendorContact } from "@/lib/api";
import { buildContactLinks } from "../lib/contact";

interface ContactButtonsProps {
  contact: VendorContact;
  /** Used to prefill the WhatsApp message. */
  context?: string;
  className?: string;
}

const linkProps = (href: string) =>
  href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {};

/**
 * Off-platform contact channels. On campus sites these replace "Book Now" —
 * buyer and vendor agree on the job and payment directly.
 */
export const ContactButtons = ({ contact, context, className }: ContactButtonsProps) => {
  const [first, ...rest] = buildContactLinks(contact, context);

  if (!first) {
    return (
      <p className={cn("rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground", className)}>
        This vendor hasn't added contact details yet. Check back soon.
      </p>
    );
  }

  const FirstIcon = first.icon;
  return (
    <div className={cn("space-y-2", className)}>
      <Button asChild size="lg" className="h-12 w-full rounded-xl text-base">
        <a href={first.href} {...linkProps(first.href)}>
          <FirstIcon className="mr-2 h-5 w-5" />
          {first.key === "whatsapp" ? "Message on WhatsApp" : first.label}
        </a>
      </Button>
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {rest.map(({ key, label, icon: Icon, href }) => (
            <Button key={key} asChild variant="outline" className="h-11 rounded-xl bg-white dark:bg-card">
              <a href={href} {...linkProps(href)}>
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </a>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Phone-only bar pinned to the bottom of the screen so the main contact
 * channel is always one tap away. Pages using it add bottom padding on mobile.
 */
export const MobileContactBar = ({ contact, context, vendorName }: ContactButtonsProps & { vendorName: string }) => {
  const [first, ...rest] = buildContactLinks(contact, context);
  if (!first) return null;
  const FirstIcon = first.icon;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <Button asChild className="h-12 flex-1 rounded-xl text-base">
          <a href={first.href} {...linkProps(first.href)}>
            <FirstIcon className="mr-2 h-5 w-5" />
            {first.key === "whatsapp" ? `WhatsApp ${vendorName}` : `${first.label} ${vendorName}`}
          </a>
        </Button>
        {rest.slice(0, 2).map(({ key, label, icon: Icon, href }) => (
          <Button key={key} asChild variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-xl bg-white dark:bg-card">
            <a href={href} aria-label={label} {...linkProps(href)}>
              <Icon className="h-5 w-5" />
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
};
