import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MobileLayout from "@/components/layout/MobileLayout";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MessageSquarePlus } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

const Messages = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

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

  // Fetch all users for chat list
  const { data: users, isLoading } = useQuery({
    queryKey: ['chat-users', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          auth_id,
          email,
          full_name,
          avatar_url,
          user_roles(name)
        `)
        .neq('id', currentUser?.id || '');

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser
  });

  // Fetch recent conversations (messages)
  const { data: conversations } = useQuery({
    queryKey: ['recent-conversations', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          created_at,
          is_read,
          sender:user_profiles!messages_sender_id_fkey(id, full_name, avatar_url),
          recipient:user_profiles!messages_recipient_id_fkey(id, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Group by conversation partner and get last message
      const conversationMap = new Map();
      data?.forEach((msg: any) => {
        const partnerId = msg.sender_id === currentUser.id ? msg.recipient_id : msg.sender_id;
        const partner = msg.sender_id === currentUser.id ? msg.recipient : msg.sender;

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            user: partner,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unread: msg.recipient_id === currentUser.id && !msg.is_read
          });
        }
      });

      return Array.from(conversationMap.values());
    },
    enabled: !!currentUser,
    refetchInterval: 5000 // Refetch every 5 seconds for real-time feel
  });

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <MobileLayout title="Chats">
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="Chats"
      headerRight={
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/new-chat')}
          className="h-9 w-9"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      }
    >
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-white px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="divide-y divide-gray-100">
        {conversations && conversations.length > 0 ? (
          conversations.map((conv: any) => (
            <button
              key={conv.user.id}
              onClick={() => navigate(`/chat/${conv.user.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                <AvatarImage src={conv.user.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(conv.user.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={cn(
                    "font-semibold text-sm truncate",
                    conv.unread ? "text-gray-900" : "text-gray-700"
                  )}>
                    {conv.user.full_name}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatMessageTime(conv.lastMessageTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={cn(
                    "text-sm truncate",
                    conv.unread ? "text-gray-900 font-medium" : "text-gray-500"
                  )}>
                    {conv.lastMessage}
                  </p>
                  {conv.unread && (
                    <Badge
                      variant="default"
                      className="ml-2 flex-shrink-0 h-5 w-5 p-0 flex items-center justify-center bg-primary"
                    >
                      1
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <>
            {/* Show all users if no conversations */}
            <div className="px-4 py-3 bg-gray-50">
              <p className="text-xs text-gray-500 font-medium">All Members</p>
            </div>
            {users?.map((user: any) => (
              <button
                key={user.id}
                onClick={() => navigate(`/chat/${user.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 text-left">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">
                    {user.full_name}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {user.user_roles?.name || 'Member'}
                  </p>
                </div>
              </button>
            ))}
          </>
        )}

        {(!users || users.length === 0) && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageSquarePlus className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No members found</h3>
            <p className="text-sm text-gray-500 text-center">
              {searchTerm
                ? "Try adjusting your search"
                : "Start chatting with other members"}
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default Messages;
