import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Pause, Play, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import api from "@/lib/api";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";


interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  default_price: number | null;
  express_price: number | null;
  default_delivery_time: string | null;
  express_delivery_time: string | null;
  portfolio: string | null;
  image_urls: string[] | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  created_at: string | null;
}

export default function SellerServices() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { categories, loading: categoriesLoading } = useCategories();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultDeliveryTime, setDefaultDeliveryTime] = useState('');
  const [expressPrice, setExpressPrice] = useState('');
  const [expressDeliveryTime, setExpressDeliveryTime] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchServices();
    }
  }, [user]);

  const fetchServices = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch services directly from Supabase for the current user
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map data to ensure image_urls is always an array or null
      const mappedServices = (data || []).map((service: any) => ({
        ...service,
        image_urls: service.image_urls || null,
      }));
      setServices(mappedServices);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      toast.error(error.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || !category || !defaultPrice || !portfolio) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      // Create service directly in Supabase to include image_urls
      const { data: newService, error } = await supabase
        .from('services')
        .insert({
          title: title.trim(),
          description: description.trim(),
          category,
          default_price: parseFloat(defaultPrice) || null,
          default_delivery_time: defaultDeliveryTime || null,
          express_price: expressPrice ? parseFloat(expressPrice) : null,
          express_delivery_time: expressDeliveryTime || null,
          portfolio: portfolio.trim(),
          image_urls: imageUrls.length > 0 ? imageUrls : null,
          user_id: user?.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Service created successfully!');
      setDialogOpen(false);
      resetForm();
      fetchServices(); // Reload services
    } catch (error: any) {
      console.error('Error creating service:', error);
      toast.error(error.message || 'Failed to create service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (serviceId: string) => {
    try {
      // Get current service status
      const service = services.find(s => s.id === serviceId);
      if (!service) return;

      const newStatus = !service.is_active;

      // Update in Supabase
      const { error } = await supabase
        .from('services')
        .update({ is_active: newStatus })
        .eq('id', serviceId)
        .eq('user_id', user?.id); // Ensure user owns this service

      if (error) throw error;

      toast.success(`Service ${newStatus ? 'activated' : 'paused'}`);
      fetchServices(); // Reload services
    } catch (error: any) {
      console.error('Error toggling service:', error);
      toast.error(error.message || 'Failed to update service status');
    }
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setTitle(service.title);
    setDescription(service.description);
    setCategory(service.category);
    setDefaultPrice(service.default_price?.toString() || '');
    setDefaultDeliveryTime(service.default_delivery_time || '');
    setExpressPrice(service.express_price?.toString() || '');
    setExpressDeliveryTime(service.express_delivery_time || '');
    setPortfolio(service.portfolio || '');
    setImageUrls(service.image_urls || []);
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (files: FileList) => {
    if (!user) return;

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max size is 5MB`);
          continue;
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('service-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('service-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setImageUrls([...imageUrls, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const url = imageUrls[index];
    setImageUrls(imageUrls.filter((_, i) => i !== index));
    
    // Optionally delete from storage (you may want to keep this for cleanup)
    // For now, we'll just remove from the array
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingService || !title || !description || !category || !defaultPrice || !portfolio) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('services')
        .update({
          title: title.trim(),
          description: description.trim(),
          category,
          default_price: parseFloat(defaultPrice) || null,
          default_delivery_time: defaultDeliveryTime || null,
          express_price: expressPrice ? parseFloat(expressPrice) : null,
          express_delivery_time: expressDeliveryTime || null,
          portfolio: portfolio.trim(),
          image_urls: imageUrls.length > 0 ? imageUrls : null,
        })
        .eq('id', editingService.id)
        .eq('user_id', user?.id); // Ensure user owns this service

      if (error) throw error;

      toast.success('Service updated successfully!');
      setEditDialogOpen(false);
      setEditingService(null);
      resetForm();
      fetchServices(); // Reload services
    } catch (error: any) {
      console.error('Error updating service:', error);
      toast.error(error.message || 'Failed to update service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingService(null);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setDefaultPrice('');
    setDefaultDeliveryTime('');
    setExpressPrice('');
    setExpressDeliveryTime('');
    setPortfolio('');
    setImageUrls([]);
  };

  const formatCategoryLabel = (categorySlug: string) => {
    const cat = categories.find(c => c.slug === categorySlug);
    return cat ? cat.name : categorySlug;
  };

  // Show all services, not just active ones
  const displayServices = services;

  return (
    <>
      <DashboardHeader 
        title="My Services" 
        subtitle="Manage your service listings and availability"
      />

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">All Services</h2>
            <p className="text-sm text-muted-foreground">
              You have {displayServices.length} service{displayServices.length !== 1 ? 's' : ''} listed
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Service</DialogTitle>
                <DialogDescription>
                  Fill in the details below to list your service
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateService} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Service Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Professional Math Tutoring"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your service in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={setCategory} required disabled={categoriesLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.slug} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-price">Default Price (GHS) *</Label>
                    <Input
                      id="default-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={defaultPrice}
                      onChange={(e) => setDefaultPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-delivery-time">Default Delivery Time</Label>
                    <Input
                      id="default-delivery-time"
                      placeholder="e.g., 3-5 days"
                      value={defaultDeliveryTime}
                      onChange={(e) => setDefaultDeliveryTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="express-price">Express Price (GHS) - Optional</Label>
                  <Input
                      id="express-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                      value={expressPrice}
                      onChange={(e) => setExpressPrice(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="express-delivery-time">Express Delivery Time</Label>
                    <Input
                      id="express-delivery-time"
                      placeholder="e.g., 1-2 days"
                      value={expressDeliveryTime}
                      onChange={(e) => setExpressDeliveryTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio">Portfolio/Work Samples *</Label>
                  <Textarea
                    id="portfolio"
                    placeholder="Describe your previous work, include links, or paste portfolio content..."
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label>Service Images</Label>
                  <div className="space-y-4">
                    {/* Image Preview Grid */}
                    {imageUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        {imageUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Service image ${index + 1}`}
                              className="w-full h-32 object-cover rounded-md border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Button */}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleImageUpload(e.target.files);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImages}
                      >
                        {uploadingImages ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            {imageUrls.length > 0 ? 'Add More Images' : 'Upload Images'}
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Upload up to 5 images (Max 5MB each). JPG, PNG, or WebP formats.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Service'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : displayServices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No services yet</p>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Service
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Default Price</TableHead>
                    <TableHead>Express Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatCategoryLabel(service.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {service.default_price ? `GH₵ ${service.default_price.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {service.express_price ? `GH₵ ${service.express_price.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.is_active ? "default" : "secondary"}>
                          {service.is_active ? "Active" : "Paused"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Edit service"
                            onClick={() => handleEditClick(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(service.id)}
                            title={service.is_active ? "Pause service" : "Activate service"}
                          >
                            {service.is_active ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Service Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={handleCloseEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
              <DialogDescription>
                Update your service details below
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpdateService} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Service Title *</Label>
                <Input
                  id="edit-title"
                  placeholder="e.g., Professional Math Tutoring"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Describe your service in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={category} onValueChange={setCategory} required disabled={categoriesLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-default-price">Default Price (GHS) *</Label>
                  <Input
                    id="edit-default-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-default-delivery-time">Default Delivery Time</Label>
                  <Input
                    id="edit-default-delivery-time"
                    placeholder="e.g., 3-5 days"
                    value={defaultDeliveryTime}
                    onChange={(e) => setDefaultDeliveryTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-express-price">Express Price (GHS) - Optional</Label>
                  <Input
                    id="edit-express-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={expressPrice}
                    onChange={(e) => setExpressPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-express-delivery-time">Express Delivery Time</Label>
                  <Input
                    id="edit-express-delivery-time"
                    placeholder="e.g., 1-2 days"
                    value={expressDeliveryTime}
                    onChange={(e) => setExpressDeliveryTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-portfolio">Portfolio/Work Samples *</Label>
                <Textarea
                  id="edit-portfolio"
                  placeholder="Describe your previous work, include links, or paste portfolio content..."
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Service Images</Label>
                <div className="space-y-4">
                  {/* Image Preview Grid */}
                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Service image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleImageUpload(e.target.files);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImages}
                    >
                      {uploadingImages ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {imageUrls.length > 0 ? 'Add More Images' : 'Upload Images'}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Upload up to 5 images (Max 5MB each). JPG, PNG, or WebP formats.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEditDialog}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Service'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
