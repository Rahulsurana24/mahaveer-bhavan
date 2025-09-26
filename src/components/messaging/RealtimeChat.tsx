import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Circle } from 'lucide-react';
import { useRealtimeMessages } from '@/hooks/useRealtime';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
}

interface RealtimeChatProps {
  receiverId: string;
  receiverName: string;
}

export const RealtimeChat = ({ receiverId, receiverName }: RealtimeChatProps) => {
  const { user } = useAuth();
  const { messages: realtimeMessages, onlineUsers } = useRealtimeMessages();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isOnline = onlineUsers.includes(receiverId);

  // Load existing messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
  }, [user, receiverId]);

  // Update messages with realtime data
  useEffect(() => {
    const relevantMessages = realtimeMessages.filter(msg => 
      (msg.sender_id === user?.id && msg.receiver_id === receiverId) ||
      (msg.sender_id === receiverId && msg.receiver_id === user?.id)
    );

    setMessages(prev => {
      const newMessages = [...prev];
      relevantMessages.forEach(msg => {
        if (!newMessages.find(m => m.id === msg.id)) {
          newMessages.push(msg);
        }
      });
      return newMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
  }, [realtimeMessages, user?.id, receiverId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('messaging-system', {
        body: {
          action: 'send_message',
          sender_id: user.id,
          receiver_id: receiverId,
          content: newMessage.trim()
        }
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{receiverName}</h3>
          <Badge variant={isOnline ? "default" : "secondary"} className="text-xs gap-1">
            <Circle className={`w-2 h-2 ${isOnline ? 'fill-green-500' : 'fill-gray-400'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
        />
        <Button type="submit" disabled={!newMessage.trim() || loading}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
};