import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MobileLayout from "@/components/layout/MobileLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Smile, Paperclip, Phone, Video, MoreVertical, Mic, X, Image as ImageIcon, FileText, Play, Pause } from "lucide-react";
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        .select('id, full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch messages with Realtime subscription
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', userId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser || !userId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${currentUser.id})`)
        .is('group_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser && !!userId
  });

  // Set up Realtime subscription for new messages
  useEffect(() => {
    if (!currentUser || !userId) return;

    const channel = supabase
      .channel(`chat:${currentUser.id}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${currentUser.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${currentUser.id}))`
        },
        (payload) => {
          console.log('New message received:', payload);
          queryClient.invalidateQueries({ queryKey: ['chat-messages', userId, currentUser.id] });
          queryClient.invalidateQueries({ queryKey: ['recent-conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${currentUser.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${currentUser.id}))`
        },
        (payload) => {
          console.log('Message updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['chat-messages', userId, currentUser.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, userId, queryClient]);

  // Set up typing indicator subscription
  useEffect(() => {
    if (!currentUser || !userId) return;

    const channel = supabase
      .channel(`typing:${currentUser.id}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `and(sender_id.eq.${userId},recipient_id.eq.${currentUser.id})`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setIsPartnerTyping((payload.new as any).is_typing);
          } else if (payload.eventType === 'DELETE') {
            setIsPartnerTyping(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, userId]);

  // Mark messages as read and set delivered status
  useEffect(() => {
    if (messages && currentUser && userId) {
      const unreadMessages = messages.filter(
        (msg: any) => msg.recipient_id === currentUser.id && !msg.is_read
      );

      if (unreadMessages.length > 0) {
        unreadMessages.forEach(async (msg: any) => {
          await supabase
            .from('messages')
            .update({
              is_read: true,
              read_at: new Date().toISOString(),
              delivered_at: msg.delivered_at || new Date().toISOString()
            })
            .eq('id', msg.id);
        });
      }
    }
  }, [messages, currentUser, userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing indicator
  const handleTyping = async () => {
    if (!currentUser || !userId) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update typing status
    await supabase
      .from('typing_indicators')
      .upsert({
        sender_id: currentUser.id,
        recipient_id: userId,
        is_typing: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'sender_id,recipient_id'
      });

    // Set timeout to clear typing status
    typingTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('typing_indicators')
        .upsert({
          sender_id: currentUser.id,
          recipient_id: userId,
          is_typing: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'sender_id,recipient_id'
        });
    }, 3000);
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, messageType, mediaUrl }: {
      content?: string;
      messageType?: string;
      mediaUrl?: string;
    }) => {
      if (!currentUser || !userId) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          recipient_id: userId,
          content: content || null,
          message_type: messageType || 'text',
          media_url: mediaUrl || null,
          is_read: false,
          delivered_at: null
        });

      if (error) throw error;

      // Clear typing indicator
      await supabase
        .from('typing_indicators')
        .upsert({
          sender_id: currentUser.id,
          recipient_id: userId,
          is_typing: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'sender_id,recipient_id'
        });
    },
    onSuccess: () => {
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
    sendMessageMutation.mutate({ content: messageText, messageType: 'text' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Voice recording handlers
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    // TODO: Implement actual voice recording with MediaRecorder API
    toast({
      title: "Recording...",
      description: "Voice message recording started"
    });
  };

  const stopRecording = () => {
    setIsRecording(false);
    setRecordingTime(0);
    // TODO: Implement actual voice recording stop and upload
    toast({
      title: "Voice message",
      description: "Voice recording feature coming soon!"
    });
  };

  // File attachment handler
  const handleAttachment = () => {
    // TODO: Implement file picker and upload to Supabase Storage
    toast({
      title: "Attachments",
      description: "File attachment feature coming soon!"
    });
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

  // Render message based on type
  const renderMessageContent = (message: any) => {
    const isOwnMessage = message.sender_id === currentUser?.id;

    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-1">
            <div className="bg-gray-200 rounded-lg overflow-hidden max-w-[250px]">
              <img
                src={message.media_url}
                alt="Shared image"
                className="w-full h-auto"
              />
            </div>
            {message.content && (
              <p className="text-sm text-gray-900 break-words">{message.content}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-1">
            <div className="bg-gray-200 rounded-lg overflow-hidden max-w-[250px] relative">
              <video
                src={message.media_url}
                controls
                className="w-full h-auto"
              />
            </div>
            {message.content && (
              <p className="text-sm text-gray-900 break-words">{message.content}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-primary/10"
            >
              <Play className="h-4 w-4 text-primary" />
            </Button>
            <div className="flex-1 h-8 bg-primary/10 rounded-full flex items-center px-2">
              <div className="h-1 bg-primary/30 rounded-full w-full"></div>
            </div>
            <span className="text-xs text-gray-500">
              {message.media_duration_seconds ? `${Math.floor(message.media_duration_seconds / 60)}:${(message.media_duration_seconds % 60).toString().padStart(2, '0')}` : '0:00'}
            </span>
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg min-w-[200px]">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{message.media_file_name || 'Document'}</p>
              <p className="text-xs text-gray-500">
                {message.media_file_size ? `${(message.media_file_size / 1024).toFixed(1)} KB` : 'Document'}
              </p>
            </div>
          </div>
        );

      default:
        return (
          <p className="text-sm text-gray-900 break-words">
            {message.content}
          </p>
        );
    }
  };

  // Get message status icon
  const getMessageStatusIcon = (message: any) => {
    if (message.is_read) {
      return <span className="text-[#53bdeb]">✓✓</span>; // Blue double check (read)
    } else if (message.delivered_at) {
      return <span className="text-gray-500">✓✓</span>; // Gray double check (delivered)
    } else {
      return <span className="text-gray-500">✓</span>; // Single check (sent)
    }
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
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              if (chatPartner?.phone) {
                window.location.href = `tel:${chatPartner.phone}`;
              } else {
                toast({
                  title: "No phone number",
                  description: "This user hasn't shared their phone number",
                  variant: "destructive"
                });
              }
            }}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              toast({
                title: "Video Call",
                description: "Video calling feature coming soon!",
              });
            }}
          >
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
                        {renderMessageContent(message)}
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <span className="text-[10px] text-gray-500">
                            {format(new Date(message.created_at), 'HH:mm')}
                          </span>
                          {isOwnMessage && (
                            <span className="text-[10px]">
                              {getMessageStatusIcon(message)}
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

          {/* Typing Indicator */}
          {isPartnerTyping && (
            <div className="flex gap-2 max-w-[80%]">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={chatPartner?.avatar_url} />
                <AvatarFallback className="text-xs bg-gray-200">
                  {getInitials(chatPartner?.full_name || '')}
                </AvatarFallback>
              </Avatar>
              <div className="bg-white rounded-lg rounded-bl-none px-3 py-2 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Voice Recording Overlay */}
        {isRecording && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <Mic className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-gray-900">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-sm text-gray-600">Recording voice message...</p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={stopRecording}
                  className="rounded-full"
                >
                  <X className="h-5 w-5 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={stopRecording}
                  className="rounded-full bg-[#25D366] hover:bg-[#1ea952]"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}

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
              onChange={(e) => {
                setMessageText(e.target.value);
                handleTyping();
              }}
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
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0"
                  onClick={handleAttachment}
                >
                  <Paperclip className="h-5 w-5 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0"
                  onMouseDown={startRecording}
                  onTouchStart={startRecording}
                >
                  <Mic className="h-5 w-5 text-gray-500" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Chat;
