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
    <section className="py-12 md:py-20 bg-background border-b border-border">
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
                className="rounded-xl border border-border p-5 md:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-muted p-2.5 flex-shrink-0">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground mb-1.5">
                      {index + 1}. {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
