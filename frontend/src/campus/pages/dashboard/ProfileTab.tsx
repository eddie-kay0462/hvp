import { useEffect, useState, type FormEvent } from "react";
import { Globe, Instagram, Loader2, Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import api, { type VendorContact } from "@/lib/api";
import { ContactButtons } from "../../components/ContactButtons";
import { hasContactDetails } from "../../lib/contact";
import { useDashboard } from "../../lib/dashboard";

const EMPTY: Record<keyof VendorContact, string> = {
  bio: "",
  whatsapp_number: "",
  contact_phone: "",
  contact_email: "",
  instagram_handle: "",
  website_url: "",
};

const FIELDS: Array<{
  key: Exclude<keyof VendorContact, "bio">;
  label: string;
  placeholder: string;
  icon: LucideIcon;
  type?: string;
  hint?: string;
}> = [
  {
    key: "whatsapp_number",
    label: "WhatsApp number",
    placeholder: "0241234567",
    icon: MessageCircle,
    type: "tel",
    hint: "Recommended. Customers can message you in one tap.",
  },
  { key: "contact_phone", label: "Phone number", placeholder: "+233 24 123 4567", icon: Phone, type: "tel" },
  { key: "contact_email", label: "Email", placeholder: "you@example.com", icon: Mail, type: "email" },
  { key: "instagram_handle", label: "Instagram", placeholder: "@yourhandle", icon: Instagram },
  { key: "website_url", label: "Website or other portfolio", placeholder: "behance.net/you", icon: Globe },
];

/** WhatsApp is stored as 233XXXXXXXXX; show Ghanaian numbers the local way. */
const displayWhatsapp = (n: string | null) => (n && /^233\d{9}$/.test(n) ? `0${n.slice(3)}` : n ?? "");

const ProfileTab = () => {
  const { refreshSetup } = useDashboard();
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
      refreshSetup();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto grid gap-8 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // Preview only: the saved values are normalised by the API.
  const preview: VendorContact = {
    bio: form.bio,
    whatsapp_number: form.whatsapp_number || null,
    contact_phone: form.contact_phone || null,
    contact_email: form.contact_email || null,
    instagram_handle: form.instagram_handle.replace(/^@/, "") || null,
    website_url: form.website_url || null,
  };

  return (
    <form onSubmit={onSubmit} className="container mx-auto grid gap-8 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-white p-6 dark:bg-card">
          <Label htmlFor="bio" className="font-display text-lg font-medium text-foreground">
            About you
          </Label>
          <p className="mt-1 text-sm text-muted-foreground">
            What you do, what you're known for, and where on campus you work. Two or three sentences is plenty.
          </p>
          <Textarea
            id="bio"
            rows={5}
            maxLength={1000}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="e.g. Third-year student doing knotless braids and silk presses since 2021. I can come to your hostel."
            className="mt-4 rounded-xl bg-background"
          />
          <p className="mt-1.5 text-right text-xs text-muted-foreground">{form.bio.length}/1000</p>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 dark:bg-card">
          <h2 className="font-display text-lg font-medium text-foreground">How customers reach you</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each one becomes a button on your page and services. Fill in the ones you actually check.
          </p>
          <div className="mt-6 space-y-5">
            {FIELDS.map(({ key, label, placeholder, icon: Icon, type, hint }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <div className="relative">
                  <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={key}
                    type={type ?? "text"}
                    value={form[key]}
                    placeholder={placeholder}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="h-11 rounded-xl bg-background pl-10"
                  />
                </div>
                {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-24">
        <div className="rounded-2xl border border-border bg-white p-6 dark:bg-card">
          <p className="font-display font-medium text-foreground">Preview</p>
          <p className="mt-1 text-sm text-muted-foreground">How your contact buttons will look to customers.</p>
          <div className="pointer-events-none mt-5" aria-hidden>
            <ContactButtons contact={preview} />
          </div>
        </div>
        <Button type="submit" disabled={saving} size="lg" className="h-12 w-full rounded-xl">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save profile
        </Button>
      </aside>
    </form>
  );
};

export default ProfileTab;
