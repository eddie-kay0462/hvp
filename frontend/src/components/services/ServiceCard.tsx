import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ServiceCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  pricingType: string;
  imageUrls: string[];
  sellerName: string;
  sellerVerified: boolean;
  averageRating: number | null;
  reviewCount: number;
  category: string;
}

export const ServiceCard = ({
  id,
  title,
  description,
  price,
  pricingType,
  imageUrls,
  sellerName,
  sellerVerified,
  averageRating,
  reviewCount,
  category,
}: ServiceCardProps) => {
  const navigate = useNavigate();

  const formatPrice = () => {
    if (pricingType === 'hourly') {
      return `GH₵ ${price}/hr`;
    } else if (pricingType === 'custom') {
      return `From GH₵ ${price}`;
    }
    return `GH₵ ${price}`;
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer" onClick={() => navigate(`/service/${id}`)}>
      <div className="aspect-video bg-muted relative overflow-hidden">
        {imageUrls && imageUrls.length > 0 ? (
          <img 
            src={imageUrls[0]} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg line-clamp-1 text-card-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{sellerName}</span>
          {sellerVerified && (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {averageRating && reviewCount > 0 ? (
              <>
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({reviewCount})</span>
              </>
            ) : (
              <Badge variant="secondary" className="text-xs">New Seller</Badge>
            )}
          </div>
          
          <span className="text-lg font-bold text-primary">{formatPrice()}</span>
        </div>

        <Button className="w-full" onClick={(e) => {
          e.stopPropagation();
          navigate(`/service/${id}`);
        }}>
          View Details
        </Button>
      </div>
    </Card>
  );
};
