import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LinkPreviewProps {
  url: string;
  compact?: boolean;
}

export const LinkPreview = ({ url, compact = false }: LinkPreviewProps) => {
  // Extract domain from URL for display
  const getDomain = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const domain = getDomain(url);

  if (compact) {
    return (
      <Card 
        className="p-3 border-2 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-sm font-medium text-primary truncate">{domain}</p>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-1">{url}</p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="p-4 border-2 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-base">{domain}</h4>
          </div>
          <p className="text-sm text-muted-foreground break-all">{url}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={(e) => {
              e.stopPropagation();
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
          >
            Open Link
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

