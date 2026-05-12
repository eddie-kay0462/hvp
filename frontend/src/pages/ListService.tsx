import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Navbar } from '@/components/landing/Navbar';
import { useCategories } from '@/hooks/useCategories';
import { Upload, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { normalizeImageFile } from '@/lib/imageUtils';

const ListService = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [pricingType, setPricingType] = useState<'fixed' | 'range' | 'packages'>('fixed');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultDeliveryTime, setDefaultDeliveryTime] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [packages, setPackages] = useState([{ name: '', price: '', description: '' }]);
  const [portfolio, setPortfolio] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (files: FileList) => {
    if (!user) return;

    const remaining = 5 - imageUrls.length;
    if (remaining <= 0) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      const toUpload = Array.from(files).slice(0, remaining);
      if (files.length > remaining) {
        toast.warning(`Only ${remaining} image(s) can be added. Uploading the first ${remaining}.`);
      }

      for (const raw of toUpload) {
        if (!raw.type.startsWith('image/') && !/\.(heic|heif)$/i.test(raw.name)) {
          toast.error(`${raw.name} is not an image file`);
          continue;
        }
        if (raw.size > 5 * 1024 * 1024) {
          toast.error(`${raw.name} is too large. Max size is 5MB`);
          continue;
        }

        const { file, ext } = await normalizeImageFile(raw);
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('service-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('service-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setImageUrls(prev => [...prev, ...uploadedUrls]);
      if (uploadedUrls.length > 0) toast.success(`${uploadedUrls.length} image(s) uploaded`);
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to list a service');
      return;
    }

    if (pricingType === 'packages') {
      const validPkgs = packages.filter(p => p.name.trim() && p.price);
      if (validPkgs.length < 2) {
        toast.error('Please add at least 2 packages with a name and price each');
        return;
      }
    }

    const priceValid = pricingType === 'fixed' ? !!defaultPrice : pricingType === 'range' ? (!!priceMin && !!priceMax) : true;
    if (!title || !description || !category || !portfolio || !priceValid) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (pricingType === 'range' && parseFloat(priceMin) >= parseFloat(priceMax)) {
      toast.error('Minimum price must be less than maximum price');
      return;
    }

    setLoading(true);

    try {
      const pricePayload = pricingType === 'fixed'
        ? {
            default_price: parseFloat(defaultPrice),
            price_min: null,
            price_max: null,
            service_packages: [],
          }
        : pricingType === 'range'
        ? {
            default_price: null,
            price_min: parseFloat(priceMin),
            price_max: parseFloat(priceMax),
            service_packages: [],
          }
        : {
            default_price: null,
            price_min: null,
            price_max: null,
            service_packages: packages
              .filter(p => p.name.trim() && p.price)
              .map(p => ({ name: p.name.trim(), price: parseFloat(p.price), description: p.description.trim() || undefined })),
          };

      const response: any = await api.sellers.createService({
        title: title.trim(),
        description: description.trim(),
        category,
        pricing_type: pricingType,
        default_delivery_time: defaultDeliveryTime || null,
        portfolio: portfolio.trim(),
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        ...pricePayload,
      });

      if (response.status !== 201) {
        throw new Error(response.msg || 'Failed to create service');
      }

      toast.success('Service submitted for review! You\'ll be notified once it\'s approved.');
      navigate('/my-services');
    } catch (error: any) {
      console.error('Error creating service:', error);
      toast.error(error.message || 'Failed to list service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">List a New Service</CardTitle>
            <CardDescription>
              Share your skills and start earning on Hustle Village
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  rows={6}
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

              <div className="space-y-2">
                <Label>Pricing Type *</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPricingType('fixed')}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${pricingType === 'fixed' ? 'bg-primary text-primary-foreground border-primary hover:bg-primary-hover hover:text-primary-foreground' : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'}`}
                  >
                    Fixed Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingType('range')}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${pricingType === 'range' ? 'bg-primary text-primary-foreground border-primary hover:bg-primary-hover hover:text-primary-foreground' : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'}`}
                  >
                    Price Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingType('packages')}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${pricingType === 'packages' ? 'bg-primary text-primary-foreground border-primary hover:bg-primary-hover hover:text-primary-foreground' : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'}`}
                  >
                    Packages
                  </button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-price">Price (GHS) *</Label>
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
                    <Label htmlFor="default-delivery-time">Delivery Time</Label>
                    <Input
                      id="default-delivery-time"
                      placeholder="e.g., 3-5 days"
                      value={defaultDeliveryTime}
                      onChange={(e) => setDefaultDeliveryTime(e.target.value)}
                    />
                  </div>
                </div>
              ) : pricingType === 'range' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price-min">Minimum Price (GHS) *</Label>
                    <Input
                      id="price-min"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price-max">Maximum Price (GHS) *</Label>
                    <Input
                      id="price-max"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      required
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="default-delivery-time">Typical Delivery Time</Label>
                    <Input
                      id="default-delivery-time"
                      placeholder="e.g., 3-5 days"
                      value={defaultDeliveryTime}
                      onChange={(e) => setDefaultDeliveryTime(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Packages * <span className="text-muted-foreground font-normal">(min. 2)</span></Label>
                    <button
                      type="button"
                      onClick={() => setPackages([...packages, { name: '', price: '', description: '' }])}
                      className="text-xs text-primary hover:underline"
                    >
                      + Add package
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkg-delivery-time">Typical Delivery Time</Label>
                    <Input
                      id="pkg-delivery-time"
                      placeholder="e.g., 3-5 days"
                      value={defaultDeliveryTime}
                      onChange={(e) => setDefaultDeliveryTime(e.target.value)}
                    />
                  </div>
                  {packages.map((pkg, idx) => (
                    <div key={idx} className="border rounded-md p-3 space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Package {idx + 1}</span>
                        {packages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPackages(packages.filter((_, i) => i !== idx))}
                            className="text-xs text-destructive hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Name *</Label>
                          <Input
                            placeholder="e.g., Birthday Card"
                            value={pkg.name}
                            onChange={(e) => {
                              const updated = [...packages];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setPackages(updated);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Price (GHS) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={pkg.price}
                            onChange={(e) => {
                              const updated = [...packages];
                              updated[idx] = { ...updated[idx], price: e.target.value };
                              setPackages(updated);
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description (optional)</Label>
                        <Input
                          placeholder="Brief description of what's included"
                          value={pkg.description}
                          onChange={(e) => {
                            const updated = [...packages];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setPackages(updated);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'List Service'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ListService;
