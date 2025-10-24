// Supabase Edge Function for Jainism AI Chatbot
// This securely handles OpenRouter API calls without exposing the API key to clients

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  language: 'en' | 'hi';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get OpenRouter API key from Supabase secrets
    const apiKey = Deno.env.get('OPENROUTER_API_KEY')

    if (!apiKey) {
      throw new Error('OpenRouter API key not configured in Edge Function secrets')
    }

    // Parse request body
    const { messages, language }: ChatRequest = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare system prompt based on language
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
Keep responses concise (2-3 paragraphs max).`

    // Prepare messages for OpenRouter
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-5) // Only send last 5 messages for context
    ]

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': req.headers.get('origin') || 'https://mahaveer-bhavan.netlify.app',
        'X-Title': 'Mahaveer Bhavan AI Guide'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenRouter API error:', errorData)
      throw new Error(errorData.error?.message || 'Failed to get AI response')
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.'

    // Return successful response
    return new Response(
      JSON.stringify({
        response: aiResponse,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge Function error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
