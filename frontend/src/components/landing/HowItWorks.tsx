import { Card } from "@/components/ui/card";
import { Search, MessageSquare, Wallet } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Browse & Compare",
    description: "Find the perfect service from verified Ashesi students"
  },
  {
    icon: MessageSquare,
    title: "Book Securely",
    description: "Message sellers and confirm bookings with confidence"
  },
  {
    icon: Wallet,
    title: "Pay with Mobile Money",
    description: "Safe payments with refund protection"
  }
];

export const HowItWorks = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="p-6 text-center relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-lg mb-2 text-card-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
