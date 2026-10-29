import { Button } from "@/components/ui/button";
import type { VendorContact } from "@/lib/api";
import { buildContactLinks } from "../lib/contact";

interface ContactButtonsProps {
  contact: VendorContact;
  /** Used to prefill the WhatsApp message. */
  context?: string;
  className?: string;
}

/**
 * Off-platform contact channels. On campus sites these replace "Book Now" —
 * buyer and vendor agree on the job and payment directly.
 */
export const ContactButtons = ({ contact, context, className }: ContactButtonsProps) => {
  const links = buildContactLinks(contact, context);

  if (links.length === 0) {
    return (
      <p className={`text-sm text-muted-foreground ${className ?? ""}`}>
        This vendor hasn't added contact details yet.
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {links.map(({ key, label, icon: Icon, href, primary }) => {
        const external = href.startsWith("http");
        return (
          <Button key={key} asChild variant={primary ? "default" : "outline"} className="w-full justify-start">
            <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </a>
          </Button>
        );
      })}
    </div>
  );
};
