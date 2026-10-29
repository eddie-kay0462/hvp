import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import api, { type VendorContact } from "@/lib/api";
import { hasContactDetails } from "../../lib/contact";

const EMPTY: Record<keyof VendorContact, string> = {
  bio: "",
  whatsapp_number: "",
  contact_phone: "",
  contact_email: "",
  instagram_handle: "",
  website_url: "",
};

const FIELDS: Array<{ key: Exclude<keyof VendorContact, "bio">; label: string; placeholder: string; type?: string; hint?: string }> = [
  { key: "whatsapp_number", label: "WhatsApp number", placeholder: "0241234567", type: "tel", hint: "Customers can message you in one tap." },
  { key: "contact_phone", label: "Phone number", placeholder: "+233 24 123 4567", type: "tel" },
  { key: "contact_email", label: "Email", placeholder: "you@example.com", type: "email" },
  { key: "instagram_handle", label: "Instagram", placeholder: "@yourhandle" },
  { key: "website_url", label: "Website or other portfolio", placeholder: "behance.net/you" },
];

/** WhatsApp is stored as 233XXXXXXXXX; show Ghanaian numbers the local way. */
const displayWhatsapp = (n: string | null) => (n && /^233\d{9}$/.test(n) ? `0${n.slice(3)}` : n ?? "");

const ProfileTab = () => {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fill = (c: VendorContact) =>
    setForm({
      bio: c.bio ?? "",
      whatsapp_number: displayWhatsapp(c.whatsapp_number),
      contact_phone: c.contact_phone ?? "",
      contact_email: c.contact_email ?? "",
      instagram_handle: c.instagram_handle ? `@${c.instagram_handle}` : "",
      website_url: c.website_url ?? "",
    });

  useEffect(() => {
    api.sellers
      .getMyProfile()
      .then((res) => res.data && fill(res.data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load your profile"))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Send every field: blanks clear a channel the vendor removed.
      const res = await api.sellers.updateMyContact(form);
      if (res.data) fill(res.data);
      toast.success("Profile saved");
      if (res.data && !hasContactDetails(res.data)) {
        toast.warning("Add at least one contact method so customers can reach you.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <Card className="p-5 space-y-2">
        <Label htmlFor="bio">About you</Label>
        <Textarea
          id="bio"
          rows={5}
          maxLength={1000}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="What do you do, what are you known for, and why should someone pick you?"
        />
        <p className="text-right text-xs text-muted-foreground">{form.bio.length}/1000</p>
      </Card>

      <Card className="p-5 space-y-5">
        <div>
          <h2 className="font-semibold text-foreground">How customers reach you</h2>
          <p className="text-sm text-muted-foreground">
            These appear as buttons on your profile and services. Fill in the ones you use.
          </p>
        </div>
        {FIELDS.map(({ key, label, placeholder, type, hint }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              type={type ?? "text"}
              value={form[key]}
              placeholder={placeholder}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        ))}
      </Card>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save profile
      </Button>
    </form>
  );
};

export default ProfileTab;
