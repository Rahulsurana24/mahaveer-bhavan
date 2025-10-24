# Apply Enhanced Messaging & AI Chatbot Features

This guide explains how to set up the enhanced messaging system and AI chatbot for Jainism knowledge.

---

## Part 1: Database Migration

### Migration File
`supabase/migrations/20251024073000_enhanced_messaging.sql`

### What This Creates

**Tables:**
1. **messages** - Enhanced message storage with read receipts
2. **call_history** - Voice/video call tracking
3. **user_notifications** - System-wide notifications
4. **typing_indicators** - Real-time typing status
5. **message_suggestions** - AI-powered chat suggestions

**Features:**
- Auto-notification creation on new messages/calls
- Message read receipts (single/double check)
- Unread message counts per user
- Smart member suggestions (common events, trips, mutual followers)
- Real-time typing indicators
- Call history with duration tracking

### Apply Migration

**Method 1: Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy contents of `supabase/migrations/20251024073000_enhanced_messaging.sql`
5. Paste and click **Run**
6. Verify no errors

**Method 2: Supabase CLI**

```bash
cd /path/to/mahaveer-bhavan
supabase db push
```

### Verify Migration

```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('messages', 'call_history', 'user_notifications', 'typing_indicators', 'message_suggestions');

-- Should return all 5 tables
```

---

## Part 2: AI Chatbot Setup

### OpenRouter API Key Configuration

The AI chatbot uses OpenRouter API to answer questions about Jainism and Varatisap.

#### Option A: Using Supabase Vault (Recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:

```sql
INSERT INTO vault.secrets (name, secret)
VALUES ('OPENROUTER_API_KEY', 'your-openrouter-api-key-here');
```

3. Get your API key from: https://openrouter.ai/keys

#### Option B: Using Environment Variables

1. Create/update `.env` file:

```env
VITE_OPENROUTER_API_KEY=your-openrouter-api-key-here
```

2. Restart your development server

### Get OpenRouter API Key

1. Visit: https://openrouter.ai
2. Sign up for a free account
3. Go to: https://openrouter.ai/keys
4. Click **Create Key**
5. Copy the key (starts with `sk-...`)
6. Add to Supabase vault or .env file

**Free Tier:**
- Models like `meta-llama/llama-3.1-8b-instruct:free` are free
- No credit card required
- Sufficient for testing and moderate use

---

## Part 3: Features Overview

### Enhanced Messaging

**UI Features:**
- ✅ Instagram-style message interface
- ✅ Real-time message polling (updates every 3s)
- ✅ Read receipts (✓ sent, ✓✓ read)
- ✅ Online status indicators
- ✅ Voice/video call buttons
- ✅ Message search
- ✅ Suggested members to chat with
- ✅ Unread message badges
- ✅ Dark mode optimized

**Smart Suggestions:**
- Members who attended same events
- Members from same trips
- Mutual followers/connections
- Scored by relevance

**Call Features:**
- Voice call button (Phone icon)
- Video call button (Video icon)
- Call history tracking
- Duration recording
- Missed call notifications

**Notifications:**
- New message alerts
- Missed call alerts
- Auto-created via database triggers
- Real-time delivery

### AI Chatbot

**Knowledge Base:**
- Jain philosophy (Ahimsa, Anekantavada, Aparigraha)
- Jain practices (meditation, fasting, prayer)
- Varatisap community traditions
- Jain festivals and celebrations
- Jain dietary practices
- Spiritual guidance

**Features:**
- ✅ Floating chat button (bottom-right)
- ✅ Minimize/maximize
- ✅ Conversation history
- ✅ Bilingual support (English/Hindi)
- ✅ 3D card effects
- ✅ Typing indicator
- ✅ Message timestamps
- ✅ Context-aware responses

**UI:**
- Always accessible (every page)
- Premium gradient design
- Smooth animations
- Mobile responsive

---

## Part 4: Testing

### Test Enhanced Messaging

1. **Login as User A**
2. Go to **Messages** page
3. Check **Suggested Members** section
4. Click a suggested member
5. Type and send a message
6. Check for ✓ (sent) icon

7. **Login as User B** (in another browser/incognito)
8. Check for notification
9. Open message from User A
10. User A should see ✓✓ (read) icon

11. **Test Calls:**
   - Click Phone icon for voice call
   - Click Video icon for video call
   - Check call history in database

