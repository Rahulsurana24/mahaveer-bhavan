import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MobileLayout from "@/components/layout/MobileLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Smile, Paperclip, Phone, Video, MoreVertical } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

const Chat = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      return data;
    }
  });

  // Fetch chat partner info
  const { data: chatPartner, isLoading: partnerLoading } = useQuery({
    queryKey: ['chat-partner', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url, user_roles(name)')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', userId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser || !userId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser && !!userId,
    refetchInterval: 2000 // Real-time polling every 2 seconds
  });

  // Mark messages as read
  useEffect(() => {
    if (messages && currentUser && userId) {
      const unreadMessages = messages.filter(
        (msg: any) => msg.recipient_id === currentUser.id && !msg.is_read
      );

      if (unreadMessages.length > 0) {
        unreadMessages.forEach(async (msg: any) => {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', msg.id);
        });
      }
    }
  }, [messages, currentUser, userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser || !userId) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          recipient_id: userId,
          content,
          is_read: false
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['recent-conversations'] });
      setMessageText("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'dd/MM/yyyy HH:mm');
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (partnerLoading || messagesLoading) {
    return (
      <MobileLayout title="Chat" showBack hideBottomNav>
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title={chatPartner?.full_name || "Chat"}
      showBack
      hideBottomNav
      headerRight={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      }
      className="bg-[#efeae2] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48bGluZSB4MT0iMCIgeT0iMCIgeDI9IjQwIiB5Mj0iMCIgc3Ryb2tlPSIjZDBjNGIzIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')]"
    >
      {/* Messages Container */}
      <div className="flex flex-col h-full">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages && messages.length > 0 ? (
            <>
              {messages.map((message: any, index: number) => {
                const isOwnMessage = message.sender_id === currentUser?.id;
                const showDateSeparator = index === 0 ||
                  format(new Date(messages[index - 1].created_at), 'yyyy-MM-dd') !==
                  format(new Date(message.created_at), 'yyyy-MM-dd');

                return (
                  <div key={message.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-4">
                        <div className="bg-white/90 shadow-sm rounded-full px-4 py-1">
                          <span className="text-xs text-gray-600 font-medium">
                            {formatMessageDate(message.created_at).split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className={cn(
                      "flex gap-2 max-w-[80%]",
                      isOwnMessage ? "ml-auto" : "mr-auto"
                    )}>
                      {!isOwnMessage && (
                        <Avatar className="h-8 w-8 mt-auto flex-shrink-0">
                          <AvatarImage src={chatPartner?.avatar_url} />
                          <AvatarFallback className="text-xs bg-gray-200">
                            {getInitials(chatPartner?.full_name || '')}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={cn(
                        "rounded-lg px-3 py-2 shadow-sm",
                        isOwnMessage
                          ? "bg-[#dcf8c6] rounded-br-none"
                          : "bg-white rounded-bl-none"
                      )}>
                        <p className="text-sm text-gray-900 break-words">
                          {message.content}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-gray-500">
                            {format(new Date(message.created_at), 'HH:mm')}
                          </span>
                          {isOwnMessage && (
                            <span className="text-[10px] text-gray-500">
                              {message.is_read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="bg-white/90 rounded-2xl p-6 shadow-sm max-w-sm">
                <p className="text-sm text-gray-600 mb-2">
                  No messages yet
                </p>
                <p className="text-xs text-gray-500">
                  Start the conversation with {chatPartner?.full_name}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
            >
              <Smile className="h-5 w-5 text-gray-500" />
            </Button>

            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-primary"
              disabled={sendMessageMutation.isPending}
            />

            {messageText.trim() ? (
              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
                size="icon"
                className="h-9 w-9 flex-shrink-0 bg-[#25D366] hover:bg-[#1ea952]"
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0"
              >
                <Paperclip className="h-5 w-5 text-gray-500" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Chat;
