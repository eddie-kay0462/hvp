import { BadgeCheck, ShieldCheck, Wallet } from "lucide-react";

const items = [
  {
    icon: BadgeCheck,
    title: "Verified students",
    description:
      "Every seller signs in with their Ashesi email before they can list.",
  },
  {
    icon: Wallet,
    title: "Mobile money payments",
    description: "Pay with MTN, Vodafone, or AirtelTigo — held in escrow until delivery.",
  },
  {
    icon: ShieldCheck,
    title: "Refunds if it goes wrong",
    description:
      "If a service isn't delivered as described, you get your money back.",
  },
];

export const TrustBadges = () => {
  return (
    <section className="py-12 md:py-16 bg-white border-y border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {items.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 flex-shrink-0">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
