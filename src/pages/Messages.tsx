import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MobileLayout from "@/components/layout/MobileLayout";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MessageSquarePlus, Users } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { CreateGroupDialog } from "@/components/messaging/CreateGroupDialog";

const Messages = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);

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

  // Fetch all users for new chat
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['chat-users', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('user_profiles')
        .select('id, auth_id, email, full_name, avatar_url')
        .neq('id', currentUser?.id || '');

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('full_name');
      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentUser
  });

  // Fetch recent conversations (both direct and group)
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['recent-conversations', currentUser?.id, searchTerm],
    queryFn: async () => {
      if (!currentUser) return { direct: [], groups: [] };

      // Fetch direct messages
      const { data: directMessages, error: directError } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          message_type,
          created_at,
          is_read,
          sender:user_profiles!messages_sender_id_fkey(id, full_name, avatar_url),
          recipient:user_profiles!messages_recipient_id_fkey(id, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .is('group_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (directError) throw directError;

      // Group by conversation partner
      const conversationMap = new Map();
      directMessages?.forEach((msg: any) => {
        const partnerId = msg.sender_id === currentUser.id ? msg.recipient_id : msg.sender_id;
        const partner = msg.sender_id === currentUser.id ? msg.recipient : msg.sender;

        if (!conversationMap.has(partnerId)) {
          // Count unread messages from this partner
          const unreadCount = directMessages.filter(
            (m: any) => m.sender_id === partnerId && m.recipient_id === currentUser.id && !m.is_read
          ).length;

          conversationMap.set(partnerId, {
            type: 'direct',
            id: partnerId,
            user: partner,
            name: partner?.full_name || 'Unknown',
            avatar: partner?.avatar_url,
            lastMessage: msg.content || (msg.message_type !== 'text' ? `[${msg.message_type}]` : ''),
            lastMessageTime: msg.created_at,
            lastMessageType: msg.message_type,
            unreadCount
          });
        }
      });

      // Fetch group chats
      const { data: groups, error: groupsError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name,
            avatar_url,
            updated_at
          )
        `)
        .eq('user_id', currentUser.id);

      if (groupsError) throw groupsError;

      // For each group, get the last message
      const groupConversations = await Promise.all(
        (groups || []).map(async (gm: any) => {
          const group = gm.groups;
          
          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, message_type, created_at, sender_id, user_profiles!messages_sender_id_fkey(full_name)')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Count unread messages
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .neq('sender_id', currentUser.id)
            .eq('is_read', false);

          return {
            type: 'group',
            id: group.id,
            name: group.name,
            avatar: group.avatar_url,
            lastMessage: lastMsg ? 
              (lastMsg.sender_id === currentUser.id ? 'You: ' : `${lastMsg.user_profiles?.full_name?.split(' ')[0]}: `) +
              (lastMsg.content || `[${lastMsg.message_type}]`)
              : 'No messages yet',
            lastMessageTime: lastMsg?.created_at || group.updated_at,
            lastMessageType: lastMsg?.message_type || 'text',
            unreadCount: unreadCount || 0
          };
        })
      );

      // Combine and sort all conversations
      const allConversations = [
        ...Array.from(conversationMap.values()),
        ...groupConversations
      ].sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      // Filter by search term
      const filtered = searchTerm
        ? allConversations.filter(conv =>
            conv.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : allConversations;

      return {
        all: filtered,
        direct: Array.from(conversationMap.values()),
        groups: groupConversations
      };
    },
    enabled: !!currentUser,
    refetchInterval: 5000 // Refetch every 5 seconds
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

  const handleConversationClick = (conversation: any) => {
    if (conversation.type === 'group') {
      navigate(`/group-chat/${conversation.id}`);
    } else {
      navigate(`/chat/${conversation.id}`);
    }
  };

  const isLoading = usersLoading || conversationsLoading;

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
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCreateGroup(true)}
            className="h-9 w-9"
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/new-chat')}
            className="h-9 w-9"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </div>
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
        {conversations && conversations.all.length > 0 ? (
          conversations.all.map((conv: any) => (
            <button
              key={`${conv.type}-${conv.id}`}
              onClick={() => handleConversationClick(conv)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarImage src={conv.avatar} />
                  <AvatarFallback className={cn(
                    "font-semibold",
                    conv.type === 'group' ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                  )}>
                    {conv.type === 'group' ? (
                      <Users className="h-6 w-6" />
                    ) : (
                      getInitials(conv.name)
                    )}
                  </AvatarFallback>
                </Avatar>
                {conv.type === 'group' && (
                  <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5">
                    <Users className="h-3 w-3" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={cn(
                    "font-semibold text-sm truncate",
                    conv.unreadCount > 0 ? "text-gray-900" : "text-gray-700"
                  )}>
                    {conv.name}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatMessageTime(conv.lastMessageTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={cn(
                    "text-sm truncate",
                    conv.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                  )}>
                    {conv.lastMessage}
                  </p>
                  {conv.unreadCount > 0 && (
                    <Badge
                      variant="default"
                      className="ml-2 flex-shrink-0 h-5 min-w-5 px-1.5 flex items-center justify-center bg-primary text-xs"
                    >
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <>
            {/* Show all users if no conversations */}
            {!searchTerm && (
              <div className="px-4 py-3 bg-gray-50">
                <p className="text-xs text-gray-500 font-medium">All Members</p>
              </div>
            )}
            {users && users.length > 0 ? (
              users.map((user: any) => (
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
                      {user.email}
                    </p>
                  </div>
                </button>
              ))
            ) : (
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
          </>
        )}
      </div>

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        currentUserId={currentUser?.id}
      />
    </MobileLayout>
  );
};

export default Messages;