### Test AI Chatbot

1. **See Floating Button**
   - Bottom-right corner
   - Orange gradient with sparkle icon
   - Green online indicator

2. **Open Chat**
   - Click button
   - Chat window appears

3. **Ask Questions:**
   - "What is Ahimsa in Jainism?"
   - "Tell me about Jain dietary practices"
   - "What is Varatisap?"
   - "Explain Anekantavada"

4. **Test Language:**
   - Switch app to Hindi
   - Ask question
   - Should respond in Hindi

5. **Test Features:**
   - Minimize/maximize
   - Close and reopen (conversation should persist during session)
   - Multiple questions in a row

---

## Part 5: Troubleshooting

### Messaging Issues

**"Messages not sending"**
- Check database migration applied
- Verify RLS policies are active
- Check browser console for errors

**"Read receipts not working"**
- Ensure messages table has `is_read` and `read_at` columns
- Check triggers are created
- Verify both users are logged in

**"Suggestions not showing"**
- Run: `SELECT generate_message_suggestions('user-id-here');`
- Check if user has event registrations or followers
- May be empty for new users

### AI Chatbot Issues

**"AI button not showing"**
- Verify JainismChatbot is added to App.tsx
- Check browser console for errors
- Ensure component is imported correctly

**"API key error"**
- Verify OpenRouter API key is set
- Check Supabase vault: `SELECT * FROM vault.secrets WHERE name = 'OPENROUTER_API_KEY';`
- Or check .env file has `VITE_OPENROUTER_API_KEY`

**"AI not responding"**
- Check API key is valid
- Verify OpenRouter account has credits/free tier
- Check browser network tab for API errors
- Try free model: `meta-llama/llama-3.1-8b-instruct:free`

**"Responses in wrong language"**
- Clear chatbot conversation (close and reopen)
- Ensure language context is working
- Check language switcher is set correctly

### Database Issues

**"Migration fails"**
- Check if tables already exist
- Drop existing tables if needed (see rollback below)
- Run full migration file, not parts

**"RLS permission denied"**
- Verify user is authenticated
- Check user_profiles has matching auth_id
- Ensure RLS policies are created

---

## Part 6: Rollback (If Needed)

### Remove Messaging Tables

```sql
DROP TABLE IF EXISTS message_suggestions CASCADE;
DROP TABLE IF EXISTS typing_indicators CASCADE;
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS call_history CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS unread_messages_count;
```

⚠️ **Warning**: This deletes all messages, calls, and notifications permanently!

---

## Part 7: Configuration

### Adjust AI Chatbot Behavior

Edit `src/components/ai/JainismChatbot.tsx`:

**Change Model:**
```typescript
model: 'anthropic/claude-3-haiku:free', // Or other models
```

**Change Temperature (creativity):**
```typescript
temperature: 0.7, // 0.0 = focused, 1.0 = creative
```

**Change Max Response Length:**
```typescript
max_tokens: 500, // Increase for longer responses
```

**Modify System Prompt:**
Look for `systemPrompt` variable and customize instructions.

### Adjust Message Polling Interval

Edit `src/pages/MessagingEnhanced.tsx`:

```typescript
refetchInterval: 3000 // Change to 5000 for every 5 seconds
```

---

## Part 8: Production Considerations

### OpenRouter API

**Free Tier Limits:**
- Suitable for testing
- May have rate limits
- Consider upgrading for production

**Paid Tier Benefits:**
- Higher rate limits
- More powerful models
- Better reliability

### Database Optimization

**For High Message Volume:**
- Add more indexes if queries are slow
- Consider partitioning messages table by date
- Archive old messages to separate table

**For Real-time:**
- Consider using Supabase Realtime subscriptions
- Implement WebSocket connections
- Reduce polling interval for better UX

### Security

**API Key Protection:**
- Never commit API keys to git
- Use Supabase vault in production
- Rotate keys regularly

**Message Privacy:**
- RLS policies are active by default
- Users can only see their own messages
- No direct database access from client

---

## Next Steps

1. ✅ Apply database migration
2. ✅ Set up OpenRouter API key
3. ✅ Test messaging with 2 users
4. ✅ Test AI chatbot questions
5. ✅ Test call buttons
6. ✅ Check notifications work
7. ✅ Test suggested members
8. ✅ Verify read receipts

Enjoy your enhanced messaging and AI-powered Jainism guide! 🚀
