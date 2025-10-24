# Deploy AI Chatbot Edge Function

## Quick Start - Deploy in 2 Minutes

The Edge Function has been created and is ready to deploy. Since you've already uploaded the `OPENROUTER_API_KEY` to Supabase secrets, you just need to deploy the function.

---

## Option 1: Deploy via Supabase CLI (Recommended)

### Step 1: Install Supabase CLI

If not already installed:
```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
npx supabase login
```

This will open a browser window for authentication.

### Step 3: Deploy the Function

```bash
cd mahaveer-bhavan
npx supabase functions deploy jainism-chat --project-ref juvrytwhtivezeqrmtpq
```

**Expected output**:
```
Deploying function jainism-chat...
Function jainism-chat deployed successfully ✓
URL: https://juvrytwhtivezeqrmtpq.supabase.co/functions/v1/jainism-chat
```

### Step 4: Test It

```bash
# Test the deployed function
curl -X POST \
  'https://juvrytwhtivezeqrmtpq.supabase.co/functions/v1/jainism-chat' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [{"role": "user", "content": "What is Ahimsa?"}],
    "language": "en"
  }'
```

---

## Option 2: Deploy via Supabase Dashboard

### Step 1: Open Edge Functions

1. Go to: https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/functions
2. Click: **"Create a new function"**

### Step 2: Create Function

1. **Function name**: `jainism-chat`
2. Click: **"Create function"**

### Step 3: Add Code

Copy the code from these files:

**Main function** (`supabase/functions/jainism-chat/index.ts`):
```typescript
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('OPENROUTER_API_KEY')

    if (!apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    const { messages, language }: ChatRequest = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = \`You are a knowledgeable guide on Jainism and Varatisap.

Key topics: Ahimsa, Anekantavada, Aparigraha, meditation, fasting, festivals.
Respond in \${language === 'hi' ? 'Hindi' : 'English'}.
Keep responses concise (2-3 paragraphs).\`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`,
        'HTTP-Referer': req.headers.get('origin') || 'https://mahaveer-bhavan.netlify.app',
        'X-Title': 'Mahaveer Bhavan AI Guide'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-5)
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error('Failed to get AI response')
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content || 'Could not generate response'

    return new Response(
      JSON.stringify({ response: aiResponse, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**CORS headers** (`_shared/cors.ts`):
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Step 4: Deploy

1. Click: **"Deploy"**
2. Wait for deployment to complete
3. Note the function URL

---

## Verify Deployment

### Check Function Status

```bash
npx supabase functions list --project-ref juvrytwhtivezeqrmtpq
```

### Check Logs

```bash
npx supabase functions logs jainism-chat --project-ref juvrytwhtivezeqrmtpq
```

---

## Test the Chatbot in the App

### 1. Local Development

```bash
# Start dev server
npm run dev

# Open: http://localhost:8080
# Login as member
# Click sparkle button (bottom right)
# Ask: "What is Ahimsa in Jainism?"
```

### 2. Production (Netlify)

After pushing to GitHub (Netlify auto-deploys):
1. Visit your live site
2. Login
3. Click sparkle button
4. Test chatbot

---

## Troubleshooting

### Error: "OpenRouter API key not configured"

The Edge Function can't find the secret.

**Fix**:
```bash
# Check secrets
npx supabase secrets list --project-ref juvrytwhtivezeqrmtpq

# Should show:
# OPENROUTER_API_KEY: ***********

# If missing, set it:
npx supabase secrets set OPENROUTER_API_KEY=your-key --project-ref juvrytwhtivezeqrmtpq
```

### Error: "Failed to get AI response"

Network or API issue.

**Fix**:
```bash
# Check function logs
npx supabase functions logs jainism-chat --project-ref juvrytwhtivezeqrmtpq

# Look for error details
# Redeploy if needed:
npx supabase functions deploy jainism-chat --project-ref juvrytwhtivezeqrmtpq
```

### Error: "Access token not provided"

Not logged in to Supabase CLI.

**Fix**:
```bash
npx supabase login
# Follow browser authentication
```

### CORS Errors in Browser

Headers not configured properly.

**Fix**: Ensure `_shared/cors.ts` exists with correct headers (see code above).

---

## Update Existing Function

If you need to update the function code:

```bash
# Edit code in supabase/functions/jainism-chat/index.ts
# Then redeploy:
npx supabase functions deploy jainism-chat --project-ref juvrytwhtivezeqrmtpq
```

---

## Monitoring

### View Invocations

```bash
# Real-time logs
npx supabase functions logs jainism-chat --project-ref juvrytwhtivezeqrmtpq --tail

# Or in dashboard:
# https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/logs/edge-functions
```

### Check Performance

In Supabase Dashboard:
1. Go to: **Functions** → `jainism-chat`
2. View: Invocations, Errors, Response times
3. Monitor: Usage and performance

---

## Summary

✅ Edge Function code created in `supabase/functions/jainism-chat/`
✅ API key already uploaded to Supabase secrets
✅ Frontend updated to call Edge Function
✅ Ready to deploy

**Next Steps**:
1. Run: `npx supabase login`
2. Run: `npx supabase functions deploy jainism-chat --project-ref juvrytwhtivezeqrmtpq`
3. Test in your app
4. Done! 🎉

The chatbot will work securely without exposing the API key.
