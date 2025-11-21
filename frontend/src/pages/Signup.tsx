import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Link, Upload, X, Check } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { ConversationalSignup } from '@/components/ConversationalSignup';

const Signup = () => {
  // Step 1: Basic info
  const [step, setStep] = useState(1);
  const [useConversational, setUseConversational] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userType, setUserType] = useState<'buyer' | 'seller'>('buyer');
  
  // Step 2: Service info (only for sellers)
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultDeliveryTime, setDefaultDeliveryTime] = useState('');
  const [expressPrice, setExpressPrice] = useState('');
  const [expressDeliveryTime, setExpressDeliveryTime] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();
  const navigate = useNavigate();

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !firstName || !lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    // If buyer, proceed to send OTP directly
    if (userType === 'buyer') {
      handleFinalSubmit();
    } else {
      // If seller, use conversational flow
      setUseConversational(true);
    }
  };

  const handleConversationalComplete = async (data: any) => {
    setLoading(true);

    // Map conversational form data to signup format
    const signupData: any = {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber || undefined,
      role: 'seller',
      service: {
        title: data.serviceTitle,
        description: data.serviceDescription,
        category: data.serviceCategory,
        price: parseFloat(data.defaultPrice),
        default_delivery_time: data.defaultDeliveryTime || null,
        express_price: data.expressPrice ? parseFloat(data.expressPrice) : null,
        express_delivery_time: data.expressDeliveryTime || null,
        portfolio: data.portfolio || '',
      },
    };

    // Call backend signup endpoint
    const { error } = await signup(signupData);

    setLoading(false);

    if (error) {
      toast.error(error.message || 'Failed to create account');
      return;
    }

    // Navigate to verify email page
    navigate('/verify-email', { state: { email: data.email } });
  };

  const addPortfolioLink = () => {
    if (newLink.trim()) {
      // Basic URL validation
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 5MB`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `portfolio-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `portfolio/${fileName}`;

        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          console.error('Error details:', {
            message: uploadError.message,
            name: uploadError.name
          });
          
          // Provide helpful error message for bucket not found
          if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
            toast.error(
              `Storage bucket "portfolio-images" not found. Please verify the bucket exists in Supabase Storage.`,
              { duration: 5000 }
            );
          } else {
            toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }
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
      console.error('Image upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removePortfolioImage = (index: number) => {
    setPortfolioImages(portfolioImages.filter((_, i) => i !== index));
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

  const handleFinalSubmit = async () => {
    // Validate password
    if (!password) {
      toast.error('Please enter a password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate service info if seller
    if (userType === 'seller') {
      // Check if at least one portfolio field is filled
      const hasPortfolioDescription = portfolio.trim();
      const hasPortfolioLinks = portfolioLinks.length > 0;
      const hasPortfolioImages = portfolioImages.length > 0;
      
      if (!serviceTitle || !serviceDescription || !serviceCategory || !defaultPrice) {
        toast.error('Please fill in all required service fields (Title, Description, Category, and Price)');
        return;
      }
      
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
    }

    setLoading(true);

    // Prepare signup data for backend
    const signupData: any = {
      email,
      password,
      firstName,
      lastName,
      phoneNumber: phoneNumber || undefined,
      role: userType, // Send buyer or seller
    };

    // Add service data if seller (will be created after email verification)
    if (userType === 'seller') {
      signupData.service = {
        title: serviceTitle,
        description: serviceDescription,
        category: serviceCategory,
        price: parseFloat(defaultPrice),
        default_delivery_time: defaultDeliveryTime || null,
        express_price: expressPrice ? parseFloat(expressPrice) : null,
        express_delivery_time: expressDeliveryTime || null,
        portfolio: formatPortfolio()
      };
    }

    // Call backend signup endpoint
    const { error } = await signup(signupData);

    setLoading(false);

    if (error) {
      toast.error(error.message || 'Failed to create account');
      return;
    }

    // Navigate to verify email page
    navigate('/verify-email', { state: { email } });
  };

  // Show conversational flow for sellers
  if (useConversational && userType === 'seller') {
    // Pre-populate with data from step 1
    const initialData = {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phoneNumber,
    };

    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center bg-background px-4 py-8">
          <ConversationalSignup
            initialData={initialData}
            onComplete={handleConversationalComplete}
            onCancel={() => {
              setUseConversational(false);
              setStep(1);
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {step === 1 ? 'Create an account' : 'Tell us about your service'}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 1 
              ? 'Join Hustle Village' 
              : 'Help buyers find you by providing service details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+233 XX XXX XXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label>I want to:</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="userType"
                      value="buyer"
                      checked={userType === 'buyer'}
                      onChange={(e) => setUserType(e.target.value as 'buyer')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Find services (Buyer)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="userType"
                      value="seller"
                      checked={userType === 'seller'}
                      onChange={(e) => setUserType(e.target.value as 'seller')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Offer services (Hustler)</span>
                  </label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {userType === 'buyer' ? 'Create Account' : 'Continue to Service Details'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Basic Info
              </Button>
              <form onSubmit={(e) => { e.preventDefault(); handleFinalSubmit(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceTitle">Service Title *</Label>
                  <Input
                    id="serviceTitle"
                    type="text"
                    placeholder="e.g., Professional Hair Braiding"
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceDescription">Description *</Label>
                  <Textarea
                    id="serviceDescription"
                    placeholder="Describe your service in detail..."
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceCategory">Category *</Label>
                  <Select value={serviceCategory} onValueChange={setServiceCategory} required disabled={categoriesLoading}>
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
                  
                  {/* Description/Text */}
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

                  {/* Links Section */}
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
                        className="gap-2"
                      >
                        <Link className="h-4 w-4" />
                        Add Link
                      </Button>
                    </div>
                    {portfolioLinks.length > 0 && (
                      <div className="space-y-1">
                        {portfolioLinks.map((link, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                            <Link className="h-4 w-4 text-muted-foreground" />
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

                  {/* Images Section */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Portfolio Images</Label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImages}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2"
                          disabled={uploadingImages}
                          asChild
                        >
                          <span>
                            <Upload className="h-4 w-4" />
                            {uploadingImages ? 'Uploading...' : 'Upload Images'}
                          </span>
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
                              onClick={() => removePortfolioImage(index)}
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

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign up with Email'}
                </Button>
              </form>
            </div>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => navigate('/login')}
            >
              Log in
            </Button>
          </div>
        </CardContent>
      </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Signup;
