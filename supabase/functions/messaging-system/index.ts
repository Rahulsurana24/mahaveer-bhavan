import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authorization.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { method, url } = req
    const urlObj = new URL(url)
    const operation = urlObj.searchParams.get('operation')

    console.log(`Messaging operation: ${operation} by user: ${user.id}`)

    switch (operation) {
      case 'send_message': {
        const body = await req.json()
        const { receiverId, content } = body

        // Get sender member ID
        const { data: senderMember, error: senderError } = await supabase
          .from('members')
          .select('id, full_name')
          .eq('auth_id', user.id)
          .single()

        if (senderError) throw senderError

        // Validate receiver exists
        const { data: receiverMember, error: receiverError } = await supabase
          .from('members')
          .select('id, full_name')
          .eq('id', receiverId)
          .single()

        if (receiverError) {
          return new Response(
            JSON.stringify({ error: 'Receiver not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create message
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: senderMember.id,
            receiver_id: receiverId,
            content: content
          })
          .select()
          .single()

        if (messageError) throw messageError

        // Create notification for receiver
        await supabase
          .from('notifications')
          .insert({
            member_id: receiverId,
            type: 'message',
            title: 'New Message',
            content: `You received a new message from ${senderMember.full_name || 'a member'}`
          })

        return new Response(
          JSON.stringify({ success: true, message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_conversations': {
        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Get conversations (unique users the member has messaged with)
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id(id, full_name, photo_url),
            receiver:receiver_id(id, full_name, photo_url)
          `)
          .or(`sender_id.eq.${member.id},receiver_id.eq.${member.id}`)
          .order('created_at', { ascending: false })

        if (messagesError) throw messagesError

        // Group messages by conversation partner
        const conversationsMap = new Map()
        
        messages.forEach(message => {
          const isFromMe = message.sender_id === member.id
          const partnerId = isFromMe ? message.receiver_id : message.sender_id
          const partner = isFromMe ? message.receiver : message.sender
          
          if (!conversationsMap.has(partnerId)) {
            conversationsMap.set(partnerId, {
              partnerId,
              partner,
              lastMessage: message,
              unreadCount: 0
            })
          }
          
          // Count unread messages (messages where current user is receiver and is_read is false)
          if (!isFromMe && !message.is_read) {
            conversationsMap.get(partnerId).unreadCount++
          }
        })

        const conversations = Array.from(conversationsMap.values())

        return new Response(
          JSON.stringify({ success: true, conversations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_messages': {
        const partnerId = urlObj.searchParams.get('partnerId')
        if (!partnerId) {
          return new Response(
            JSON.stringify({ error: 'Partner ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Get messages between the two members
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id(id, full_name, photo_url),
            receiver:receiver_id(id, full_name, photo_url)
          `)
          .or(`and(sender_id.eq.${member.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${member.id})`)
          .order('created_at', { ascending: true })

        if (messagesError) throw messagesError

        // Mark messages as read
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('sender_id', partnerId)
          .eq('receiver_id', member.id)
          .eq('is_read', false)

        return new Response(
          JSON.stringify({ success: true, messages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'mark_as_read': {
        const body = await req.json()
        const { messageIds } = body

        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Mark messages as read (only if current user is the receiver)
        const { error: updateError } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', messageIds)
          .eq('receiver_id', member.id)

        if (updateError) throw updateError

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_member_list': {
        // Get all members for potential messaging (excluding current user)
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, full_name, photo_url, membership_type')
          .neq('id', member.id)
          .eq('status', 'active')
          .order('full_name', { ascending: true })

        if (membersError) throw membersError

        return new Response(
          JSON.stringify({ success: true, members }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Messaging operation error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})