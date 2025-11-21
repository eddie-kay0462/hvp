import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  mockUser?: { email: string }; // FOR DEVELOPMENT PREVIEW ONLY
}

export const DashboardHeader = ({ title, subtitle, mockUser }: DashboardHeaderProps) => {
  const { user } = mockUser ? { user: mockUser } : useAuth();
  const [userProfile, setUserProfile] = useState<{ first_name: string | null; last_name: string | null } | null>(null);

  useEffect(() => {
    if (user && !mockUser) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user, mockUser]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile({
        first_name: data?.first_name || null,
        last_name: data?.last_name || null,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getInitials = () => {
    if (!user) return "S";
    
    // Use first name if available
    if (userProfile?.first_name) {
      return userProfile.first_name.charAt(0).toUpperCase();
    }
    
    // Fallback to last name if first name not available
    if (userProfile?.last_name) {
      return userProfile.last_name.charAt(0).toUpperCase();
    }
    
    // Final fallback to email (shouldn't happen if profile exists)
    return user.email?.charAt(0).toUpperCase() || "S";
  };

  const getDisplayName = () => {
    if (!user) return "Seller";
    
    // Use full name if available
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    
    if (userProfile?.first_name) {
      return userProfile.first_name;
    }
    
    if (userProfile?.last_name) {
      return userProfile.last_name;
    }
    
    // Fallback to email username
    return user.email?.split("@")[0] || "Seller";
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-10">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {getDisplayName()}
              </p>
              <p className="text-xs text-muted-foreground">Seller Account</p>
            </div>
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
};
