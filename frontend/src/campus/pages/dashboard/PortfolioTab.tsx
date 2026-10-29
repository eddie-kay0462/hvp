import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, ImageIcon, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isImageFile, normalizeImageFile } from "@/lib/imageUtils";
import api, { type PortfolioItem } from "@/lib/api";
import { useDashboard } from "../../lib/dashboard";

const BUCKET = "portfolio-images";
const MAX_IMAGES = 10;
const MAX_ITEMS = 30;
const MAX_BYTES = 5 * 1024 * 1024;

interface Draft {
  id?: string;
  title: string;
  description: string;
  image_urls: string[];
  link_url: string;
  completed_on: string;
}

const EMPTY_DRAFT: Draft = { title: "", description: "", image_urls: [], link_url: "", completed_on: "" };

/** Storage path from a public URL in our bucket (for best-effort cleanup). */
const storagePath = (url: string) => {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
};

const removeImages = async (urls: string[]) => {
  const paths = urls.map(storagePath).filter((p): p is string => !!p);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.warn("Could not remove portfolio images:", error.message);
};

const PortfolioTab = () => {
  const { user } = useAuth();
  const { refreshSetup } = useDashboard();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<PortfolioItem | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.sellers
      .getMyProfile()
      .then((res) => setItems(res.data?.portfolio ?? []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load your portfolio"))
      .finally(() => setLoading(false));
  }, []);

  const openNew = () => {
    if (items.length >= MAX_ITEMS) {
      toast.error(`You can have up to ${MAX_ITEMS} portfolio items.`);
      return;
    }
    setOriginalImages([]);
    setDraft({ ...EMPTY_DRAFT });
  };

  const openEdit = (item: PortfolioItem) => {
    setOriginalImages(item.image_urls);
    setDraft({
      id: item.id,
      title: item.title,
      description: item.description ?? "",
      image_urls: item.image_urls,
      link_url: item.link_url ?? "",
      completed_on: item.completed_on ?? "",
    });
  };

  /** Closing without saving discards images uploaded in this session. */
  const closeDraft = () => {
    if (draft) removeImages(draft.image_urls.filter((u) => !originalImages.includes(u)));
    setDraft(null);
  };

  const uploadFiles = async (files: FileList) => {
    if (!user || !draft) return;
    const room = MAX_IMAGES - draft.image_urls.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_IMAGES} images per item`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) toast.warning(`Only ${room} more image(s) can be added.`);

    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const raw of picked) {
        if (!isImageFile(raw)) {
          toast.error(`${raw.name} is not a supported image`);
          continue;
        }
        const { file, ext } = await normalizeImageFile(raw);
        if (file.size > MAX_BYTES) {
          toast.error(`${raw.name} is too large (max 5MB)`);
          continue;
        }
        // Must sit under <user id>/ — the API rejects images anywhere else.
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        uploaded.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setDraft((d) => (d ? { ...d, image_urls: [...d.image_urls, ...uploaded] } : d));
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    const body = {
      title: draft.title,
      description: draft.description,
      image_urls: draft.image_urls,
      link_url: draft.link_url,
      completed_on: draft.completed_on,
    };
    try {
      if (draft.id) {
        const res = await api.sellers.updatePortfolioItem(draft.id, body);
        setItems((list) => list.map((i) => (i.id === draft.id && res.data ? res.data : i)));
      } else {
        const res = await api.sellers.createPortfolioItem(body);
        if (res.data) setItems((list) => [...list, res.data!]);
      }
      // Images the vendor removed from this item are no longer referenced.
      removeImages(originalImages.filter((u) => !draft.image_urls.includes(u)));
      toast.success(draft.id ? "Portfolio item updated" : "Added to your portfolio");
      refreshSetup();
      setDraft(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.sellers.deletePortfolioItem(deleting.id);
      setItems((list) => list.filter((i) => i.id !== deleting.id));
      removeImages(deleting.image_urls);
      toast.success("Portfolio item deleted");
      refreshSetup();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  /** Swap with a neighbour and persist both positions as their new indexes. */
  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const previous = items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      await Promise.all(
        next.map((item, position) =>
          item.position === position ? null : api.sellers.updatePortfolioItem(item.id, { position })
        )
      );
      setItems(next.map((item, position) => ({ ...item, position })));
    } catch (err) {
      setItems(previous);
      toast.error(err instanceof Error ? err.message : "Couldn't reorder");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-medium text-foreground">Your portfolio</h2>
          <p className="text-sm text-muted-foreground">
            Photos of past jobs are the main thing customers look at. Your first piece is shown largest on your page.
          </p>
        </div>
        <Button onClick={openNew} className="w-full rounded-xl sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add work
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="grid gap-8 rounded-2xl border border-border bg-white p-8 dark:bg-card md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <p className="font-display text-xl font-medium text-foreground">Show customers what you've done</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Pick 3 to 6 of your best jobs, each with a few clear photos.</li>
              <li>Say what the brief was and what you delivered.</li>
              <li>Add a link if the work lives somewhere else, like Behance or Instagram.</li>
            </ul>
            <Button className="mt-6 rounded-xl" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first piece
            </Button>
          </div>
          <div className="hidden grid-cols-2 gap-2 md:grid" aria-hidden>
            {["bg-accent-light", "bg-accent/10", "bg-accent/10", "bg-accent-light/60"].map((tint, i) => (
              <div key={i} className={`flex h-20 w-24 items-center justify-center rounded-xl ${tint}`}>
                <ImageIcon className="h-6 w-6 text-accent/40" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <Card key={item.id} className="overflow-hidden rounded-2xl bg-white dark:bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                {index === 0 && (
                  <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                    Shown first
                  </span>
                )}
                {item.image_urls[0] ? (
                  <img src={item.image_urls[0]} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="font-display font-medium text-foreground line-clamp-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.image_urls.length} photo{item.image_urls.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move earlier">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Move later"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => setDeleting(item)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / edit */}
      <Dialog open={!!draft} onOpenChange={(open) => !open && !saving && closeDraft()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-2xl">
          {draft && (
            <form onSubmit={save} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{draft.id ? "Edit portfolio piece" : "Add to your portfolio"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-1.5">
                <Label htmlFor="pf-title">Title</Label>
                <Input
                  id="pf-title"
                  required
                  maxLength={120}
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Graduation shoot for the Class of 2026"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Photos ({draft.image_urls.length}/{MAX_IMAGES})</Label>
                <p className="text-xs text-muted-foreground">The first photo is the cover. Up to 5MB each.</p>
                <div className="grid grid-cols-3 gap-2">
                  {draft.image_urls.map((url) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, image_urls: draft.image_urls.filter((u) => u !== url) })}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                        aria-label="Remove photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {draft.image_urls.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      disabled={uploading}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-accent/25 text-xs font-medium text-accent hover:bg-accent/5"
                    >
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                      {uploading ? "Uploading…" : "Add photos"}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pf-description">Description</Label>
                <Textarea
                  id="pf-description"
                  rows={4}
                  maxLength={2000}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="What was the brief, and what did you deliver?"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pf-link">Link (optional)</Label>
                  <Input
                    id="pf-link"
                    value={draft.link_url}
                    onChange={(e) => setDraft({ ...draft, link_url: e.target.value })}
                    placeholder="behance.net/project"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-date">Completed (optional)</Label>
                  <Input
                    id="pf-date"
                    type="date"
                    value={draft.completed_on}
                    onChange={(e) => setDraft({ ...draft, completed_on: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={closeDraft} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || uploading}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {draft.id ? "Save changes" : "Add to portfolio"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes it and its photos from your profile. You can't undo this.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PortfolioTab;
