import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Pause, Play, Loader2, Upload, X, Info } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { normalizeImageFile, isImageFile } from "@/lib/imageUtils";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  pricing_type: 'fixed' | 'range' | 'packages';
  default_price: number | null;
  default_delivery_time: string | null;
  price_min: number | null;
  price_max: number | null;
  service_packages: { name: string; price: number; description?: string }[] | null;
  portfolio: string | null;
  image_urls: string[] | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  created_at: string | null;
}

export default function SellerServices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { categories, loading: categoriesLoading } = useCategories();

  // Edit form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [pricingType, setPricingType] = useState<'fixed' | 'range' | 'packages'>('fixed');
  const [packages, setPackages] = useState([{ name: '', price: '', description: '' }]);
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultDeliveryTime, setDefaultDeliveryTime] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) fetchServices();
  }, [user]);

  const fetchServices = async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setServices((data || []).map((s: any) => ({ ...s, image_urls: s.image_urls || null })));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', serviceId)
        .eq('user_id', user?.id);
      if (error) throw error;
      toast.success(`Service ${!service.is_active ? 'activated' : 'paused'}`);
      fetchServices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update service status');
    }
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setTitle(service.title);
    setDescription(service.description);
    setCategory(service.category);
    setPricingType(service.pricing_type || 'fixed');
    setDefaultPrice(service.default_price?.toString() || '');
    setDefaultDeliveryTime(service.default_delivery_time || '');
    setPriceMin(service.price_min?.toString() || '');
    setPriceMax(service.price_max?.toString() || '');
    setPortfolio(service.portfolio || '');
    setImageUrls(service.image_urls || []);
    setPackages(
      service.service_packages?.length
        ? service.service_packages.map(p => ({ name: p.name, price: p.price.toString(), description: p.description || '' }))
        : [{ name: '', price: '', description: '' }]
    );
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (files: FileList) => {
    if (!user) return;
    const remaining = 5 - imageUrls.length;
    if (remaining <= 0) { toast.error('Maximum 5 images allowed'); return; }
    setUploadingImages(true);
    const uploadedUrls: string[] = [];
    try {
      const toUpload = Array.from(files).slice(0, remaining);
      if (files.length > remaining) toast.warning(`Only ${remaining} image(s) can be added.`);
      for (const raw of toUpload) {
        if (!isImageFile(raw)) { toast.error(`${raw.name} is not a supported image file`); continue; }
        if (raw.size > 5 * 1024 * 1024) { toast.error(`${raw.name} is too large. Max 5MB`); continue; }
        const { file, ext } = await normalizeImageFile(raw);
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('service-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('service-images').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
      setImageUrls(prev => [...prev, ...uploadedUrls]);
      if (uploadedUrls.length > 0) toast.success(`${uploadedUrls.length} image(s) uploaded`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pricingType === 'packages') {
      const validPkgs = packages.filter(p => p.name.trim() && p.price);
      if (validPkgs.length < 2) {
        toast.error('Please add at least 2 packages with a name and price each');
        return;
      }
    }

    const priceValid = pricingType === 'fixed' ? !!defaultPrice : pricingType === 'range' ? (!!priceMin && !!priceMax) : true;
    if (!editingService || !title || !description || !category || !portfolio || !priceValid) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (pricingType === 'range' && parseFloat(priceMin) >= parseFloat(priceMax)) {
      toast.error('Minimum price must be less than maximum price');
      return;
    }

    setSubmitting(true);
    try {
      const pricePayload = pricingType === 'fixed'
        ? { default_price: parseFloat(defaultPrice), price_min: null, price_max: null, service_packages: [] }
        : pricingType === 'range'
        ? { default_price: null, price_min: parseFloat(priceMin), price_max: parseFloat(priceMax), service_packages: [] }
        : {
            default_price: null,
            price_min: null,
            price_max: null,
            service_packages: packages
              .filter(p => p.name.trim() && p.price)
              .map(p => ({ name: p.name.trim(), price: parseFloat(p.price), description: p.description.trim() || undefined })),
          };

      const { error } = await supabase
        .from('services')
        .update({
          title: title.trim(),
          description: description.trim(),
          category,
          pricing_type: pricingType,
          default_delivery_time: defaultDeliveryTime || null,
          portfolio: portfolio.trim(),
          image_urls: imageUrls.length > 0 ? imageUrls : null,
          ...pricePayload,
        })
        .eq('id', editingService.id)
        .eq('user_id', user?.id);

      if (error) throw error;
      toast.success('Service updated successfully!');
      setEditDialogOpen(false);
      setEditingService(null);
      resetForm();
      fetchServices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update service');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setCategory('');
    setPricingType('fixed'); setPackages([{ name: '', price: '', description: '' }]);
    setDefaultPrice(''); setDefaultDeliveryTime('');
    setPriceMin(''); setPriceMax('');
    setPortfolio(''); setImageUrls([]);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingService(null);
    resetForm();
  };

  const formatPrice = (service: Service) => {
    if (service.pricing_type === 'range') return `GH₵ ${service.price_min?.toFixed(2)} – ${service.price_max?.toFixed(2)}`;
    if (service.pricing_type === 'packages' && service.service_packages?.length) {
      const min = Math.min(...service.service_packages.map(p => Number(p.price)));
      return `From GH₵ ${min.toFixed(2)}`;
    }
    return service.default_price ? `GH₵ ${service.default_price.toFixed(2)}` : 'N/A';
  };

  const formatCategoryLabel = (slug: string) => categories.find(c => c.slug === slug)?.name || slug;

  const btnClass = (active: boolean) =>
    `flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'}`;

  return (
    <>
      <DashboardHeader
        title="My Services"
        subtitle="Manage your service listings and availability"
      />

      <div className="p-4 md:p-6">
        {services.some(s => s.is_verified === false) && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You have services pending approval. Our team will review them within 24-48 hours.
              You'll receive an email once they're approved.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">All Services</h2>
            <p className="text-sm text-muted-foreground">
              You have {services.length} service{services.length !== 1 ? 's' : ''} listed
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => navigate('/list-service')}>
            <Plus className="h-4 w-4" />
            Add New Service
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No services yet</p>
                <Button onClick={() => navigate('/list-service')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Service
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Pricing</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">{service.title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{formatCategoryLabel(service.category)}</Badge>
                          </TableCell>
                          <TableCell>{formatPrice(service)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {service.is_verified === false ? (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-300">⏳ Pending Review</Badge>
                              ) : service.is_verified === true ? (
                                <Badge variant="default" className="bg-green-100 text-green-700 border-green-300">✓ Verified</Badge>
                              ) : null}
                              {service.is_verified && (
                                <Badge variant={service.is_active ? "default" : "secondary"}>
                                  {service.is_active ? "Active" : "Paused"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-10 w-10" title="Edit service" onClick={() => handleEditClick(service)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => handleToggleStatus(service.id)} title={service.is_active ? "Pause" : "Activate"}>
                                {service.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3 p-3">
                  {services.map((service) => (
                    <Card key={service.id}>
                      <CardContent className="p-4 space-y-3">
                        <p className="font-medium text-foreground leading-snug">{service.title}</p>
                        <Badge variant="secondary" className="text-xs">{formatCategoryLabel(service.category)}</Badge>
                        <div className="text-sm">
                          <span className="text-muted-foreground text-xs block">
                            {service.pricing_type === 'range' ? 'Price Range' : service.pricing_type === 'packages' ? 'Packages' : 'Price'}
                          </span>
                          <span className="tabular-nums font-medium">{formatPrice(service)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {service.is_verified === false ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-300">⏳ Pending Review</Badge>
                          ) : service.is_verified === true ? (
                            <Badge variant="default" className="bg-green-100 text-green-700 border-green-300">✓ Verified</Badge>
                          ) : null}
                          {service.is_verified && (
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? "Active" : "Paused"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button variant="outline" size="sm" className="flex-1 min-h-10" onClick={() => handleEditClick(service)}>
                            <Edit className="h-4 w-4 mr-2" />Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 min-h-10" onClick={() => handleToggleStatus(service.id)}>
                            {service.is_active ? <><Pause className="h-4 w-4 mr-2" />Pause</> : <><Play className="h-4 w-4 mr-2" />Activate</>}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Service Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={handleCloseEditDialog}>
          <DialogContent className="max-h-[min(90dvh,90vh)] overflow-y-auto w-[calc(100vw-2rem)] max-w-2xl sm:w-full">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
              <DialogDescription>Update your service details below</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateService} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Service Title *</Label>
                <Input id="edit-title" placeholder="e.g., Professional Math Tutoring" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea id="edit-description" placeholder="Describe your service in detail..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={category} onValueChange={setCategory} disabled={categoriesLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pricing Type *</Label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPricingType('fixed')} className={btnClass(pricingType === 'fixed')}>Fixed Price</button>
                  <button type="button" onClick={() => setPricingType('range')} className={btnClass(pricingType === 'range')}>Price Range</button>
                  <button type="button" onClick={() => setPricingType('packages')} className={btnClass(pricingType === 'packages')}>Packages</button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pricingType === 'fixed'
                    ? 'Set a single price. Buyers book and pay immediately.'
                    : pricingType === 'range'
                    ? 'Set a range. Buyers describe their needs, you quote a specific price.'
                    : 'Define multiple options (e.g. "Birthday Card – GH₵15, Graduation Card – GH₵25").'}
                </p>
              </div>

              {pricingType === 'fixed' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (GHS) *</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Time</Label>
                    <Input placeholder="e.g., 3-5 days" value={defaultDeliveryTime} onChange={(e) => setDefaultDeliveryTime(e.target.value)} />
                  </div>
                </div>
              ) : pricingType === 'range' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Price (GHS) *</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Price (GHS) *</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} required />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Typical Delivery Time</Label>
                    <Input placeholder="e.g., 3-5 days" value={defaultDeliveryTime} onChange={(e) => setDefaultDeliveryTime(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Typical Delivery Time</Label>
                    <Input placeholder="e.g., 3-5 days" value={defaultDeliveryTime} onChange={(e) => setDefaultDeliveryTime(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Packages * <span className="text-muted-foreground font-normal">(min. 2)</span></Label>
                    <button type="button" onClick={() => setPackages([...packages, { name: '', price: '', description: '' }])} className="text-xs text-primary hover:underline">
                      + Add package
                    </button>
                  </div>
                  {packages.map((pkg, idx) => (
                    <div key={idx} className="border rounded-md p-3 space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Package {idx + 1}</span>
                        {packages.length > 1 && (
                          <button type="button" onClick={() => setPackages(packages.filter((_, i) => i !== idx))} className="text-xs text-destructive hover:underline">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Name *</Label>
                          <Input placeholder="e.g., Birthday Card" value={pkg.name} onChange={(e) => { const u = [...packages]; u[idx] = { ...u[idx], name: e.target.value }; setPackages(u); }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Price (GHS) *</Label>
                          <Input type="number" step="0.01" min="0" placeholder="0.00" value={pkg.price} onChange={(e) => { const u = [...packages]; u[idx] = { ...u[idx], price: e.target.value }; setPackages(u); }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description (optional)</Label>
                        <Input placeholder="Brief description of what's included" value={pkg.description} onChange={(e) => { const u = [...packages]; u[idx] = { ...u[idx], description: e.target.value }; setPackages(u); }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Portfolio/Work Samples *</Label>
                <Textarea placeholder="Describe your previous work, include links, or paste portfolio content..." value={portfolio} onChange={(e) => setPortfolio(e.target.value)} rows={4} required />
              </div>

              <div className="space-y-2">
                <Label>Service Images</Label>
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img src={url} alt={`Service image ${index + 1}`} className="w-full h-28 object-cover rounded-md border" />
                        <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) handleImageUpload(e.target.files); }} />
                <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploadingImages || imageUrls.length >= 5}>
                  {uploadingImages ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : <><Upload className="mr-2 h-4 w-4" />{imageUrls.length > 0 ? 'Add More Images' : 'Upload Images'}</>}
                </Button>
                <p className="text-xs text-muted-foreground">Up to 5 images, max 5MB each. JPG, PNG, or WebP.</p>
              </div>

              <div className="flex gap-4 pt-2">
                <Button type="button" variant="outline" onClick={handleCloseEditDialog} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
