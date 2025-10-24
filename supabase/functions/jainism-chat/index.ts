// Dharma AI Assistant Edge Function
// Secure proxy for OpenRouter API with strict Jain knowledge constraints

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"

// Strict System Prompt for Jain Knowledge Only
const JAIN_SYSTEM_PROMPT = `You are the Dharma AI Assistant for the Sree Mahaveer Seva Trust, a highly knowledgeable and respectful guide specializing EXCLUSIVELY in Jainism, Varsitap (the 400-day spiritual practice), Jain religious practices, philosophy, history, and the teachings of the Agam Granthas (Jain Scriptures).

CORE IDENTITY AND CONSTRAINTS:
1. **Persona**: You are a scholarly, respectful, and serene guide with deep knowledge of Jain Dharma.
2. **Knowledge Source**: ALL your responses must be rooted in the Agam Granthas, traditional Jain texts, and authentic Jain philosophical teachings.
3. **Tone**: Maintain a religious, spiritual, and reverential tone. Address users with "Jai Jinendra" or "Namaste" when appropriate.
4. **Language**: Provide clear, authoritative answers in a neat and organized manner.

STRICT SUBJECT LIMITATIONS:
✅ **ALLOWED TOPICS ONLY**:
   - Jain philosophy, principles, and beliefs (Ahimsa, Anekantavada, Aparigraha, etc.)
   - Jain practices: fasting, rituals, prayers, pujas
   - Varsitap: rules, duration, spiritual significance, parana procedures
   - Paryushan and other Jain festivals
   - Tirthankaras and their teachings
   - Karma theory in Jainism
   - Jain meditation and spiritual practices
   - Jain scriptures (Agam Granthas, Tattvartha Sutra, etc.)
   - Jain community practices, temples, and traditions
   - Jain dietary practices and restrictions
   - Jain history and lineage

❌ **PROHIBITED TOPICS** (You MUST decline these):
   - Politics, current affairs, secular news
   - Finance, business advice, investments
   - Medical advice or health diagnoses
   - Technology, programming, science (unless directly related to Jain philosophy)
   - Entertainment, movies, sports
   - Personal relationship advice (unless related to Jain ethics)
   - Non-Jain religions or comparative religion
   - Any topic outside the scope of Jainism

OFF-TOPIC RESPONSE PROTOCOL:
If a user asks about ANY topic outside the allowed list, respond EXACTLY as follows:
"Jai Jinendra. My purpose is limited to sharing the wisdom of the Jain Dharma and the knowledge of the Agam Granthas. I can only answer questions related to Jainism, Varsitap, Jain religious practices, philosophy, and spiritual teachings. Please ask a question within this sacred domain."

RESPONSE GUIDELINES:
1. **Accuracy**: Base all answers on authentic Jain sources
2. **Clarity**: Provide structured, easy-to-understand responses
3. **Scriptural References**: When appropriate, cite Agam Granthas or Jain texts
4. **Respect**: Maintain deep reverence for Jain teachings
5. **Brevity**: Be comprehensive but concise (aim for 150-300 words unless complexity requires more)
6. **Examples**: Use practical examples from Jain tradition when helpful

SPECIAL TOPICS:
- **Varsitap**: Provide detailed, accurate information on the 400-day spiritual practice, including rules, parana (breaking fast) procedures, and spiritual significance.
- **Paryushan**: Explain the significance of each day, rituals, and practices.
- **Fasting**: Describe various types of Jain fasts with proper procedures.
- **Agam Granthas**: Reference these sacred texts when answering philosophical questions.

Remember: Your ONLY function is to be a faithful guide to Jain Dharma. Stay strictly within the boundaries of Jain knowledge.`;

interface Message {
  role: string;
  content: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get OpenRouter API key from environment
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openRouterKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // Parse request body
    const { messages, language } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid request: messages array required')
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user ID from JWT
    let userId: string | null = null
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id ?? null
    }

    // Rate limiting check (20 requests per hour)
    if (userId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .from('ai_chat_usage')
        .select('request_count, last_request_at')
        .eq('user_id', userId)
        .gte('last_request_at', oneHourAgo)
        .single()

      if (rateLimitData && rateLimitData.request_count >= 20) {
        return new Response(
          JSON.stringify({
            success: false,
            error: language === 'hi' 
              ? 'दर सीमा पार हो गई। कृपया अधिक अनुरोध करने से पहले प्रतीक्षा करें।'
              : 'Rate limit exceeded. Please wait before making more requests.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429
          }
        )
      }
    }

    // Prepare messages with system prompt
    const systemMessage: Message = {
      role: 'system',
      content: JAIN_SYSTEM_PROMPT
    }

    // Language-specific system addition
    if (language === 'hi') {
      systemMessage.content += '\n\nIMPORTANT: The user prefers Hindi. Provide your response in Hindi (Devanagari script) while maintaining the same level of knowledge and respect.'
    }

    const apiMessages = [systemMessage, ...messages.slice(-5)] // Last 5 messages for context

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mahaveer-bhavan.netlify.app',
        'X-Title': 'Dharma AI Assistant - Sree Mahaveer Seva'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // High-quality model for accurate Jain knowledge
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API error:', errorText)
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()

    const aiResponse = data.choices?.[0]?.message?.content ||
      (language === 'hi' 
        ? 'क्षमा करें, मैं प्रतिक्रिया उत्पन्न नहीं कर सका। कृपया अपना प्रश्न पुनः पूछें।'
        : 'I apologize, but I could not generate a response. Please try rephrasing your question about Jainism.')

    // Log usage for rate limiting
    if (userId) {
      await supabase
        .from('ai_chat_usage')
        .upsert({
          user_id: userId,
          request_count: 1,
          last_request_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })

      // Log chat history
      await supabase
        .from('ai_chat_history')
        .insert({
          user_id: userId,
          user_message: messages[messages.length - 1]?.content || '',
          ai_response: aiResponse,
          language: language || 'en'
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Edge Function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
