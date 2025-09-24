import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Send, 
  Search, 
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile
} from "lucide-react";

const Messaging = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>("chat-1");
  const [messageText, setMessageText] = useState("");

  const chats = [
    {
      id: "chat-1",
      name: "Raj Patel",
      lastMessage: "Looking forward to the satsang tomorrow!",
      time: "2 min ago",
      unread: 2,
      avatar: "/placeholder.svg",
      online: true
    },
    {
      id: "chat-2", 
      name: "Event Updates",
      lastMessage: "Monthly satsang has been rescheduled",
      time: "1 hour ago",
      unread: 0,
      avatar: "/placeholder.svg",
      online: false,
      isGroup: true
    },
    {
      id: "chat-3",
      name: "Meera Shah",
      lastMessage: "Thank you for organizing the charity drive",
      time: "3 hours ago",
      unread: 1,
      avatar: "/placeholder.svg",
      online: true
    },
    {
      id: "chat-4",
      name: "Trust Announcements",
      lastMessage: "New member orientation next week",
      time: "1 day ago", 
      unread: 0,
      avatar: "/placeholder.svg",
      online: false,
      isGroup: true
    }
  ];

  const messages = [
    {
      id: "msg-1",
      sender: "Raj Patel",
      content: "Namaste! How are the preparations going for tomorrow's event?",
      time: "10:30 AM",
      isOwn: false
    },
    {
      id: "msg-2",
      sender: "You",
      content: "Everything is going smoothly. The venue is ready and catering is confirmed.",
      time: "10:32 AM",
      isOwn: true
    },
    {
      id: "msg-3",
      sender: "Raj Patel", 
      content: "That's wonderful! I'm really excited. Will there be any special arrangements for elderly members?",
      time: "10:35 AM",
      isOwn: false
    },
    {
      id: "msg-4",
      sender: "You",
      content: "Yes, we have reserved front seats and arranged wheelchair accessibility.",
      time: "10:36 AM", 
      isOwn: true
    },
    {
      id: "msg-5",
      sender: "Raj Patel",
      content: "Looking forward to the satsang tomorrow!",
      time: "10:38 AM",
      isOwn: false
    }
  ];

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // Handle sending message
      setMessageText("");
    }
  };

  return (
    <MainLayout title="Messages">
      <div className="h-[calc(100vh-8rem)] flex">
        {/* Chat List */}
        <div className="w-full md:w-1/3 border-r border-border">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-9"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100%-80px)]">
            <div className="p-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChat === chat.id 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedChat(chat.id)}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={chat.avatar} alt={chat.name} />
                      <AvatarFallback>
                        {chat.isGroup ? (
                          <MessageSquare className="h-5 w-5" />
                        ) : (
                          chat.name.split(' ').map(n => n[0]).join('')
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {chat.online && !chat.isGroup && (
                      <div className="absolute -bottom-0 -right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">{chat.name}</h4>
                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                  </div>
                  
                  {chat.unread > 0 && (
                    <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center text-xs">
                      {chat.unread}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="Raj Patel" />
                  <AvatarFallback>RP</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">Raj Patel</h3>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1">
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">Choose a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Messaging;