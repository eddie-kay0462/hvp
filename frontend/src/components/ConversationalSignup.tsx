import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, Link, Upload, X } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  type: 'text' | 'email' | 'password' | 'phone' | 'select' | 'textarea' | 'number' | 'radio' | 'file' | 'multi-link' | 'multi-image';
  label: string;
  placeholder?: string;
  required?: boolean;
  validation?: (value: any) => string | null;
  options?: { label: string; value: string }[];
  conditional?: (data: FormData) => boolean;
  helperText?: string;
}

interface FormData {
  [key: string]: any;
}

interface ConversationalSignupProps {
  initialData?: Partial<FormData>;
  onComplete: (data: FormData) => void;
  onCancel?: () => void;
}

export const ConversationalSignup = ({ initialData = {}, onComplete, onCancel }: ConversationalSignupProps) => {
  const { categories } = useCategories();
  const [formData, setFormData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  // Define all questions
  const allQuestions: Question[] = [
    // Welcome
    {
      id: 'welcome',
      type: 'text',
      label: "Welcome to Hustle Village! 🎉 Let's get you set up as a seller. This will only take a few minutes.",
      required: false,
    },
    // Basic Info
    {
      id: 'firstName',
      type: 'text',
      label: "What's your first name?",
      placeholder: 'John',
      required: true,
      validation: (value) => {
        if (!value || value.trim().length < 2) {
          return 'Please enter your first name (at least 2 characters)';
        }
        return null;
      },
    },
    {
      id: 'lastName',
      type: 'text',
      label: "And your last name?",
      placeholder: 'Doe',
      required: true,
      validation: (value) => {
        if (!value || value.trim().length < 2) {
          return 'Please enter your last name (at least 2 characters)';
        }
        return null;
      },
    },
    {
      id: 'email',
      type: 'email',
      label: "What's your email address?",
      placeholder: 'your.email@example.com',
      required: true,
      validation: (value) => {
        if (!value) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        return null;
      },
    },
    {
      id: 'password',
      type: 'password',
      label: 'Create a password (at least 6 characters)',
      placeholder: 'Enter your password',
      required: true,
      validation: (value) => {
        if (!value) return 'Password is required';
        if (value.length < 6) {
          return 'Password must be at least 6 characters long';
        }
        return null;
      },
    },
    {
      id: 'confirmPassword',
      type: 'password',
      label: 'Confirm your password',
      placeholder: 'Confirm your password',
      required: true,
      validation: (value) => {
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) {
          return 'Passwords do not match';
        }
        return null;
      },
    },
    {
      id: 'phoneNumber',
      type: 'phone',
      label: "What's your phone number? (Optional)",
      placeholder: '+233 XX XXX XXXX',
      required: false,
    },
    // Service Info
    {
      id: 'serviceTitle',
      type: 'text',
      label: "What service do you offer? Give it a catchy title!",
      placeholder: 'e.g., Professional Hair Braiding',
      required: true,
      validation: (value) => {
        if (!value || value.trim().length < 5) {
          return 'Please enter a service title (at least 5 characters)';
        }
        return null;
      },
    },
    {
      id: 'serviceDescription',
      type: 'textarea',
      label: 'Tell us more about your service. What makes it special?',
      placeholder: 'Describe your service in detail...',
      required: true,
      validation: (value) => {
        if (!value || value.trim().length < 20) {
          return 'Please provide a detailed description (at least 20 characters)';
        }
        return null;
      },
    },
    {
      id: 'serviceCategory',
      type: 'select',
      label: 'Which category best fits your service?',
      required: true,
      options: categories.map(cat => ({ label: cat.name, value: cat.slug })),
      validation: (value) => {
        if (!value) return 'Please select a category';
        return null;
      },
    },
    {
      id: 'defaultPrice',
      type: 'number',
      label: "What's your standard price? (in GHS)",
      placeholder: '0.00',
      required: true,
      validation: (value) => {
        if (!value) return 'Price is required';
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
          return 'Please enter a valid price';
        }
        return null;
      },
    },
    {
      id: 'defaultDeliveryTime',
      type: 'text',
      label: 'How long does it typically take to deliver? (e.g., 3-5 days)',
      placeholder: 'e.g., 3-5 days',
      required: false,
    },
    {
      id: 'hasExpressService',
      type: 'radio',
      label: 'Do you offer express/fast delivery service?',
      required: false,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
    },
    {
      id: 'expressPrice',
      type: 'number',
      label: "What's your express service price? (in GHS)",
      placeholder: '0.00',
      required: false,
      conditional: (data) => data.hasExpressService === 'yes',
      validation: (value) => {
        if (formData.hasExpressService === 'yes' && (!value || isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
          return 'Please enter a valid express price';
        }
        return null;
      },
    },
    {
      id: 'expressDeliveryTime',
      type: 'text',
      label: 'How long does express delivery take? (e.g., 1-2 days)',
      placeholder: 'e.g., 1-2 days',
      required: false,
      conditional: (data) => data.hasExpressService === 'yes',
    },
    // Portfolio
    {
      id: 'portfolioDescription',
      type: 'textarea',
      label: 'Tell us about your experience and previous work',
      placeholder: 'Describe your previous work, experience, or skills...',
      required: false,
      helperText: 'At least one portfolio field (description, links, or images) is required',
    },
    {
      id: 'portfolioLinks',
      type: 'multi-link',
      label: 'Share links to your portfolio or work samples',
      placeholder: 'https://example.com/portfolio',
      required: false,
      helperText: 'At least one portfolio field is required',
    },
    {
      id: 'portfolioImages',
      type: 'multi-image',
      label: 'Upload images of your work',
      required: false,
      helperText: 'At least one portfolio field is required',
    },
  ];

  // Filter questions based on conditionals - recalculate when formData changes
  const visibleQuestions = allQuestions.filter((q) => {
    if (q.conditional) {
      return q.conditional(formData);
    }
    return true;
  });

  // Set initial step based on pre-filled data - skip to first unanswered question
  useEffect(() => {
    if (Object.keys(initialData).length > 0 && visibleQuestions.length > 0) {
      // Find first unanswered question (skip welcome and pre-filled questions)
      for (let i = 0; i < visibleQuestions.length; i++) {
        const q = visibleQuestions[i];
        if (q.id === 'welcome') continue;
        if (!formData[q.id]) {
          setCurrentStep(i);
          return;
        }
      }
      // If all basic questions are filled, start from service questions (after welcome)
      setCurrentStep(visibleQuestions.findIndex(q => q.id === 'serviceTitle') || 0);
    }
  }, [visibleQuestions.length]); // Run when questions are loaded

  // Recalculate current step if needed (in case conditional questions changed)
  useEffect(() => {
    // If current step is beyond visible questions, adjust it
    if (currentStep >= visibleQuestions.length && visibleQuestions.length > 0) {
      setCurrentStep(visibleQuestions.length - 1);
    }
  }, [visibleQuestions.length, currentStep]);

  const totalSteps = visibleQuestions.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const currentQuestion = visibleQuestions[currentStep];

  const handleNext = () => {
    if (!currentQuestion) return;

    // Skip validation for welcome screen
    if (currentQuestion.id === 'welcome') {
      if (currentStep < visibleQuestions.length - 1) {
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
          setIsAnimating(false);
        }, 300);
      }
      return;
    }

    // Validate current question
    const value = formData[currentQuestion.id];
    if (currentQuestion.required && !value) {
      const error = currentQuestion.validation?.(value) || 'This field is required';
      setErrors({ ...errors, [currentQuestion.id]: error });
      return;
    }

    if (currentQuestion.validation) {
      const error = currentQuestion.validation(value);
      if (error) {
        setErrors({ ...errors, [currentQuestion.id]: error });
        return;
      }
    }

    // Clear error
    const newErrors = { ...errors };
    delete newErrors[currentQuestion.id];
    setErrors(newErrors);

    // Move to next step
    if (currentStep < visibleQuestions.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      // Form complete
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleComplete = () => {
    // Validate portfolio - at least one field must be filled
    const hasDescription = formData.portfolioDescription?.trim();
    const hasLinks = portfolioLinks.length > 0;
    const hasImages = portfolioImages.length > 0;
    
    if (!hasDescription && !hasLinks && !hasImages) {
      // Find the first portfolio question and show error
      const portfolioQuestionIndex = visibleQuestions.findIndex(
        q => q.id === 'portfolioDescription' || q.id === 'portfolioLinks' || q.id === 'portfolioImages'
      );
      
      if (portfolioQuestionIndex !== -1) {
        setCurrentStep(portfolioQuestionIndex);
        setErrors({
          ...errors,
          portfolio: 'Please provide at least one: portfolio description, links, or images to showcase your work'
        });
        return;
      }
    }

    // Format portfolio data
    const portfolioParts: string[] = [];
    if (formData.portfolioDescription?.trim()) {
      portfolioParts.push(formData.portfolioDescription.trim());
    }
    if (portfolioLinks.length > 0) {
      portfolioParts.push('\n\nLinks:');
      portfolioLinks.forEach(link => {
        portfolioParts.push(`- ${link}`);
      });
    }
    if (portfolioImages.length > 0) {
      portfolioParts.push('\n\nImages:');
      portfolioImages.forEach(img => {
        portfolioParts.push(`- ${img}`);
      });
    }

    const completeData = {
      ...formData,
      portfolio: portfolioParts.join('\n'),
      role: 'seller',
    };

    onComplete(completeData);
  };

  const handleInputChange = (value: any) => {
    const updatedData = { ...formData, [currentQuestion.id]: value };
    setFormData(updatedData);
    // Clear error when user starts typing
    if (errors[currentQuestion.id]) {
      const newErrors = { ...errors };
      delete newErrors[currentQuestion.id];
      setErrors(newErrors);
    }
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 5MB`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `portfolio-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `portfolio/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

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

  const renderInput = () => {
    if (!currentQuestion) return null;

    const value = formData[currentQuestion.id] || '';
    const error = errors[currentQuestion.id];

    switch (currentQuestion.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            type={currentQuestion.type === 'phone' ? 'tel' : currentQuestion.type}
            placeholder={currentQuestion.placeholder}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            className="text-lg py-6"
            autoFocus
          />
        );

      case 'password':
        return (
          <Input
            type="password"
            placeholder={currentQuestion.placeholder}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            className="text-lg py-6"
            autoFocus
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder={currentQuestion.placeholder}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            className="text-lg py-6"
            autoFocus
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={currentQuestion.placeholder}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            rows={4}
            className="text-lg"
            autoFocus
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={handleInputChange}
          >
            <SelectTrigger className="text-lg py-6">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {currentQuestion.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                  value === option.value ? 'border-primary bg-accent' : ''
                }`}
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="w-5 h-5"
                />
                <span className="text-lg">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'multi-link':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder={currentQuestion.placeholder}
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPortfolioLink();
                  }
                }}
                className="text-lg py-6"
              />
              <Button type="button" onClick={addPortfolioLink} variant="outline">
                <Link className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            {portfolioLinks.length > 0 && (
              <div className="space-y-2">
                {portfolioLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-md">
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
        );

      case 'multi-image':
        return (
          <div className="space-y-3">
            <label>
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
            {portfolioImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
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
        );

      default:
        return null;
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            Question {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <div
        className={`bg-card rounded-lg p-8 shadow-lg transition-all duration-300 ${
          isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
        }`}
      >
        {/* Question Label */}
        <h2 className="text-2xl font-semibold mb-6 min-h-[3rem]">
          {currentQuestion.id === 'welcome' ? (
            <span>{currentQuestion.label}</span>
          ) : (
            currentQuestion.label
          )}
        </h2>

        {/* Helper Text */}
        {currentQuestion.helperText && (
          <p className="text-sm text-muted-foreground mb-4">{currentQuestion.helperText}</p>
        )}

        {/* Portfolio validation feedback */}
        {(currentQuestion.id === 'portfolioDescription' || 
          currentQuestion.id === 'portfolioLinks' || 
          currentQuestion.id === 'portfolioImages') && (() => {
          const hasDescription = formData.portfolioDescription?.trim();
          const hasLinks = portfolioLinks.length > 0;
          const hasImages = portfolioImages.length > 0;
          const isPortfolioValid = hasDescription || hasLinks || hasImages;
          
          return (
            <div className="mb-4">
              {isPortfolioValid ? (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  <span>Portfolio requirement met</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  You need to fill at least one portfolio field
                </div>
              )}
            </div>
          );
        })()}

        {/* Input */}
        {currentQuestion.id !== 'welcome' && (
          <div className="mb-6">
            {renderInput()}
            {errors[currentQuestion.id] && (
              <p className="text-sm text-destructive mt-2">{errors[currentQuestion.id]}</p>
            )}
            {errors.portfolio && (
              <p className="text-sm text-destructive mt-2">{errors.portfolio}</p>
            )}
          </div>
        )}

        {/* Welcome message styling */}
        {currentQuestion.id === 'welcome' && (
          <div className="mb-6 text-center">
            <p className="text-lg text-muted-foreground">
              Ready to get started? Click Next to begin!
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-4">
          <Button
            variant="ghost"
            onClick={currentStep > 0 ? handleBack : onCancel}
            disabled={currentStep === 0 && !onCancel}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          <Button
            onClick={handleNext}
            size="lg"
            className="min-w-[120px]"
          >
            {currentStep === totalSteps - 1 ? (
              <>
                Complete <Check className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

