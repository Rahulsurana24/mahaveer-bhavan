import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Send,
  Loader2,
  BookOpen,
  Info,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const DharmaAI = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Jai Jinendra! 🙏\n\nI am the Dharma AI Assistant, your guide to Jain philosophy, practices, and traditions. I specialize exclusively in:\n\n• Jain principles and teachings (Ahimsa, Anekantavada, Aparigraha)\n• Varsitap and the 400-day spiritual practice\n• Agam Granthas and sacred scriptures\n• Paryushan and other festivals\n• Jain rituals, fasting, and meditation\n• Jain history and philosophy\n\nI draw upon the wisdom of the Agam Granthas to provide accurate, respectful answers. How may I assist you on your spiritual journey today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Check if user has seen welcome modal
  useEffect(() => {
    const hasSeenKey = 'dharma_ai_welcome_seen_fullscreen';
    const seen = localStorage.getItem(hasSeenKey);
    if (seen !== 'true') {
      setShowWelcomeModal(true);
    }
  }, []);

  const handleWelcomeClose = () => {
    setShowWelcomeModal(false);
    localStorage.setItem('dharma_ai_welcome_seen_fullscreen', 'true');
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuration error. Please contact support.');
      }

      // Prepare messages for the Edge Function
      const messagesToSend = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      }));

      messagesToSend.push({
        role: 'user',
        content: inputValue
      });

      // Call the Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/jainism-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          messages: messagesToSend,
          language: language
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const aiResponse = data.response || 'I apologize, I could not generate a response. Please try again.';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: language === 'hi'
          ? `क्षमा करें, मुझे प्रतिक्रिया देने में समस्या हुई। ${error instanceof Error ? error.message : 'कृपया पुनः प्रयास करें।'}`
          : `Sorry, I encountered an issue. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    if (confirm(language === 'hi' ? 'क्या आप बातचीत साफ़ करना चाहते हैं?' : 'Are you sure you want to clear the conversation?')) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Jai Jinendra! 🙏\n\nYour conversation has been cleared. How may I assist you with Jain philosophy, practices, or spiritual guidance?',
        timestamp: new Date()
      }]);
      toast({
        title: language === 'hi' ? 'बातचीत साफ़ हो गई' : 'Conversation Cleared',
        description: language === 'hi' ? 'आप नई शुरुआत कर सकते हैं' : 'You can start fresh'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D] text-white">
      {/* Welcome/Initialization Modal */}
      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-6 w-6 text-[#00A36C]" />
              Welcome to Dharma AI Assistant
            </DialogTitle>
            <DialogDescription className="space-y-3 text-left pt-4">
              <p className="font-semibold text-foreground">Jai Jinendra! 🙏</p>

              <p>
                I am your spiritual guide, specialized exclusively in <strong>Jainism, Varsitap, and Jain religious practices</strong>.
              </p>

              <div className="space-y-2">
                <p className="font-semibold text-[#00A36C]">✅ I can help with:</p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                  <li>Jain philosophy and principles</li>
                  <li>Varsitap practices and rules</li>
                  <li>Agam Granthas teachings</li>
                  <li>Festivals, rituals, and fasting</li>
                  <li>Spiritual guidance</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-destructive">❌ I cannot help with:</p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                  <li>Politics, finance, or medical advice</li>
                  <li>Non-Jain religious topics</li>
                  <li>Entertainment or secular matters</li>
                </ul>
              </div>

              <div className="bg-[#00A36C]/10 border border-[#00A36C]/30 rounded-lg p-3 mt-4">
                <p className="text-xs flex items-start gap-2">
                  <Info className="h-4 w-4 text-[#00A36C] mt-0.5 flex-shrink-0" />
                  <span>
                    All responses are rooted in Jain scriptures and traditions. This AI provides educational guidance and should not replace consultation with learned scholars for complex spiritual matters.
                  </span>
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={handleWelcomeClose}
              className="w-full bg-[#00A36C] hover:bg-[#008F5C]"
            >
              I Understand - Begin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#00A36C] to-[#008F5C] border-b border-white/10 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/20 rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Dharma AI Assistant</h1>
                  <p className="text-white/80 text-xs">Jain Knowledge Guide • Powered by AI</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWelcomeModal(true)}
                className="text-white hover:bg-white/20 rounded-xl"
              >
                <Info className="h-4 w-4 mr-2" />
                About
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                className="text-white hover:bg-white/20 rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
        <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-250px)]" ref={scrollRef}>
              <div className="p-6 space-y-6">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-[#00A36C] to-[#008F5C]'
                          : 'bg-amber-500'
                      }`}>
                        {message.role === 'user' ? (
                          <span className="text-white text-xs font-bold">You</span>
                        ) : (
                          <BookOpen className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-5 py-3 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-[#00A36C] to-[#008F5C] text-white'
                            : 'bg-white/10 text-white border border-white/10'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-white/50'}`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-white/10 rounded-2xl px-5 py-3 border border-white/10">
                        <Loader2 className="w-5 h-5 text-[#00A36C] animate-spin" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Input Area - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#1C1C1C] to-transparent border-t border-white/10 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === 'hi' ? 'जैन धर्म के बारे में पूछें...' : 'Ask about Jainism, Varsitap, or spiritual practices...'}
              className="bg-white/10 border-white/20 text-white rounded-xl placeholder:text-white/40 h-12 text-base"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-to-r from-[#00A36C] to-[#008F5C] hover:from-[#008F5C] hover:to-[#00A36C] rounded-xl h-12 px-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">
            Powered by AI • Responses based on Agam Granthas and Jain traditions
          </p>
        </div>
      </div>
    </div>
  );
};

export default DharmaAI;
