import { useState, useRef, useEffect } from 'react';
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
import { useCategories } from '@/hooks/useCategories';
import { Upload, X, Check, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

const SetUpService = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultDeliveryTime, setDefaultDeliveryTime] = useState('');
  const [expressPrice, setExpressPrice] = useState('');
  const [expressDeliveryTime, setExpressDeliveryTime] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingService, setCheckingService] = useState(true);
  const { user } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user already has a service
  useEffect(() => {
    const checkExistingService = async () => {
      if (!user) return;

      try {
        const { data: services, error } = await supabase
          .from('services')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (error) throw error;

        if (services && services.length > 0) {
          // User already has a service, redirect to seller dashboard
          toast.info('You already have a service set up!');
          navigate('/seller/services');
          return;
        }
      } catch (error: any) {
        console.error('Error checking service:', error);
      } finally {
        setCheckingService(false);
      }
    };

    checkExistingService();
  }, [user, navigate]);

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

        // Create unique filename for portfolio images
        const fileExt = file.name.split('.').pop();
        const fileName = `portfolio-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `portfolio/${fileName}`;

        // Upload to Supabase Storage (portfolio-images bucket)
        const { error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        setPortfolioImages([...portfolioImages, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setPortfolioImages(portfolioImages.filter((_, i) => i !== index));
  };

  const addPortfolioLink = () => {
    if (newLink.trim()) {
      try {
        new URL(newLink.trim());
        setPortfolioLinks([...portfolioLinks, newLink.trim()]);
        setNewLink('');
      } catch {
        toast.error('Please enter a valid URL (e.g., https://example.com)');
      }
    }
  };

  const removePortfolioLink = (index: number) => {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== index));
  };

  const formatPortfolio = () => {
    const parts: string[] = [];
    
    if (portfolio.trim()) {
      parts.push(portfolio.trim());
    }
    
    if (portfolioLinks.length > 0) {
      parts.push('\n\nLinks:');
      portfolioLinks.forEach(link => {
        parts.push(`- ${link}`);
      });
    }
    
    if (portfolioImages.length > 0) {
      parts.push('\n\nImages:');
      portfolioImages.forEach(img => {
        parts.push(`- ${img}`);
      });
    }
    
    return parts.join('\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to set up a service');
      return;
    }

    // Validate required fields
    if (!title || !description || !category || !defaultPrice) {
      toast.error('Please fill in all required fields (Title, Description, Category, and Price)');
      return;
    }

    // Check if at least one portfolio field is filled
    const hasPortfolioDescription = portfolio.trim();
    const hasPortfolioLinks = portfolioLinks.length > 0;
    const hasPortfolioImages = portfolioImages.length > 0;
    
    if (!hasPortfolioDescription && !hasPortfolioLinks && !hasPortfolioImages) {
      toast.error('Please provide at least one: portfolio description, links, or images to showcase your work');
      return;
    }

    const price = parseFloat(defaultPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid default price');
      return;
    }

    if (expressPrice) {
      const expressPriceNum = parseFloat(expressPrice);
      if (isNaN(expressPriceNum) || expressPriceNum < 0) {
        toast.error('Please enter a valid express price');
        return;
      }
    }

    setLoading(true);

    try {
      // First, setup seller profile
      const sellerData = {
        title: title.trim(),
        description: description.trim(),
        category,
        default_price: price,
        default_delivery_time: defaultDeliveryTime || null,
        express_price: expressPrice ? parseFloat(expressPrice) : null,
        express_delivery_time: expressDeliveryTime || null,
        portfolio: formatPortfolio(),
      };

      const sellerResponse = await api.sellers.setupSeller(sellerData) as any;

      if (sellerResponse.status !== 200) {
        toast.error(sellerResponse.msg || 'Failed to set up seller profile');
        setLoading(false);
        return;
      }

      // Then, create service with images
      const { data: newService, error: serviceError } = await supabase
        .from('services')
        .insert({
          title: title.trim(),
          description: description.trim(),
          category,
          default_price: price,
          default_delivery_time: defaultDeliveryTime || null,
          express_price: expressPrice ? parseFloat(expressPrice) : null,
          express_delivery_time: expressDeliveryTime || null,
          portfolio: formatPortfolio(),
          image_urls: imageUrls.length > 0 ? imageUrls : null,
          user_id: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      toast.success('Service set up successfully! 🎉');
      navigate('/seller/services');
    } catch (error: any) {
      console.error('Error setting up service:', error);
      toast.error(error.message || 'Failed to set up service');
    } finally {
      setLoading(false);
    }
  };

  const onboardingSteps = [
    {
      title: 'Welcome to Hustle Village! 🎉',
      description: 'Let\'s set up your first service so buyers can find you. This will only take a few minutes.',
      icon: Sparkles,
    },
    {
      title: 'Tell us about your service',
      description: 'Add a clear title and description. Be specific about what you offer and what makes you unique.',
      icon: null,
    },
    {
      title: 'Set your pricing',
      description: 'Choose a fair price for your service. You can also add an express option for faster delivery.',
      icon: null,
    },
    {
      title: 'Showcase your work',
      description: 'Add portfolio images, links, or descriptions to show buyers what you can do. This helps build trust!',
      icon: null,
    },
  ];

  if (checkingService) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Onboarding overlay
  if (showOnboarding && onboardingStep < onboardingSteps.length) {
    const step = onboardingSteps[onboardingStep];
    const Icon = step.icon;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            {Icon && (
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Icon className="h-8 w-8 text-primary" />
              </div>
            )}
            <CardTitle className="text-2xl font-bold">{step.title}</CardTitle>
            <CardDescription className="text-base">{step.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === onboardingStep
                      ? 'w-8 bg-primary'
                      : index < onboardingStep
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {onboardingStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setOnboardingStep(onboardingStep - 1)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={() => {
                  if (onboardingStep === onboardingSteps.length - 1) {
                    setShowOnboarding(false);
                  } else {
                    setOnboardingStep(onboardingStep + 1);
                  }
                }}
                className="flex-1"
              >
                {onboardingStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowOnboarding(false)}
              className="w-full"
            >
              Skip onboarding
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="seller">
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Set Up Your First Service</CardTitle>
              <CardDescription>
                Complete your seller profile by adding your first service. You can add more services later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Service Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Service Title *</Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., Professional Hair Braiding"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Service Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your service in detail. What do you offer? What makes you special?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={setCategory} required disabled={categoriesLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select a category"} />
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

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultPrice">Default Price (GHS) *</Label>
                    <Input
                      id="defaultPrice"
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
                    <Label htmlFor="defaultDeliveryTime">Default Delivery Time</Label>
                    <Input
                      id="defaultDeliveryTime"
                      placeholder="e.g., 3-5 days"
                      value={defaultDeliveryTime}
                      onChange={(e) => setDefaultDeliveryTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Express Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expressPrice">Express Price (GHS) - Optional</Label>
                    <Input
                      id="expressPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={expressPrice}
                      onChange={(e) => setExpressPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expressDeliveryTime">Express Delivery Time</Label>
                    <Input
                      id="expressDeliveryTime"
                      placeholder="e.g., 1-2 days"
                      value={expressDeliveryTime}
                      onChange={(e) => setExpressDeliveryTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Portfolio Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Portfolio/Work Samples *</Label>
                    {(() => {
                      const hasDesc = portfolio.trim();
                      const hasLinks = portfolioLinks.length > 0;
                      const hasImages = portfolioImages.length > 0;
                      const isValid = hasDesc || hasLinks || hasImages;
                      return isValid ? (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Requirement met
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    At least one portfolio field (description, links, or images) is required
                  </p>
                  
                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="portfolio" className="text-sm text-muted-foreground">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="portfolio"
                      placeholder="Describe your previous work, experience, or skills..."
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Links */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Portfolio Links</Label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/portfolio"
                        value={newLink}
                        onChange={(e) => setNewLink(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addPortfolioLink();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addPortfolioLink}
                      >
                        Add Link
                      </Button>
                    </div>
                    {portfolioLinks.length > 0 && (
                      <div className="space-y-1">
                        {portfolioLinks.map((link, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-sm text-primary hover:underline truncate"
                            >
                              {link}
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removePortfolioLink(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Images */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Portfolio Images</Label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                          className="hidden"
                          disabled={uploadingImages}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2"
                          disabled={uploadingImages}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingImages ? 'Uploading...' : 'Upload Images'}
                        </Button>
                      </label>
                    </div>
                    {portfolioImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {portfolioImages.map((imgUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={imgUrl}
                              alt={`Portfolio ${index + 1}`}
                              className="w-full h-24 object-cover rounded-md border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Validation message */}
                  {!(portfolio.trim() || portfolioLinks.length > 0 || portfolioImages.length > 0) && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      ⚠️ Please add at least one: description, links, or images to showcase your work
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/seller/dashboard')}
                    className="flex-1"
                  >
                    Skip for now
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Setting up...' : 'Complete Setup'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SetUpService;

