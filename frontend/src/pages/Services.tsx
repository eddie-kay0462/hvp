import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Star, CheckCircle2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";

interface Service {
  id: string;
  title: string;
  description: string;
  pricing_type?: 'fixed' | 'range';
  default_price: number | null;
  express_price: number | null;
  default_delivery_time: string | null;
  express_delivery_time: string | null;
  price_min?: number | null;
  price_max?: number | null;
  category: string;
  user_id: string;
  image_urls?: string[] | null;
  seller?: {
    id?: string;
    title?: string;
    description?: string;
    category?: string;
    user_id: string;
    display_name?: string;
  } | null;
  seller_name?: string;
  seller_verified: boolean;
  average_rating: number | null;
  review_count: number;
  price?: number;
}

const Services = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategories();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category"));
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [sortBy, setSortBy] = useState("recommended");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, priceRange, sortBy, page, searchQuery, minRating]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const itemsPerPage = 12;
      // The backend applies category/search/price/rating filters, sorting, and
      // pagination across the whole catalogue, so the page renders exactly what
      // it returns — no client-side re-sorting or re-filtering.
      const response = await api.services.getAll({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        sortBy,
        limit: itemsPerPage,
        offset: (page - 1) * itemsPerPage,
        priceMin: priceRange[0],
        priceMax: priceRange[1],
        minRating: minRating ?? undefined,
      }) as {
        status: number;
        msg?: string;
        data?: { services: Service[]; total?: number };
      };

      if (response.status !== 200) {
        throw new Error(response.msg || 'Failed to load services');
      }

      const pageServices = (response.data?.services || []).map((service) => ({
        ...service,
        price: service.default_price || 0,
        seller_name: service.seller?.display_name || service.seller?.title || 'Unknown Seller',
        seller_verified: true,
      }));

      const total = response.data?.total ?? pageServices.length;

      setServices(pageServices);
      setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
    } catch (error: unknown) {
      console.error('Error fetching services:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    const newCategory = categoryId === "all" ? null : categoryId;
    setSelectedCategory(newCategory);
    setPage(1);
    
    const params = new URLSearchParams(searchParams);
    if (newCategory) {
      params.set('category', newCategory);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const handleSearch = () => {
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery("");
    setPriceRange([0, 5000]);
    setSortBy("recommended");
    setMinRating(null);
    setPage(1);
    setSearchParams(new URLSearchParams());
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'Price on request';
    return `GH₵${price}`;
  };

  const getCategoryLabel = (categorySlug: string) => {
    const category = categories.find(c => c.slug === categorySlug);
    return category?.name || categorySlug;
  };

  // Filter sidebar content component
  const FilterSidebar = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">Filters</h3>
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Reset
        </Button>
      </div>

      {/* University Filter */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">University</h4>
        <div className="text-sm text-muted-foreground">Ashesi University</div>
      </div>

      {/* Category Filter */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">Category</h4>
        <Select value={selectedCategory || "all"} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.slug} value={category.slug}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">
          Price Range
        </h4>
        <div className="text-sm text-muted-foreground mb-3">
          GH₵{priceRange[0]} - GH₵{priceRange[1]}
        </div>
        <Slider
          min={0}
          max={5000}
          step={50}
          value={priceRange}
          onValueChange={(v) => { setPriceRange(v); setPage(1); }}
          className="w-full"
        />
      </div>

      {/* Rating Filter */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">Rating</h4>
        <div className="space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center gap-2">
              <Checkbox
                id={`rating-${rating}`}
                checked={minRating === rating}
                onCheckedChange={(checked) => {
                  setMinRating(checked ? rating : null);
                  setPage(1);
                }}
              />
              <label
                htmlFor={`rating-${rating}`}
                className="text-sm flex items-center gap-1 cursor-pointer"
              >
                {rating}+ <Star className="w-4 h-4 fill-primary text-primary" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-4 md:py-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
            {/* Desktop Sidebar - Filters */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-8">
                <FilterSidebar />
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="mb-4 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Services</h1>
                <p className="text-sm md:text-base text-muted-foreground">Find the perfect service for your needs</p>
              </div>

              {/* Search and Sort */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 md:mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="icon" className="lg:hidden">
                        <Filter className="w-5 h-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                      <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6">
                        <FilterSidebar />
                      </div>
                    </SheetContent>
                  </Sheet>
                  <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recommended">Recommended</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="price_low">Price: Low to High</SelectItem>
                      <SelectItem value="price_high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Results */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-48 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg mb-4">
                    No services found. Try adjusting your filters.
                  </p>
                  <Button onClick={clearFilters}>Clear All Filters</Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {services.map((service) => (
                      <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/service/${service.id}`)}>
                        <div className="relative aspect-video bg-muted overflow-hidden">
                          {service.image_urls && service.image_urls.length > 0 ? (
                            <img
                              src={service.image_urls[0]}
                              alt={service.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-primary/10 to-primary/5">
                              <div className="text-center">
                                <div className="text-4xl mb-2">🎨</div>
                                <div className="text-xs">Service Image</div>
                              </div>
                            </div>
                          )}
                          <Badge variant="category" className="absolute top-3 right-3">
                            {getCategoryLabel(service.category)}
                          </Badge>
                        </div>
                        
                        <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-lg line-clamp-1 text-card-foreground">
                              {service.title}
                            </h3>
                            <span className="text-lg font-bold text-primary whitespace-nowrap">
                              {service.pricing_type === 'range' && service.price_min != null && service.price_max != null
                                ? `GH₵${service.price_min}–${service.price_max}`
                                : formatPrice(service.default_price)}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {service.description}
                          </p>

                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{service.seller_name}</span>
                            {service.seller_verified && (
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            )}
                            {service.average_rating && service.review_count > 0 && (
                              <div className="flex items-center gap-1 ml-auto">
                                <Star className="w-4 h-4 fill-primary text-primary" />
                                <span className="text-sm font-medium">{service.average_rating.toFixed(1)}</span>
                                <span className="text-sm text-muted-foreground">({service.review_count})</span>
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                            </svg>
                            Ashesi University
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => navigate(`/service/${service.id}`)}
                            >
                              View Details
                            </Button>
                            <Button
                              className="flex-1"
                              onClick={() => navigate(`/service/${service.id}`)}
                            >
                              {service.pricing_type === 'range' ? 'Request a Quote' : 'Book Now'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-wrap justify-center items-center gap-2 mt-6 md:mt-8">
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={i}
                            variant={page === pageNum ? "default" : "outline"}
                            onClick={() => setPage(pageNum)}
                            className="w-10 h-10"
                            size="sm"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}

                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}

                  {services.length < 12 && page === totalPages && (
                    <div className="text-center mt-8">
                      <Button variant="outline" onClick={() => setPage(1)}>
                        Load More
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Services;
