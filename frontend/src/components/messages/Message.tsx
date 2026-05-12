import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link as LinkIcon, ExternalLink, CheckCircle, XCircle, Tag } from 'lucide-react';
import type { Message as MessageType } from '@/hooks/useMessages';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface MessageProps {
  message: MessageType;
  senderName?: string;
  senderAvatar?: string;
}

export const Message = ({ message, senderName, senderAvatar }: MessageProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwnMessage = message.sender_id === user?.id;
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [offerStatus, setOfferStatus] = useState(message.offer_status);
  const [respondingOffer, setRespondingOffer] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const handleRespondToOffer = async (accepted: boolean) => {
    setRespondingOffer(true);
    try {
      const res: any = await (api.offers.respond as any)({ messageId: message.id, accepted });
      setOfferStatus(accepted ? 'accepted' : 'declined');
      if (accepted && res.data?.booking?.id) {
        setBookingId(res.data.booking.id);
        toast.success('Offer accepted! Booking created.');
      } else {
        toast.success('Offer declined.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to respond to offer');
    } finally {
      setRespondingOffer(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const attachments = message.attachments || [];
  const hasContent = message.content && message.content.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const hasLink = !!message.link_url;
  const isOffer = !!message.offer_data;

  // Function to detect URLs in text and convert them to clickable links
  const linkifyText = (text: string) => {
    // URL regex pattern - matches http(s):// URLs and common domains
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Process the URL
      let url = match[0];
      let displayUrl = url;

      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      // Truncate display URL if too long
      if (displayUrl.length > 50) {
        displayUrl = displayUrl.substring(0, 47) + '...';
      }

      // Add clickable link
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`hover:underline break-all ${
            isOwnMessage 
              ? 'text-primary-foreground underline' 
              : 'text-primary'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {displayUrl}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div
      className={`flex gap-3 mb-4 ${
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {!isOwnMessage && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {senderName ? getInitials(senderName) : '?'}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={`flex flex-col max-w-[70%] ${
          isOwnMessage ? 'items-end' : 'items-start'
        }`}
      >
        {/* External Link */}
        {hasLink && (
          <div className="mb-2 w-full">
            <a
              href={message.link_url!}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                isOwnMessage ? 'bg-primary/10 border-primary/20' : 'bg-muted/50'
              }`}
            >
              <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-sm text-primary hover:underline truncate">
                {message.link_url}
              </span>
              <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </a>
          </div>
        )}

        {/* Offer Card */}
        {isOffer && message.offer_data && (
          <div className="mb-2 w-full border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b">
              <Tag className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Custom Offer</span>
            </div>
            <div className="px-4 py-3 bg-card space-y-1">
              <p className="text-xs text-muted-foreground">{message.offer_data.service_title}</p>
              <p className="text-2xl font-bold">GH₵ {message.offer_data.price.toFixed(2)}</p>
              {message.offer_data.note && (
                <p className="text-sm text-muted-foreground">{message.offer_data.note}</p>
              )}
            </div>
            {/* Status / Actions */}
            <div className="px-4 py-2 border-t bg-muted/30">
              {offerStatus === 'accepted' && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                    <CheckCircle className="h-4 w-4" /> Accepted
                  </span>
                  {bookingId && (
                    <Button size="sm" variant="outline" onClick={() => navigate(`/booking/${bookingId}`)}>
                      View Booking
                    </Button>
                  )}
                </div>
              )}
              {offerStatus === 'declined' && (
                <span className="flex items-center gap-1 text-sm font-medium text-destructive">
                  <XCircle className="h-4 w-4" /> Declined
                </span>
              )}
              {offerStatus === 'pending' && !isOwnMessage && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => handleRespondToOffer(false)}
                    disabled={respondingOffer}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleRespondToOffer(true)}
                    disabled={respondingOffer}
                  >
                    {respondingOffer ? 'Processing...' : 'Accept'}
                  </Button>
                </div>
              )}
              {offerStatus === 'pending' && isOwnMessage && (
                <span className="text-xs text-muted-foreground">Awaiting buyer response</span>
              )}
            </div>
          </div>
        )}

        {/* Attachments (Images) */}
        {hasAttachments && (
          <div className={`mb-2 ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
            {attachments.map((url, index) => (
              <div
                key={index}
                className={`rounded-lg overflow-hidden ${
                  isOwnMessage ? 'ml-auto' : 'mr-auto'
                }`}
                style={{ maxWidth: '300px' }}
              >
                {!imageError[index] ? (
                  <img
                    src={url}
                    alt={`Attachment ${index + 1}`}
                    className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onError={() => setImageError((prev) => ({ ...prev, [index]: true }))}
                    onClick={() => window.open(url, '_blank')}
                  />
                ) : (
                  <div className="p-4 bg-muted text-muted-foreground text-sm rounded-lg">
                    Failed to load image
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text Content */}
        {hasContent && (
          <div
            className={`rounded-lg px-4 py-2 ${
              isOwnMessage
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {linkifyText(message.content)}
            </p>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground mt-1 px-1">
          {formatDistanceToNow(new Date(message.created_at), {
            addSuffix: true,
          })}
        </span>
      </div>
    </div>
  );
};

