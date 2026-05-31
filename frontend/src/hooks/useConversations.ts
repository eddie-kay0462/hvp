import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Conversation } from './useMessages';

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_conversations', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setConversations((data as unknown as Conversation[]) || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();

    if (!user) return;

    // Re-fetch when any of the user's conversations change.
    // The trigger update_conversation_last_message_at keeps last_message_at
    // current on every message insert, so this subscription also fires when
    // new messages arrive — no separate unfiltered messages subscription needed.
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
        fetchConversations
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant2_id=eq.${user.id}`,
        },
        fetchConversations
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    loading,
    refetch: fetchConversations,
  };
};
