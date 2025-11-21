import { CheckCircle2, Shield, Star } from "lucide-react";

export const TrustBadges = () => {
  const badges = [
    {
      icon: CheckCircle2,
      text: "All sellers are verified Ashesi students"
    },
    {
      icon: Shield,
      text: "Secure mobile money payments"
    },
    {
      icon: Star,
      text: "Read reviews from fellow students"
    }
  ];

  return (
    <section className="py-12 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div key={index} className="flex items-center gap-4 justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <p className="text-foreground font-medium">
                  {badge.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
