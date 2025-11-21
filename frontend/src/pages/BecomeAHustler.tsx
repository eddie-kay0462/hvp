import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
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
          .eq('is_active', true),
        
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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <Badge className="px-4 py-2 text-sm mb-4">Join the Hustle</Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Turn Your Skills Into <span className="text-primary">Income</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join hundreds of students already earning on campus. Offer your services, set your prices, and start building your hustle today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => navigate('/signup')}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/services')}
                >
                  Browse Services
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 border-b">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Why Become a Hustler?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Everything you need to start earning on campus
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {benefits.map((benefit, idx) => {
                  const Icon = benefit.icon;
                  return (
                    <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="rounded-full bg-primary/10 p-3 flex-shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">
                            {benefit.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  How It Works
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
                      <h3 className="font-semibold text-lg mb-2">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-8 left-full w-full">
                        <ArrowRight className="h-6 w-6 text-muted-foreground mx-auto" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary/5">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to Start Your Hustle?
              </h2>
              <p className="text-lg text-muted-foreground">
                Join hundreds of students already earning on campus. It's free to get started.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => navigate('/signup')}
                >
                  Create Your Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/login')}
                >
                  Already have an account? Sign in
                </Button>
              </div>
              <div className="flex items-center justify-center gap-6 pt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Free to join</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Start earning today</span>
                </div>
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

