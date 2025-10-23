import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  Video,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Mic,
  MoreVertical,
  Check,
  CheckCheck,
  Download,
  X,
  Camera,
  Loader2
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useMemberData } from '@/hooks/useMemberData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/ui/loading';
import { EmojiPicker } from '@/components/messaging/EmojiPicker';
import { AudioRecorder } from '@/components/messaging/AudioRecorder';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Chat {
  id: string;
  name: string;
  member_id: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar?: string;
  online?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read: boolean;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio' | 'document';
}

export default function Messaging() {
  const { user } = useAuth();
  const { member } = useMemberData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{url: string, type: string} | null>(null);
  const [showCallDialog, setShowCallDialog] = useState<'audio' | 'video' | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Fetch conversations
  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['chats', member?.id],
    queryFn: async () => {
      if (!member?.id) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:members!messages_sender_id_fkey(id, full_name, photo_url),
          receiver:members!messages_receiver_id_fkey(id, full_name, photo_url)
        `)
        .or(`sender_id.eq.${member.id},receiver_id.eq.${member.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const uniqueChats = new Map<string, Chat>();
      data?.forEach((msg: any) => {
        const otherMember = msg.sender_id === member.id ? msg.receiver : msg.sender;
        if (!uniqueChats.has(otherMember.id)) {
          uniqueChats.set(otherMember.id, {
            id: otherMember.id,
            name: otherMember.full_name,
            member_id: otherMember.id,
            lastMessage: msg.content,
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: msg.sender_id !== member.id && !msg.read ? 1 : 0,
            avatar: otherMember.photo_url,
            online: Math.random() > 0.5
          });
        }
      });

      return Array.from(uniqueChats.values());
    },
    enabled: !!member?.id
  });

  // Fetch messages for selected chat
  const { data: messages } = useQuery({
    queryKey: ['messages', selectedChat?.member_id, member?.id],
    queryFn: async () => {
      if (!selectedChat?.member_id || !member?.id) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${member.id},receiver_id.eq.${selectedChat.member_id}),and(sender_id.eq.${selectedChat.member_id},receiver_id.eq.${member.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedChat?.member_id && !!member?.id,
    refetchInterval: 3000 // Poll every 3 seconds for new messages
  });

  // Fetch members for new chat
  const { data: members } = useQuery({
    queryKey: ['members-for-chat', member?.id],
    queryFn: async () => {
      if (!member?.id) return [];

      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, photo_url, membership_type')
        .neq('id', member.id)
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!member?.id
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; media_url?: string; media_type?: string }) => {
      if (!member?.id || !selectedChat?.member_id) throw new Error('Missing data');

      const { error } = await supabase.from('messages').insert([{
        sender_id: member.id,
        receiver_id: selectedChat.member_id,
        content: data.content,
        media_url: data.media_url,
        media_type: data.media_type,
        read: false
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setMessageText('');
      setMediaPreview(null);
      scrollToBottom();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if ((!messageText.trim() && !mediaPreview) || !selectedChat) return;

    sendMessageMutation.mutate({
      content: messageText || (mediaPreview ? 'Media' : ''),
      media_url: mediaPreview?.url,
      media_type: mediaPreview?.type
    });
  };

  const handleMediaUpload = async (file: File, type: string) => {
    if (!member?.id) {
      toast({
        title: "Error",
        description: "Member information not available",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (10MB max for messaging)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingMedia(true);
    
    try {
      // Upload to storage
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExt}`;
      const filePath = `${member.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('messaging-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get signed URL (valid for 7 days)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('messaging-attachments')
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7); // 7 days

      if (urlError) throw urlError;

      // Create preview with actual uploaded URL
      setMediaPreview({ 
        url: signedUrlData.signedUrl, 
        type: type 
      });
      setShowMediaDialog(false);
      
      toast({
        title: "Success",
        description: "File uploaded successfully"
      });
    } catch (error: any) {
      console.error('Media upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleAudioRecorded = async (audioBlob: Blob, duration: number) => {
    if (!member?.id) {
      toast({
        title: "Error",
        description: "Member information not available",
        variant: "destructive"
      });
      return;
    }

    setUploadingMedia(true);

    try {
      // Convert blob to file
      const timestamp = Date.now();
      const fileName = `voice-${timestamp}.webm`;
      const audioFile = new File([audioBlob], fileName, { type: 'audio/webm' });
      
      // Upload to storage
      const filePath = `${member.id}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('messaging-attachments')
        .upload(filePath, audioFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('messaging-attachments')
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7);

      if (urlError) throw urlError;

      // Send message with audio
      await sendMessageMutation.mutateAsync({
        content: `Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
        media_url: signedUrlData.signedUrl,
        media_type: 'audio'
      });

      setIsRecording(false);
    } catch (error: any) {
      console.error('Audio upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload audio",
        variant: "destructive"
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const startNewChat = (member: any) => {
    setSelectedChat({
      id: member.id,
      name: member.full_name,
      member_id: member.id,
      lastMessage: '',
      time: '',
      unread: 0,
      avatar: member.photo_url,
      online: true
    });
    setShowNewChat(false);
  };

  const filteredMembers = members?.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (chatsLoading) {
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
      <div className="h-[calc(100vh-8rem)] flex gap-0 bg-muted/30">
        {/* Left Sidebar - WhatsApp Style */}
        <Card className="w-full md:w-96 flex flex-col rounded-none border-r">
          {/* Header */}
          <div className="p-4 bg-primary text-primary-foreground">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Messages</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-primary-foreground">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowNewChat(true)}>
                    New Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search or start new chat"
                className="pl-9 bg-background/90 border-none"
                onClick={() => setShowNewChat(true)}
                readOnly
              />
            </div>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {chats && chats.length > 0 ? (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedChat?.id === chat.id ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback>{chat.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      {chat.online && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium truncate">{chat.name}</h4>
                        <span className="text-xs text-muted-foreground">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate flex-1">{chat.lastMessage}</p>
                        {chat.unread > 0 && (
                          <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary">
                            {chat.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No conversations yet</p>
                  <Button variant="link" onClick={() => setShowNewChat(true)}>
                    Start a new chat
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right Side - Chat Area */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIuMDMiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')]">
            {/* Chat Header */}
            <div className="p-3 bg-background border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedChat.avatar} />
                    <AvatarFallback>{selectedChat.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  {selectedChat.online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{selectedChat.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.online ? 'online' : 'offline'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setShowCallDialog('video')}>
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowCallDialog('audio')}>
                  <Phone className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
                    <DropdownMenuItem>Clear Chat</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Block User</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages?.map((msg: Message) => {
                  const isOwnMessage = msg.sender_id === member?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border'
                        }`}
                      >
                        {msg.media_url && (
                          <div className="mb-2">
                            {msg.media_type === 'image' && (
                              <img src={msg.media_url} alt="Media" className="rounded max-w-full" />
                            )}
                            {msg.media_type === 'video' && (
                              <video src={msg.media_url} controls className="rounded max-w-full" />
                            )}
                            {msg.media_type === 'audio' && (
                              <audio src={msg.media_url} controls className="max-w-full" />
                            )}
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOwnMessage && (
                            msg.read ? (
                              <CheckCheck className="h-3 w-3 text-blue-400" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input Area */}
            <div className="p-3 bg-background border-t">
              {mediaPreview && (
                <div className="mb-2 relative inline-block">
                  <img src={mediaPreview.url} alt="Preview" className="h-20 rounded" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => setMediaPreview(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {!isRecording ? (
                <div className="flex items-center gap-2">
                  <EmojiPicker onEmojiSelect={(emoji) => setMessageText(prev => prev + emoji)} />

                  <DropdownMenu open={showMediaDialog} onOpenChange={setShowMediaDialog}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" type="button" disabled={uploadingMedia}>
                        {uploadingMedia ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Paperclip className="h-5 w-5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem asChild>
                        <label className="cursor-pointer">
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Photo
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'image')}
                            disabled={uploadingMedia}
                          />
                        </label>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <label className="cursor-pointer">
                          <Camera className="h-4 w-4 mr-2" />
                          Camera
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'image')}
                            disabled={uploadingMedia}
                          />
                        </label>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <label className="cursor-pointer">
                          <FileText className="h-4 w-4 mr-2" />
                          Document
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => e.target.files?.[0] && handleMediaUpload(e.target.files[0], 'document')}
                            disabled={uploadingMedia}
                          />
                        </label>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1"
                    disabled={uploadingMedia}
                  />

                  {messageText.trim() || mediaPreview ? (
                    <Button size="icon" onClick={handleSendMessage} disabled={sendMessageMutation.isPending || uploadingMedia}>
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => setIsRecording(true)} disabled={uploadingMedia}>
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              ) : (
                <AudioRecorder
                  onAudioRecorded={handleAudioRecorded}
                  onCancel={() => setIsRecording(false)}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center">
              <MessageSquare className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">WhatsApp Web Style Messaging</h3>
              <p className="text-muted-foreground mb-4">Select a chat to start messaging</p>
              <Button onClick={() => setShowNewChat(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-md">
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
              <div className="space-y-1">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => startNewChat(member)}
                  >
                    <Avatar>
                      <AvatarImage src={member.photo_url} />
                      <AvatarFallback>
                        {member.full_name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.full_name}</p>
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

      {/* Call Dialog */}
      <Dialog open={!!showCallDialog} onOpenChange={() => setShowCallDialog(null)}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={selectedChat?.avatar} />
              <AvatarFallback>{selectedChat?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold mb-2">{selectedChat?.name}</h3>
            <p className="text-muted-foreground mb-6">
              {showCallDialog === 'video' ? 'Video' : 'Audio'} calling...
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full h-14 w-14"
                onClick={() => setShowCallDialog(null)}
              >
                <Phone className="h-6 w-6 rotate-135" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Call feature is in demo mode
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
