import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card3D } from '@/components/3d/Card3D';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Send,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck,
  Users,
  Sparkles
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberData } from '@/hooks/useMemberData';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/ui/loading';
import { useLanguage } from '@/contexts/LanguageContext';

interface Conversation {
  id: string;
  member: {
    id: string;
    full_name: string;
    photo_url: string;
  };
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isTyping?: boolean;
}

const MessagingEnhanced = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { member } = useMemberData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', member?.id],
    queryFn: async () => {
      if (!member) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          message_text,
          is_read,
          created_at,
          sender:user_profiles!messages_sender_id_fkey(id, full_name, photo_url),
          recipient:user_profiles!messages_recipient_id_fkey(id, full_name, photo_url)
        `)
        .or(`sender_id.eq.${member.id},recipient_id.eq.${member.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversationsMap = new Map<string, Conversation>();

      data?.forEach((msg: any) => {
        const isReceived = msg.recipient_id === member.id;
        const partnerId = isReceived ? msg.sender_id : msg.recipient_id;
        const partner = isReceived ? msg.sender : msg.recipient;

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            id: partnerId,
            member: partner,
            lastMessage: msg.message_text,
            lastMessageTime: new Date(msg.created_at),
            unreadCount: 0
          });
        }

        if (isReceived && !msg.is_read) {
          const conv = conversationsMap.get(partnerId)!;
          conv.unreadCount++;
        }
      });

      return Array.from(conversationsMap.values());
    },
    enabled: !!member
  });

  // Fetch messages for selected conversation
  const { data: messages } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation || !member) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${member.id},recipient_id.eq.${selectedConversation}),and(sender_id.eq.${selectedConversation},recipient_id.eq.${member.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', member.id)
        .eq('sender_id', selectedConversation)
        .eq('is_read', false);

      return data;
    },
    enabled: !!selectedConversation && !!member,
    refetchInterval: 3000 // Poll for new messages
  });

  // Fetch suggested members
  const { data: suggestions } = useQuery({
    queryKey: ['message-suggestions', member?.id],
    queryFn: async () => {
      if (!member) return [];

      // Call the generate suggestions function first
      await supabase.rpc('generate_message_suggestions', { user_id: member.id });

      const { data, error } = await supabase
        .from('message_suggestions')
        .select(`
          suggested_member_id,
          reason,
          score,
          member:user_profiles!message_suggestions_suggested_member_id_fkey(id, full_name, photo_url)
        `)
        .eq('member_id', member.id)
        .order('score', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!member
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientId, text }: { recipientId: string; text: string }) => {
      await supabase
        .from('messages')
        .insert({
          sender_id: member?.id,
          recipient_id: recipientId,
          message_text: text
        });
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Call mutation
  const startCallMutation = useMutation({
    mutationFn: async ({ calleeId, callType }: { calleeId: string; callType: 'voice' | 'video' }) => {
      const { error } = await supabase
        .from('call_history')
        .insert({
          caller_id: member?.id,
          callee_id: calleeId,
          call_type: callType,
          status: 'completed', // In real app, this would be updated after call ends
          started_at: new Date().toISOString(),
          duration_seconds: 0
        });

      if (error) throw error;

      toast({
        title: callType === 'voice' ? 'Voice Call' : 'Video Call',
        description: 'Call feature coming soon!'
      });
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedMember = conversations?.find(c => c.id === selectedConversation)?.member;

  const filteredConversations = conversations?.filter(c =>
    c.member.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <MainLayout title="Messages">
        <div className="flex items-center justify-center min-h-screen">
          <Loading size="lg" text="Loading messages..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Messages">
      <div className="h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex">
        {/* Left Sidebar - Conversations */}
        <div className="w-full md:w-96 border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-white mb-4">{t('messages.title')}</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder={t('messages.searchMembers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white rounded-xl"
              />
            </div>
          </div>

          {/* Suggestions */}
          {suggestions && suggestions.length > 0 && !searchQuery && (
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-white">{t('messages.suggestions')}</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {suggestions.map((suggestion: any) => (
                  <Card3D key={suggestion.suggested_member_id} intensity={5}>
                    <button
                      onClick={() => setSelectedConversation(suggestion.suggested_member_id)}
                      className="flex flex-col items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all min-w-[80px]"
                    >
                      <Avatar className="w-12 h-12 border-2 border-orange-500">
                        <AvatarImage src={suggestion.member.photo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                          {suggestion.member.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-white text-center truncate max-w-full">
                        {suggestion.member.full_name.split(' ')[0]}
                      </span>
                    </button>
                  </Card3D>
                ))}
              </div>
            </div>
          )}

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredConversations?.map((conversation) => (
                <motion.button
                  key={conversation.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                    selectedConversation === conversation.id
                      ? 'bg-gradient-to-r from-orange-500/20 to-red-600/20 border border-orange-500/50'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversation.member.photo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                        {conversation.member.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-semibold truncate">{conversation.member.full_name}</p>
                      <span className="text-xs text-white/50">
                        {conversation.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white/60 truncate">{conversation.lastMessage}</p>
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-orange-500 text-white text-xs px-2 rounded-full">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Chat Area */}
        {selectedConversation && selectedMember ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedMember.photo_url} />
                  <AvatarFallback>{selectedMember.full_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold">{selectedMember.full_name}</p>
                  <p className="text-xs text-green-400">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startCallMutation.mutate({ calleeId: selectedConversation, callType: 'voice' })}
                  className="text-white hover:bg-white/10 rounded-xl"
                >
                  <Phone className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startCallMutation.mutate({ calleeId: selectedConversation, callType: 'video' })}
                  className="text-white hover:bg-white/10 rounded-xl"
                >
                  <Video className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-xl">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <AnimatePresence>
                  {messages?.map((message: any) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.sender_id === member?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${message.sender_id === member?.id ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.sender_id === member?.id
                              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                              : 'bg-white/10 text-white border border-white/10'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.message_text}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className={`text-xs ${message.sender_id === member?.id ? 'text-white/70' : 'text-white/50'}`}>
                              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {message.sender_id === member?.id && (
                              message.is_read ? (
                                <CheckCheck className="w-3 h-3 text-blue-400" />
                              ) : (
                                <Check className="w-3 h-3 text-white/70" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10 bg-black/50 backdrop-blur-xl">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (messageText.trim()) {
                        sendMessageMutation.mutate({
                          recipientId: selectedConversation,
                          text: messageText
                        });
                      }
                    }
                  }}
                  placeholder={t('messages.typeMessage')}
                  className="flex-1 bg-white/5 border-white/10 text-white rounded-xl"
                />
                <Button
                  onClick={() => {
                    if (messageText.trim()) {
                      sendMessageMutation.mutate({
                        recipientId: selectedConversation,
                        text: messageText
                      });
                    }
                  }}
                  disabled={!messageText.trim()}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
                <p className="text-white/60">Choose from your conversations or start a new one</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MessagingEnhanced;
