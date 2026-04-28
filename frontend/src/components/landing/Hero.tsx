import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";

interface StudentProfile {
  first_name: string | null;
  last_name: string | null;
}

export const Hero = () => {
  const navigate = useNavigate();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { categories } = useCategories();

  const searchSuggestions = useMemo(() => {
    const names = categories.map((c) => c.name || c.slug);
    if (!names.length) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return names.slice(0, 6);
    return names.filter((n) => n?.toLowerCase().includes(term)).slice(0, 6);
  }, [categories, searchTerm]);

  useEffect(() => {
    fetchStudentCount();
    fetchStudentProfiles();
  }, []);

  const fetchStudentCount = async () => {
    try {
      const { data } = await supabase.from("profiles").select("id");
      if (data) setStudentCount(data.length);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudentProfiles = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .limit(4);
      if (data) setStudentProfiles(data);
    } catch (e) {
      console.error(e);
    }
  };

  const getInitials = (p: StudentProfile) => {
    const f = p.first_name?.charAt(0).toUpperCase() ?? "";
    const l = p.last_name?.charAt(0).toUpperCase() ?? "";
    return `${f}${l}` || "?";
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      navigate("/services");
      return;
    }
    navigate(`/services?query=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleSuggestionSelect = (value: string) => {
    setSearchTerm(value);
    navigate(`/services?query=${encodeURIComponent(value)}`);
  };

  const showSocialProof =
    studentCount !== null && studentCount > 0 && studentProfiles.length > 0;

  return (
    <section className="bg-background border-b border-border">
      <div className="container mx-auto px-4 md:px-6 pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="max-w-3xl mx-auto text-center space-y-6 md:space-y-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
            Hire trusted student talent
            <br />
            <span className="text-primary">right on your campus.</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A marketplace for Ashesi students offering tutoring, design, tech,
            photography, and more. Booked and paid for with mobile money.
          </p>

          <div className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center rounded-2xl border border-border bg-white focus-within:border-primary/40 transition-colors">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder='Try "maths tutoring", "logo design", "photography"…'
                value={searchTerm}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 130)}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-14 pl-12 pr-4 text-base bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl"
              />
              <div className="pr-2 flex-shrink-0">
                <Button
                  onClick={handleSearch}
                  className="h-10 px-6 rounded-xl font-semibold"
                >
                  Search
                </Button>
              </div>
            </div>

            {searchSuggestions.length > 0 &&
              (isSearchFocused || !!searchTerm) && (
                <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-white shadow-lg z-30 overflow-hidden text-left">
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                    Categories
                  </div>
                  {searchSuggestions.map((s) => (
                    <button
                      key={s}
                      className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors flex items-center gap-3"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSuggestionSelect(s);
                      }}
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-sm text-muted-foreground self-center">
                Popular:
              </span>
              {categories.slice(0, 5).map((c) => (
                <button
                  key={c.slug}
                  onClick={() => handleSuggestionSelect(c.name || c.slug)}
                  className="text-sm rounded-full border border-border bg-white px-4 py-1.5 text-foreground/70 hover:border-primary/40 hover:text-primary transition-colors duration-200"
                >
                  {c.name || c.slug}
                </button>
              ))}
            </div>
          )}

          {showSocialProof && (
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <div className="flex -space-x-2">
                {studentProfiles.map((p, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-background bg-primary/15 flex items-center justify-center text-primary text-xs font-bold"
                  >
                    {getInitials(p)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {studentCount}
                </span>{" "}
                students on Hustle Village
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
