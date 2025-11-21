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
        <div className="container mx-auto px-4 py-6 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center gap-4 mb-4 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/services')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Messages</h1>
          </div>

          {conversationsLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 border rounded-lg overflow-hidden">
              {/* Conversation List */}
              <div className="lg:col-span-1 border-r bg-card flex flex-col min-h-0 overflow-hidden">
                <ConversationList />
              </div>

              {/* Chat Window */}
              <div className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
                {conversationId && activeConversation ? (
                  <ChatWindow
                    conversationId={conversationId}
                    otherUserName={getOtherUserName()}
                    otherUserAvatar={activeConversation.other_user?.profile_pic || undefined}
                    serviceId={activeConversation.service_id || undefined}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-center p-8">
                    <div>
                      <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">Select a conversation</p>
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

