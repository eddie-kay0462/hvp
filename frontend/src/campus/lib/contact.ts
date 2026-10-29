import { Globe, Instagram, Mail, MessageCircle, Phone } from "lucide-react";
import type { VendorContact } from "@/lib/api";

/** Contact buttons to show for a vendor, in display order (WhatsApp first). */
export const buildContactLinks = (contact: VendorContact, context?: string) => {
  const greeting = context
    ? `Hi! I found your "${context}" listing on Hustle Village and I'm interested.`
    : "Hi! I found your profile on Hustle Village and I'm interested in your services.";

  return [
    contact.whatsapp_number && {
      key: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/${contact.whatsapp_number}?text=${encodeURIComponent(greeting)}`,
      primary: true,
    },
    contact.contact_phone && {
      key: "phone",
      label: "Call",
      icon: Phone,
      href: `tel:${contact.contact_phone.replace(/[^\d+]/g, "")}`,
    },
    contact.contact_email && {
      key: "email",
      label: "Email",
      icon: Mail,
      href: `mailto:${contact.contact_email}?subject=${encodeURIComponent(
        context ? `About your "${context}" listing` : "Enquiry from Hustle Village"
      )}`,
    },
    contact.instagram_handle && {
      key: "instagram",
      label: "Instagram",
      icon: Instagram,
      href: `https://instagram.com/${contact.instagram_handle}`,
    },
    contact.website_url && {
      key: "website",
      label: "Website",
      icon: Globe,
      href: contact.website_url,
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: typeof Phone;
    href: string;
    primary?: boolean;
  }>;
};

export const hasContactDetails = (contact: VendorContact) => buildContactLinks(contact).length > 0;
