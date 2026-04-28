import { Search, MessageSquare, Wallet } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Browse",
    description:
      "Search by category or keyword to find a service that fits what you need.",
  },
  {
    icon: MessageSquare,
    title: "Book",
    description:
      "Message the seller, agree on the details, and confirm your booking.",
  },
  {
    icon: Wallet,
    title: "Pay",
    description:
      "Pay with mobile money. Funds are held until the service is delivered.",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-8 md:mb-10">
          How it works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-xl border border-border bg-white p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-base text-foreground mb-1.5">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
