import { Button } from "@/components/ui/button";
import { Menu, User, LogOut, Package, Calendar, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useUserType } from "@/hooks/useUserType";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { canListServices } = useUserType();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const [userProfile, setUserProfile] = useState<{ first_name: string | null; last_name: string | null } | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

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
    if (!user) return "U";
    
    // Use first name if available
    if (userProfile?.first_name) {
      return userProfile.first_name.charAt(0).toUpperCase();
    }
    
    // Fallback to last name if first name not available
    if (userProfile?.last_name) {
      return userProfile.last_name.charAt(0).toUpperCase();
    }
    
    // Final fallback to email (shouldn't happen if profile exists)
    return user.email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <h1 className="text-2xl font-bold text-primary">Hustle Village</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => navigate('/messages')}
                >
                  <MessageSquare className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
                {canListServices && (
                  <Button variant="outline" onClick={() => navigate('/list-service')}>
                    List a Service
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/messages')}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Messages
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/my-bookings')}>
                      <Calendar className="mr-2 h-4 w-4" />
                      My Bookings
                    </DropdownMenuItem>
                    {canListServices && (
                      <DropdownMenuItem onClick={() => navigate('/my-services')}>
                        <Package className="mr-2 h-4 w-4" />
                        My Services
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/become-a-hustler')}
                >
                  Become a Hustler
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/login')}
                >
                  Sign in
                </Button>
                <Button 
                  onClick={() => navigate('/signup')}
                >
                  Join
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {user ? (
                <>
                  {canListServices && (
                    <Button variant="outline" className="w-full" onClick={() => navigate('/list-service')}>
                      List a Service
                    </Button>
                  )}
                  <div className="flex flex-col gap-2 pt-4 border-t border-border">
                    <Button variant="ghost" className="w-full" onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Button>
                    <Button variant="ghost" className="w-full relative" onClick={() => navigate('/messages')}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Messages
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={() => navigate('/my-bookings')}>
                      <Calendar className="mr-2 h-4 w-4" />
                      My Bookings
                    </Button>
                    {canListServices && (
                      <Button variant="ghost" className="w-full" onClick={() => navigate('/my-services')}>
                        <Package className="mr-2 h-4 w-4" />
                        My Services
                      </Button>
                    )}
                    <Button variant="destructive" className="w-full" onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/become-a-hustler')}
                  >
                    Become a Hustler
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => navigate('/login')}
                  >
                    Sign in
                  </Button>
                  <Button 
                    className="w-full"
                    onClick={() => navigate('/signup')}
                  >
                    Join
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
