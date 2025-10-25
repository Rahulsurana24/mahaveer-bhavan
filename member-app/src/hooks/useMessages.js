import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase/client';

/**
 * Realtime messaging hook
 * Manages chat conversations and real-time message updates
 *
 * @param {string} userId - Current user's ID
 * @returns {Object} Messaging state and methods
 */
export const useMessages = (userId) => {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const channelsRef = useRef({});

  /**
   * Fetch all conversations for the user
   */
  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      // This is a simplified query - adjust based on your actual schema
      const { data, error } = await supabase
        .from('messages')
        .select('conversation_id, sender_id, receiver_id, content, created_at')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation_id
      const conversationsMap = {};
      data.forEach(msg => {
        if (!conversationsMap[msg.conversation_id]) {
          conversationsMap[msg.conversation_id] = {
            id: msg.conversation_id,
            lastMessage: msg,
            unreadCount: 0, // Calculate based on is_read field
          };
        }
      });

      setConversations(Object.values(conversationsMap));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Fetch messages for a specific conversation
   */
  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(prev => ({
        ...prev,
        [conversationId]: data || []
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  /**
   * Subscribe to real-time updates for a conversation
   */
  const subscribeToConversation = useCallback((conversationId) => {
    // Unsubscribe from previous channel if exists
    if (channelsRef.current[conversationId]) {
      channelsRef.current[conversationId].unsubscribe();
    }

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message received:', payload.new);
          setMessages(prev => ({
            ...prev,
            [conversationId]: [...(prev[conversationId] || []), payload.new]
          }));
        }
      )
      .subscribe();

    channelsRef.current[conversationId] = channel;
    setActiveConversation(conversationId);

    // Fetch existing messages
    fetchMessages(conversationId);
  }, [fetchMessages]);

  /**
   * Send a message
   */
  const sendMessage = async (conversationId, content, mediaUrl = null) => {
    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: userId,
        content,
        media_url: mediaUrl,
        created_at: new Date().toISOString(),
        sending: true
      };

      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), optimisticMessage]
      }));

      // Actual send
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          media_url: mediaUrl
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId].map(msg =>
          msg.id === tempId ? data : msg
        )
      }));

      return { error: null, data };
    } catch (error) {
      console.error('Error sending message:', error);

      // Mark optimistic message as failed
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId].map(msg =>
          msg.sending ? { ...msg, sending: false, failed: true } : msg
        )
      }));

      return { error };
    }
  };

  /**
   * Create a new conversation
   */
  const createConversation = async (receiverId) => {
    try {
      // Check if conversation already exists
      const { data: existing, error: searchError } = await supabase
        .from('messages')
        .select('conversation_id')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`)
        .limit(1);

      if (searchError) throw searchError;

      if (existing && existing.length > 0) {
        return { error: null, conversationId: existing[0].conversation_id };
      }

      // Create new conversation by sending first message
      const conversationId = `conv-${Date.now()}`;
      return { error: null, conversationId };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return { error };
    }
  };

  /**
   * Mark messages as read
   */
  const markAsRead = async (conversationId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId, fetchConversations]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      Object.values(channelsRef.current).forEach(channel => {
        channel.unsubscribe();
      });
    };
  }, []);

  return {
    conversations,
    messages,
    loading,
    activeConversation,
    fetchConversations,
    subscribeToConversation,
    sendMessage,
    createConversation,
    markAsRead,
  };
};
