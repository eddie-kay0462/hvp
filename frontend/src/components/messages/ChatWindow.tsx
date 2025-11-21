import { useState, useRef, useEffect } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, Image as ImageIcon, Link as LinkIcon, X } from 'lucide-react';
import { Message } from './Message';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
interface ChatWindowProps {
  conversationId: string;
  otherUserName?: string;
  otherUserAvatar?: string;
  serviceId?: string | null; // Optional service ID from conversation (not used for links)
}

export const ChatWindow = ({
  conversationId,
  otherUserName,
  otherUserAvatar,
  serviceId,
}: ChatWindowProps) => {
  const { messages, loading, sending, sendMessage } = useMessages(conversationId);
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
          .from('message-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setAttachments((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAddLink = () => {
    const trimmedUrl = linkUrl.trim();
    
    if (!trimmedUrl) {
      toast.error('Please enter a URL');
      return;
    }

    // Add https:// if no protocol is specified
    let finalUrl = trimmedUrl;
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      finalUrl = `https://${trimmedUrl}`;
    }

    if (!validateUrl(finalUrl)) {
      toast.error('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setLinkUrl(finalUrl);
    setShowLinkDialog(false);
  };

  const removeLink = () => {
    setLinkUrl('');
  };

  const handleSend = async () => {
    if (sending) return;

    // At least one of: content, attachments, or link must be present
    if (!input.trim() && attachments.length === 0 && !linkUrl) {
      toast.error('Please add a message, image, or link');
      return;
    }

    const messageContent = input.trim();
    setInput('');

    try {
      await sendMessage(
        messageContent, 
        attachments.length > 0 ? attachments : undefined, 
        linkUrl || undefined
      );
      
      // Clear attachments and link after sending
      setAttachments([]);
      setLinkUrl('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
      setInput(messageContent); // Restore input on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Chat Header */}
      <div className="border-b p-4 bg-background flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {otherUserName ? getInitials(otherUserName) : '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-base">
              {otherUserName || 'Unknown User'}
            </h2>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-1">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  senderName={otherUserName}
                  senderAvatar={otherUserAvatar}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-background flex-shrink-0">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="mb-2 flex gap-2 flex-wrap">
            {attachments.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Attachment ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Link Preview */}
        {linkUrl && (
          <div className="mb-2">
            <div className="relative p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-primary hover:underline truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {linkUrl}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full flex-shrink-0"
                  onClick={removeLink}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {/* Image Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleImageUpload(e.target.files);
              }
            }}
            disabled={uploadingImages || sending}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImages || sending}
            title="Attach image"
          >
            {uploadingImages ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </Button>

          {/* Link Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowLinkDialog(true)}
            disabled={sending}
            title="Attach a link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            disabled={sending || uploadingImages}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={sending || uploadingImages || (!input.trim() && attachments.length === 0 && !linkUrl)}
            size="icon"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Link URL Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Link</DialogTitle>
            <DialogDescription>
              Share a link to your work (Canva, website, portfolio, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="https://example.com or canva.com/design/..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddLink();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddLink} disabled={!linkUrl.trim()}>
                Add Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

