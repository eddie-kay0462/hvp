import { useEffect, useState } from "react";
import { Shield, HelpCircle, Mail, Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SellerProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user profile
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile({
        first_name: data?.first_name || '',
        last_name: data?.last_name || '',
        email: user.email || '',
        phone: data?.phone || '',
        bio: '', // Bio field doesn't exist in schema yet, but keeping for future
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name.trim() || null,
          last_name: profile.last_name.trim() || null,
          phone: profile.phone.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <DashboardHeader 
          title="Profile & Support" 
          subtitle="Loading your profile..."
        />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader 
        title="Profile & Support" 
        subtitle="Manage your seller profile and get help when you need it"
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input 
                  id="first-name" 
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  placeholder="Enter your first name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input 
                  id="last-name" 
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  placeholder="Enter your last name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="email" 
                    value={profile.email} 
                    disabled 
                  />
                  <Badge variant="default" className="shrink-0 gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+233 XX XXX XXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Short Bio (Coming Soon)</Label>
                <Textarea 
                  id="bio" 
                  rows={4}
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell buyers about yourself and your expertise..."
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Bio feature coming soon
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Help & Support */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Help & Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Need help with your seller account or have questions about bookings and payments?
                </p>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start gap-2" disabled>
                    <HelpCircle className="h-4 w-4" />
                    View FAQ & Help Center
                  </Button>

                  <Button variant="outline" className="w-full justify-start gap-2" disabled>
                    <Mail className="h-4 w-4" />
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent-light/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">Common Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a href="#" className="text-foreground hover:text-primary transition-colors">
                      How does the escrow payment system work?
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-foreground hover:text-primary transition-colors">
                      When will I receive payment for completed bookings?
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-foreground hover:text-primary transition-colors">
                      How do I handle disputes with buyers?
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-foreground hover:text-primary transition-colors">
                      Can I edit my services after publishing?
                    </a>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
