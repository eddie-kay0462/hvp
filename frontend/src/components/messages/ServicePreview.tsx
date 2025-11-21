import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ServicePreviewProps {
  serviceId: string;
  compact?: boolean;
}

interface Service {
  id: string;
  title: string;
  description: string;
  default_price: number | null;
  image_urls: string[] | null;
  category: string;
}

export const ServicePreview = ({ serviceId, compact = false }: ServicePreviewProps) => {
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, title, description, default_price, image_urls, category')
          .eq('id', serviceId)
          .single();

        if (error) throw error;
        setService(data as Service);
      } catch (error) {
        console.error('Error fetching service:', error);
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  if (loading) {
    return (
      <Card className="p-3 border-2 border-dashed">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading service...</span>
        </div>
      </Card>
    );
  }

  if (!service) {
    return (
      <Card className="p-3 border-2 border-dashed">
        <span className="text-sm text-muted-foreground">Service not found</span>
      </Card>
    );
  }

  const imageUrl = service.image_urls && service.image_urls.length > 0 
    ? service.image_urls[0] 
    : null;

  if (compact) {
    return (
      <Card 
        className="p-3 border-2 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => navigate(`/service/${serviceId}`)}
      >
        <div className="flex gap-3">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={service.title}
              className="w-16 h-16 object-cover rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-1">{service.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {service.description}
            </p>
            {service.default_price && (
              <p className="text-sm font-bold text-primary mt-1">
                GH₵ {service.default_price}
              </p>
            )}
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="p-4 border-2 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => navigate(`/service/${serviceId}`)}
    >
      <div className="flex gap-4">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={service.title}
            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-base line-clamp-1">{service.title}</h4>
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {service.description}
          </p>
          {service.default_price && (
            <p className="text-base font-bold text-primary mt-2">
              GH₵ {service.default_price}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/service/${serviceId}`);
            }}
          >
            View Service
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

