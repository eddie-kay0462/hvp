import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Conversation } from './useMessages';

export const useConversation = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getOrCreateConversation = useCallback(
    async (otherUserId: string, serviceId: string | null = null): Promise<Conversation> => {
      if (!user) throw new Error('User not authenticated');

      setLoading(true);
      try {
        // Try to find existing conversation
        // Check both participant orders and service match
        let query = supabase
          .from('conversations')
          .select('*');

        if (serviceId) {
          query = query.or(
            `and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId},service_id.eq.${serviceId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id},service_id.eq.${serviceId})`
          );
        } else {
          query = query.or(
            `and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId},service_id.is.null),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id},service_id.is.null)`
          );
        }

        const { data: existing, error: findError } = await query.maybeSingle();

        if (findError && findError.code !== 'PGRST116') {
          throw findError;
        }

        if (existing) {
          return existing as Conversation;
        }

        // Create new conversation
        // Ensure consistent ordering (smaller ID first)
        const [participant1, participant2] =
          user.id < otherUserId
            ? [user.id, otherUserId]
            : [otherUserId, user.id];

        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: participant1,
            participant2_id: participant2,
            service_id: serviceId,
          })
          .select()
          .single();

        if (createError) throw createError;
        return newConv as Conversation;
      } catch (error) {
        console.error('Error getting/creating conversation:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return {
    getOrCreateConversation,
    loading,
  };
};

