import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  attachments?: string[] | null; // Array of image URLs
  link_url?: string | null; // Optional external URL link (Canva, websites, etc.)
}

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  service_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string | null;
  other_user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_pic: string | null;
  };
  last_message?: Message;
  unread_count?: number;
}

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Mark messages as read
  const markAsRead = useCallback(
    async (convId: string) => {
      if (!user) return;

      try {
        await supabase
          .from('messages')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('conversation_id', convId)
          .eq('is_read', false)
          .neq('sender_id', user.id);
      } catch (error) {
        // Silently fail - not critical
      }
    },
    [user]
  );

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversationId || !user) {
      setLoading(false);
      return;
    }

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;
        setMessages(data || []);
        
        // Mark messages as read
        await markAsRead(conversationId);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up Realtime subscription
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          
          // Mark as read if viewing conversation
          if (newMessage.sender_id !== user.id) {
            markAsRead(conversationId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Successfully subscribed
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for conversation:', conversationId);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [conversationId, user, markAsRead]);

  // Send message
  const sendMessage = useCallback(
    async (
      content: string,
      attachments?: string[],
      linkUrl?: string | null
    ) => {
      if (!conversationId || !user) {
        throw new Error('Missing required data');
      }

      // At least content, attachments, or linkUrl must be provided
      if (!content.trim() && (!attachments || attachments.length === 0) && !linkUrl) {
        throw new Error('Message must have content, attachments, or a link');
      }

      setSending(true);
      try {
        const messageData: any = {
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim() || '',
        };

        // Add attachments if provided
        if (attachments && attachments.length > 0) {
          messageData.attachments = attachments;
        }

        // Add link_url if provided
        if (linkUrl && linkUrl.trim()) {
          messageData.link_url = linkUrl.trim();
        }

        const { data, error } = await supabase
          .from('messages')
          .insert(messageData)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      } finally {
        setSending(false);
      }
    },
    [conversationId, user]
  );

  return {
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead: () => markAsRead(conversationId),
  };
};

