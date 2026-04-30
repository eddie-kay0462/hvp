import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CtaBanner = () => {
  const navigate = useNavigate();

  return (
    <section className="border-t border-border bg-primary/[0.06] py-14 md:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
            Ready when you are.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Hire a student on campus or offer your skills—secure booking and mobile
            money payments are built in.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <Button
              size="lg"
              className="w-full sm:w-auto min-h-12 px-8 rounded-xl text-base font-semibold shadow-sm"
              onClick={() => navigate("/services")}
            >
              Browse services
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto min-h-12 px-8 rounded-xl text-base font-semibold bg-white"
              onClick={() => navigate("/become-a-hustler")}
            >
              Sell your skills
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
