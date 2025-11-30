import { useParams, useNavigate } from 'react-router-dom';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/landing/Navbar';
import { ConversationList } from '@/components/messages/ConversationList';
import { ChatWindow } from '@/components/messages/ChatWindow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const Messages = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { conversations, loading: conversationsLoading } = useConversations();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Find the active conversation
  const activeConversation = conversations.find(
    (conv) => conv.id === conversationId
  );

  const getOtherUserName = () => {
    if (!activeConversation?.other_user) return undefined;
    const { first_name, last_name } = activeConversation.other_user;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    return first_name || last_name || undefined;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="container mx-auto px-4 py-4 md:py-6 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4 flex-shrink-0">
            {conversationId && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => navigate('/messages')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => navigate('/services')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Messages</h1>
          </div>

          {conversationsLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-0 lg:gap-4 flex-1 min-h-0 border rounded-lg overflow-hidden">
              {/* Conversation List */}
              <div className={`lg:col-span-1 border-r bg-card flex flex-col min-h-0 overflow-hidden ${
                conversationId ? 'hidden lg:flex' : 'flex'
              }`}>
                <ConversationList />
              </div>

              {/* Chat Window */}
              <div className={`lg:col-span-2 flex flex-col min-h-0 overflow-hidden ${
                conversationId ? 'flex' : 'hidden lg:flex'
              }`}>
                {conversationId && activeConversation ? (
                  <ChatWindow
                    conversationId={conversationId}
                    otherUserName={getOtherUserName()}
                    otherUserAvatar={activeConversation.other_user?.profile_pic || undefined}
                    serviceId={activeConversation.service_id || undefined}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-center p-4 md:p-8">
                    <div>
                      <MessageSquare className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-base md:text-lg font-medium mb-2">Select a conversation</p>
                      <p className="text-sm text-muted-foreground">
                        Choose a conversation from the list to start messaging
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Messages;

