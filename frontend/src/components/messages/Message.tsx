import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link as LinkIcon, ExternalLink } from 'lucide-react';
import type { Message as MessageType } from '@/hooks/useMessages';
import { useState } from 'react';

interface MessageProps {
  message: MessageType;
  senderName?: string;
  senderAvatar?: string;
}

export const Message = ({ message, senderName, senderAvatar }: MessageProps) => {
  const { user } = useAuth();
  const isOwnMessage = message.sender_id === user?.id;
  const [imageError, setImageError] = useState<Record<number, boolean>>({});

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

