import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadCount = () => {
  const { user } = useAuth();
  const [conversationIds, setConversationIds] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Effect 1: load and keep the user's conversation ID list current.
  // Watches the conversations table (filtered by participant) so the ID list
  // updates when a new conversation is started.
  useEffect(() => {
    if (!user) {
      setConversationIds([]);
      setUnreadCount(0);
      return;
    }

    const loadIds = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

      setConversationIds((data || []).map((c) => c.id));
    };

    loadIds();

    const channel = supabase
      .channel('unread-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant1_id=eq.${user.id}`,
        },
        loadIds
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant2_id=eq.${user.id}`,
        },
        loadIds
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Effect 2: count unread messages and subscribe to changes, scoped only to
  // the user's own conversations. Re-runs whenever the conversation ID list
  // changes (new conversation started, user changes).
  useEffect(() => {
    if (!user || conversationIds.length === 0) {
      setUnreadCount(0);
      return;
    }

    const fetchCount = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      setUnreadCount(count || 0);
    };

    fetchCount();

    // Filter the messages subscription to only the user's conversations.
    // Supabase Realtime supports in() filters, so this fires only when a
    // message is inserted or updated (e.g. marked read) in one of the user's
    // conversations — not for every message on the platform.
    const filter = `conversation_id=in.(${conversationIds.join(',')})`;
    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter,
        },
        fetchCount
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter,
        },
        fetchCount
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, conversationIds]);

  return unreadCount;
};
