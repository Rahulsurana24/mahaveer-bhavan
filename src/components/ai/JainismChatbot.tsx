import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card3D } from '@/components/3d/Card3D';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Minimize2,
  Maximize2,
  BookOpen,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const JainismChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Jai Jinendra! 🙏\n\nI am the Dharma AI Assistant, your guide to Jain philosophy, practices, and traditions. I specialize exclusively in:\n\n• Jain principles and teachings\n• Varsitap and spiritual practices\n• Agam Granthas and scriptures\n• Festivals and rituals\n• Jain history and philosophy\n\nHow may I assist you on your spiritual journey today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Check if user has seen welcome modal
  useEffect(() => {
    const hasSeenKey = 'dharma_ai_welcome_seen';
    const seen = localStorage.getItem(hasSeenKey);
    if (seen === 'true') {
      setHasSeenWelcome(true);
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    if (!hasSeenWelcome) {
      setShowWelcomeModal(true);
    }
  };

  const handleWelcomeClose = () => {
    setShowWelcomeModal(false);
    setHasSeenWelcome(true);
    localStorage.setItem('dharma_ai_welcome_seen', 'true');
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
      // Call Supabase Edge Function (API key is securely stored in Edge Function secrets)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration is missing. Please check environment variables.');
      }

      // Prepare messages for the Edge Function
      const messagesToSend = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Add current user message
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

  return (
    <>
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

      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={handleOpen}
              className="h-16 w-16 rounded-full bg-[#00A36C] hover:bg-[#008F5C] shadow-2xl shadow-[#00A36C]/50 hover:scale-110 transition-all"
            >
              <BookOpen className="w-6 h-6" />
            </Button>
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 rounded-full border-2 border-black animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 60 : 600
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[400px]"
            style={{ maxWidth: 'calc(100vw - 3rem)' }}
          >
            <Card3D intensity={5}>
              <div className="bg-gradient-to-br from-zinc-900 to-black border-2 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#00A36C] to-[#008F5C] px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Dharma AI Assistant</h3>
                      <p className="text-white/80 text-xs">Jain Knowledge Guide • Always respectful</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowWelcomeModal(true)}
                      className="text-white hover:bg-white/20 rounded-xl"
                      title="About this AI"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="text-white hover:bg-white/20 rounded-xl"
                    >
                      {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="text-white hover:bg-white/20 rounded-xl"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                {!isMinimized && (
                  <>
                    <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                message.role === 'user'
                                  ? 'bg-gradient-to-r from-[#00A36C] to-[#008F5C] text-white'
                                  : 'bg-white/10 text-white border border-white/10'
                              }`}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                              <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-white/50'}`}>
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
                              <Loader2 className="w-5 h-5 text-[#00A36C] animate-spin" />
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-4 border-t border-white/10">
                      <div className="flex gap-2">
                        <Input
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={language === 'hi' ? 'जैन धर्म के बारे में पूछें...' : 'Ask about Jainism...'}
                          className="bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/40"
                          disabled={isLoading}
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={!inputValue.trim() || isLoading}
                          className="bg-gradient-to-r from-[#00A36C] to-[#008F5C] hover:from-[#008F5C] hover:to-[#00A36C] rounded-xl"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-white/40 mt-2 text-center">
                        Powered by AI • Jain Knowledge Only
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card3D>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
