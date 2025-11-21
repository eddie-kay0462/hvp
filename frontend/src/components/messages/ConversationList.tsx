import { useConversations } from '@/hooks/useConversations';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/hooks/useMessages';

interface ConversationListProps {
  onSelectConversation?: (conversation: Conversation) => void;
}

export const ConversationList = ({ onSelectConversation }: ConversationListProps) => {
  const { conversations, loading } = useConversations();
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const getDisplayName = (conversation: Conversation) => {
    if (conversation.other_user) {
      const { first_name, last_name } = conversation.other_user;
      if (first_name && last_name) {
        return `${first_name} ${last_name}`;
      }
      return first_name || last_name || 'Unknown User';
    }
    return 'Unknown User';
  };

  const handleSelect = (conversation: Conversation) => {
    navigate(`/messages/${conversation.id}`);
    onSelectConversation?.(conversation);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No conversations yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Start a conversation from a service page
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="divide-y">
        {conversations.map((conversation) => {
          const displayName = getDisplayName(conversation);
          const isActive = conversationId === conversation.id;
          
          // Debug: Log if name is missing
          if (!displayName || displayName === 'Unknown User') {
            console.log('Missing name for conversation:', conversation.id, conversation.other_user);
          }

          return (
            <button
              key={conversation.id}
              onClick={() => handleSelect(conversation)}
              className={cn(
                'w-full p-4 text-left hover:bg-accent transition-colors',
                isActive && 'bg-accent'
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback>
                    {getInitials(
                      conversation.other_user?.first_name,
                      conversation.other_user?.last_name
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div
                      className={cn(
                        'font-semibold text-base truncate flex-1 min-w-0',
                        isActive ? 'text-white' : 'text-foreground'
                      )}
                      title={displayName}
                    >
                      {displayName || 'Unknown User'}
                    </div>
                    {conversation.last_message && (
                      <div
                        className={cn(
                          'text-xs flex-shrink-0 whitespace-nowrap',
                          isActive ? 'text-white/80' : 'text-muted-foreground'
                        )}
                      >
                        {formatDistanceToNow(
                          new Date(conversation.last_message.created_at),
                          { addSuffix: true }
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'text-sm truncate flex-1 min-w-0',
                        isActive ? 'text-white/90' : 'text-muted-foreground'
                      )}
                      title={conversation.last_message?.content}
                    >
                      {conversation.last_message?.content || 'No messages yet'}
                    </div>
                    {conversation.unread_count && conversation.unread_count > 0 && (
                      <Badge variant="default" className="flex-shrink-0">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

