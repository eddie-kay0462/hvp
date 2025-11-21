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

const ListService = () => {
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
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to list a service');
      return;
    }

    if (!title || !description || !category || !defaultPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Try backend API first, but if it fails or doesn't support image_urls, create directly in Supabase
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sellers/create-service`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            title,
            description,
            category,
            default_price: parseFloat(defaultPrice) || null,
            default_delivery_time: defaultDeliveryTime || null,
            express_price: expressPrice ? parseFloat(expressPrice) : null,
            express_delivery_time: expressDeliveryTime || null,
            portfolio: portfolio || null,
            image_urls: imageUrls.length > 0 ? imageUrls : null,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          toast.success('Service listed successfully!');
          navigate('/my-services');
          return;
        }
      } catch (apiError) {
        // Backend API not available, fallback to direct Supabase creation
      }

      // Fallback: Create directly in Supabase
      const { error } = await supabase
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
        });

      if (error) throw error;

      toast.success('Service listed successfully!');
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
