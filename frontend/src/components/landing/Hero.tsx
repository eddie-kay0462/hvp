import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";

interface StudentProfile {
  first_name: string | null;
  last_name: string | null;
}

export const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tutoringCount, setTutoringCount] = useState(0);
  const [techCount, setTechCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { categories } = useCategories();

  const searchSuggestions = useMemo(() => {
    const names = categories.map((category) => category.name || category.slug);
    if (!names.length) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return names.slice(0, 6);
    }
    return names.filter((name) => name?.toLowerCase().includes(term)).slice(0, 6);
  }, [categories, searchTerm]);

  useEffect(() => {
    fetchCategoryCounts();
    fetchStudentCount();
    fetchStudentProfiles();
  }, []);

  const fetchCategoryCounts = async () => {
    try {
      // Fetch all active services and count by category
      const { data: services, error } = await supabase
        .from('services')
        .select('category')
        .eq('is_active', true);
      
      if (error) throw error;
      
      if (services) {
        const tutoring = services.filter(s => s.category === 'tutoring').length;
        const tech = services.filter(s => s.category === 'tech_dev').length;
        setTutoringCount(tutoring);
        setTechCount(tech);
      }
    } catch (error) {
      console.error('Error fetching category counts:', error);
    }
  };

  const fetchStudentCount = async () => {
    try {
      // Fetch count of all profiles (students/users)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id');
      
      if (error) throw error;
      
      if (profiles) {
        setStudentCount(profiles.length);
      }
    } catch (error) {
      console.error('Error fetching student count:', error);
    }
  };

  const fetchStudentProfiles = async () => {
    try {
      // Fetch first 4 profiles with names for avatar initials
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .limit(4);
      
      if (error) throw error;
      
      if (profiles) {
        setStudentProfiles(profiles);
      }
    } catch (error) {
      console.error('Error fetching student profiles:', error);
    }
  };

  const getInitials = (profile: StudentProfile): string => {
    const first = profile.first_name?.charAt(0).toUpperCase() || '';
    const last = profile.last_name?.charAt(0).toUpperCase() || '';
    
    if (first && last) {
      return `${first}${last}`;
    } else if (first) {
      return first;
    } else if (last) {
      return last;
    }
    return '?';
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      navigate('/services');
      return;
    }
    navigate(`/services?query=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleSuggestionSelect = (value: string) => {
    setSearchTerm(value);
    navigate(`/services?query=${encodeURIComponent(value)}`);
  };

  return (
    <section className="relative py-12 md:py-20 lg:py-32">
      {/* Background gradient with pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 -z-10">
        <div
          className="absolute inset-0 opacity-10"
          style={{ 
            backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"24\" height=\"24\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Ctext x=\"50%25\" y=\"50%25\" font-size=\"20\" text-anchor=\"middle\" dominant-baseline=\"middle\" fill=\"%23000\" opacity=\"0.1\"%3E+%3C/text%3E%3C/svg%3E')", 
            backgroundSize: "24px" 
          }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-5xl space-y-6 md:space-y-8">
          <div className="space-y-4 md:space-y-6 text-left max-w-3xl">
            <Badge className="px-2 md:px-3 py-1 text-xs md:text-sm">Student-Powered Marketplace</Badge>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Your <span className="text-primary">Campus</span>, Your <span className="text-accent">Hustle</span>, Your <span className="text-primary">Village</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
              Connect with talented students offering services on your campus. From tutoring to web development, find
              the help you need from your peers.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 pt-2 md:pt-4">
              <div className="flex -space-x-2 sm:-space-x-3">
                {studentProfiles.length > 0 ? (
                  studentProfiles.map((profile, i) => (
                    <div key={i} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-background overflow-hidden bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                      {getInitials(profile)}
                    </div>
                  ))
                ) : (
                  // Fallback while loading
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-background overflow-hidden bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                      ?
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{studentCount > 0 ? `${studentCount}+` : '500+'}</span> students already using Hustle Village
              </p>
            </div>
          </div>

          <div className="space-y-3 md:space-y-4">
            <div className="max-w-4xl space-y-2 md:space-y-3">
              <div className="relative">
                <Input
                  placeholder="Try tutoring, brand design, photography..."
                  value={searchTerm}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 sm:h-14 rounded-full pl-12 sm:pl-14 pr-4 sm:pr-5 text-sm sm:text-base border border-muted/80 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 rounded-full bg-primary/10 p-2 sm:p-2.5">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </span>

                {searchSuggestions.length > 0 && (isSearchFocused || searchTerm) && (
                  <div className="absolute left-0 right-0 mt-2 sm:mt-3 rounded-xl sm:rounded-2xl border border-muted bg-white/95 shadow-xl backdrop-blur z-20 max-h-[60vh] overflow-y-auto">
                    <div className="px-3 sm:px-4 py-2 sm:py-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      Suggestions
                    </div>
                    <div className="divide-y divide-muted/60">
                      {searchSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSuggestionSelect(suggestion);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                  <span className="text-foreground/70 whitespace-nowrap">Explore:</span>
                  {categories.slice(0, 5).map((category) => (
                    <button
                      key={category.slug}
                      className="rounded-full border border-primary/20 px-2 sm:px-3 py-1 text-foreground/80 hover:bg-primary/5 transition whitespace-nowrap text-xs sm:text-sm"
                      onClick={() => setSearchTerm(category.name || category.slug)}
                    >
                      {category.name || category.slug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
