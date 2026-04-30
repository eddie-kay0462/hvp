import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  Shield, 
  Zap,
  ArrowRight
} from "lucide-react";

export const BecomeAHustler = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { value: "0", label: "Active Hustlers" },
    { value: "0", label: "Services Listed" },
    { value: "GH₵0", label: "Earned This Month" },
    { value: "0/5", label: "Average Rating" }
  ]);
  const [loading, setLoading] = useState(true);

  const benefits = [
    {
      icon: DollarSign,
      title: "Earn on Your Terms",
      description: "Set your own prices and work schedule. Keep 100% of what you earn."
    },
    {
      icon: Clock,
      title: "Flexible Schedule",
      description: "Work when you want, where you want. Balance studies and income."
    },
    {
      icon: Users,
      title: "Build Your Network",
      description: "Connect with students on campus and grow your reputation."
    },
    {
      icon: TrendingUp,
      title: "Grow Your Skills",
      description: "Turn your talents into income while building your portfolio."
    },
    {
      icon: Shield,
      title: "Secure Payments",
      description: "Get paid safely through our platform with buyer protection."
    },
    {
      icon: Zap,
      title: "Quick Setup",
      description: "Start earning in minutes. List your first service today."
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Create Your Profile",
      description: "Sign up and tell us about your skills and services."
    },
    {
      number: "2",
      title: "List Your Services",
      description: "Add services with pricing, delivery time, and portfolio."
    },
    {
      number: "3",
      title: "Get Booked",
      description: "Students find and book your services on campus."
    },
    {
      number: "4",
      title: "Get Paid",
      description: "Complete work, get paid securely through the platform."
    }
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel
      const [
        sellerRoleResult,
        servicesResult,
        bookingsResult,
        reviewsResult
      ] = await Promise.all([
        // Fetch users with 'seller' role
        supabase
          .from('profiles')
          .select('id')
          .eq('role', 'seller'),
        
        // Count active services and get user IDs
        supabase
          .from('services')
          .select('id, user_id, default_price', { count: 'exact', head: false })
          .eq('is_active', true)
          .eq('is_verified', true),
        
        // Fetch completed bookings this month
        (async () => {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          
          const { data: bookings } = await supabase
            .from('bookings')
            .select('service_id, status, created_at')
            .eq('status', 'completed')
            .gte('created_at', startOfMonth);
          
          return bookings || [];
        })(),
        
        // Fetch all reviews for average rating
        supabase
          .from('reviews')
          .select('rating')
      ]);

      // Count active hustlers - combine users with seller role and users who have active services
      const hustlerIds = new Set<string>();
      
      // Add users with seller role
      sellerRoleResult.data?.forEach(p => hustlerIds.add(p.id));
      
      // Add users who have active services (covers cases where role might not be set)
      const serviceUserIds = servicesResult.data?.map(s => s.user_id) || [];
      serviceUserIds.forEach(id => hustlerIds.add(id));
      
      const totalActiveHustlers = hustlerIds.size;

      // Count active services
      const servicesCount = servicesResult.count || servicesResult.data?.length || 0;

      // Calculate earnings this month
      const completedBookings = bookingsResult as any[];
      const completedServiceIds = completedBookings.map(b => b.service_id);
      
      let earningsThisMonth = 0;
      if (completedServiceIds.length > 0) {
        const { data: completedServices } = await supabase
          .from('services')
          .select('id, default_price')
          .in('id', completedServiceIds);
        
        const servicesMap: Record<string, number> = {};
        completedServices?.forEach(service => {
          servicesMap[service.id] = service.default_price || 0;
        });
        
        earningsThisMonth = completedBookings.reduce((sum, booking) => {
          return sum + (servicesMap[booking.service_id] || 0);
        }, 0);
      }

      // Calculate average rating
      const reviews = reviewsResult.data || [];
      const averageRating = reviews.length > 0
        ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
        : 0;

      // Format stats for display
      setStats([
        { 
          value: totalActiveHustlers >= 1000 
            ? `${(totalActiveHustlers / 1000).toFixed(1)}K+` 
            : totalActiveHustlers >= 100
            ? `${totalActiveHustlers}+`
            : totalActiveHustlers.toString(), 
          label: "Active Hustlers" 
        },
        { 
          value: servicesCount >= 1000 
            ? `${(servicesCount / 1000).toFixed(1)}K+` 
            : servicesCount >= 100
            ? `${servicesCount}+`
            : servicesCount.toString(), 
          label: "Services Listed" 
        },
        { 
          value: earningsThisMonth >= 1000000 
            ? `GH₵${(earningsThisMonth / 1000000).toFixed(1)}M+` 
            : earningsThisMonth >= 1000
            ? `GH₵${(earningsThisMonth / 1000).toFixed(0)}K+`
            : `GH₵${earningsThisMonth.toFixed(0)}`, 
          label: "Earned This Month" 
        },
        { 
          value: averageRating > 0 
            ? `${averageRating.toFixed(1)}/5` 
            : "0/5", 
          label: "Average Rating" 
        }
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep default stats on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="py-14 md:py-20 border-b border-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-5">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                Turn your skills into
                <br />
                <span className="text-primary">steady campus income</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                List your services, set your rates, and get booked by students on
                campus. Payments are secure and setup takes just a few minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button
                  size="lg"
                  className="rounded-lg px-6"
                  onClick={() => navigate("/signup")}
                >
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-lg px-6"
                  onClick={() => navigate("/services")}
                >
                  Browse Services
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-14 bg-white border-b border-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-background p-4 md:p-5 text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold text-foreground">
                    {loading ? "..." : stat.value}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-20 bg-muted/30 border-b border-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8 md:mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Why students sell on Hustle Village
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {benefits.map((benefit, idx) => {
                  const Icon = benefit.icon;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-white p-5 md:p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-primary/10 p-2.5 flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-foreground mb-1.5">
                            {benefit.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background border-b border-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                  How to start
                </h2>
                <p className="text-lg text-muted-foreground">
                  Start earning in 4 simple steps
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {steps.map((step, idx) => (
                  <div key={idx} className="relative">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">
                        {step.number}
                      </div>
                      <h3 className="font-semibold text-lg mb-2 text-foreground">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="hidden lg:flex absolute top-8 -right-7 h-16 items-center z-10">
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-primary/[0.06] py-14 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
                Ready for your first booking?
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Create your account and list your first service in minutes—or sign in
                to pick up where you left off. Free to join, no setup fee.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <Button
                  size="lg"
                  className="w-full sm:w-auto min-h-12 px-8 rounded-xl text-base font-semibold shadow-sm"
                  onClick={() => navigate("/signup")}
                >
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto min-h-12 px-8 rounded-xl text-base font-semibold bg-white"
                  onClick={() => navigate("/login")}
                >
                  Sign in
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BecomeAHustler;

