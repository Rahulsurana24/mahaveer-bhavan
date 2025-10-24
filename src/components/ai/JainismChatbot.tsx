import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card3D } from '@/components/3d/Card3D';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Minimize2,
  Maximize2
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Namaste! I am your Jainism & Varatisap guide. Ask me anything about Jain philosophy, practices, or community traditions.',
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
      // Get OpenRouter API key from Supabase secrets or environment variable
      let apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

      // Try to get from Supabase vault if available
      try {
        const { data: secrets, error } = await supabase
          .from('vault')
          .select('secret')
          .eq('name', 'OPENROUTER_API_KEY')
          .single();

        if (!error && secrets?.secret) {
          apiKey = secrets.secret;
        }
      } catch (vaultError) {
        // Vault not configured, use environment variable
        console.log('Using environment variable for API key');
      }

      if (!apiKey) {
        throw new Error('OpenRouter API key not configured. Please set VITE_OPENROUTER_API_KEY in environment variables.');
      }

      // Prepare context about Jainism and Varatisap
      const systemPrompt = `You are a knowledgeable guide on Jainism and Varatisap (Jain community traditions).

Key topics you can help with:
- Jain philosophy and principles (Ahimsa, Anekantavada, Aparigraha)
- Jain practices (meditation, fasting, prayer)
- Varatisap community traditions
- Jain festivals and celebrations
- Jain dietary practices
- Spiritual guidance
- Community involvement

Respond in ${language === 'hi' ? 'Hindi (Devanagari script)' : 'English'}.
Be respectful, informative, and encourage spiritual growth.
Keep responses concise (2-3 paragraphs max).`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Mahaveer Bhavan AI Guide'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-5).map(m => ({
              role: m.role,
              content: m.content
            })),
            { role: 'user', content: inputValue }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.';

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
              onClick={() => setIsOpen(true)}
              className="h-16 w-16 rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-2xl shadow-orange-500/50 hover:scale-110 transition-all"
            >
              <Sparkles className="w-6 h-6" />
            </Button>
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
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
                <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Jainism Guide</h3>
                      <p className="text-white/80 text-xs">AI-powered • Always here to help</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
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
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
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
                          placeholder={language === 'hi' ? 'अपना प्रश्न पूछें...' : 'Ask about Jainism...'}
                          className="bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/40"
                          disabled={isLoading}
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={!inputValue.trim() || isLoading}
                          className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-white/40 mt-2 text-center">
                        Powered by AI • Responses may vary
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
