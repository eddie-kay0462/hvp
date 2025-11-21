import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Conversation, Message } from './useMessages';

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get conversations where user is participant
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Enrich conversations with other user info, last message, and unread count
      const enrichedConvs = await Promise.all(
        (convs || []).map(async (conv) => {
          const otherUserId =
            conv.participant1_id === user.id
              ? conv.participant2_id
              : conv.participant1_id;

          // Get other user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, profile_pic')
            .eq('id', otherUserId)
            .single();

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            other_user: profile || undefined,
            last_message: lastMsg || undefined,
            unread_count: count || 0,
          } as Conversation;
        })
      );

      setConversations(enrichedConvs);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();

    // Subscribe to conversation updates
    if (user) {
      const channel = supabase
        .channel('user-conversations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `participant1_id=eq.${user.id}`,
          },
          () => {
            fetchConversations();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `participant2_id=eq.${user.id}`,
          },
          () => {
            fetchConversations();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          () => {
            // Refresh conversations when new messages arrive
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user, fetchConversations]);

  return {
    conversations,
    loading,
    refetch: fetchConversations,
  };
};

