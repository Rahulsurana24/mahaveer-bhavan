import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MessageSquare, 
  Send, 
  Search, 
  Phone,
  Video,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Mic
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useMemberData } from '@/hooks/useMemberData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat } from '@/components/messaging/RealtimeChat';
import { Loading } from '@/components/ui/loading';

interface Chat {
  id: string;
  name: string;
  member_id: string;
  lastMessage: string;
  time: string;
  unread: number;
}

export default function Messaging() {
  const { user } = useAuth();
  const { member } = useMemberData();
  const { toast } = useToast();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

  useEffect(() => {
    if (member?.id) {
      loadChats();
      loadMembers();
    }
  }, [member]);

  const loadChats = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:members!messages_sender_id_fkey(id, full_name, photo_url),
          receiver:members!messages_receiver_id_fkey(id, full_name, photo_url)
        `)
        .or(`sender_id.eq.${member!.id},receiver_id.eq.${member!.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const uniqueChats = new Map<string, Chat>();
      data?.forEach((msg: any) => {
        const otherMember = msg.sender_id === member!.id ? msg.receiver : msg.sender;
        if (!uniqueChats.has(otherMember.id)) {
          uniqueChats.set(otherMember.id, {
            id: otherMember.id,
            name: otherMember.full_name,
            member_id: otherMember.id,
            lastMessage: msg.content,
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: 0
          });
        }
      });

      setChats(Array.from(uniqueChats.values()));
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, photo_url, membership_type')
        .neq('id', member!.id)
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const startNewChat = (member: any) => {
    setSelectedChat({
      id: member.id,
      name: member.full_name,
      member_id: member.id,
      lastMessage: '',
      time: '',
      unread: 0
    });
    setShowNewChat(false);
  };

  const handleMediaUpload = async (file: File) => {
    if (!user || !selectedChat) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('member-photos')
        .getPublicUrl(filePath);

      // Send as message with media URL
      toast({
        title: 'Success',
        description: 'Media uploaded successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload media',
        variant: 'destructive'
      });
    }
  };

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <MainLayout title="Messages">
        <div className="flex justify-center py-12">
          <Loading size="lg" text="Loading messages..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Messages">
      <div className="h-[calc(100vh-10rem)] flex gap-4">
        {/* Chat List */}
        <Card className="w-full md:w-1/3 flex flex-col">
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowNewChat(true)} className="w-full">
              New Chat
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChat?.id === chat.id 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {chat.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">{chat.name}</h4>
                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                  </div>
                  
                  {chat.unread > 0 && (
                    <Badge>{chat.unread}</Badge>
                  )}
                </div>
              ))}
              {chats.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No conversations yet
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        {selectedChat ? (
          <Card className="flex-1 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedChat.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedChat.name}</h3>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setMediaDialogOpen(true)}>
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <RealtimeChat 
                receiverId={selectedChat.member_id}
                receiverName={selectedChat.name}
              />
            </div>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a chat to start messaging</p>
            </div>
          </Card>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => startNewChat(member)}
                  >
                    <Avatar>
                      <AvatarImage src={member.photo_url} />
                      <AvatarFallback>
                        {member.full_name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-muted-foreground">ID: {member.id}</p>
                    </div>
                    <Badge variant="outline">{member.membership_type}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Upload Dialog */}
      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Media</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Button asChild variant="outline" className="h-24 flex-col gap-2">
              <label>
                <ImageIcon className="h-8 w-8" />
                <span>Image</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0])}
                />
              </label>
            </Button>
            <Button asChild variant="outline" className="h-24 flex-col gap-2">
              <label>
                <FileText className="h-8 w-8" />
                <span>Document</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0])}
                />
              </label>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Mic className="h-8 w-8" />
              <span>Audio</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Video className="h-8 w-8" />
              <span>Video</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}