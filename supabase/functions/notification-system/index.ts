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

    console.log(`Notification operation: ${operation} by user: ${user.id}`)

    switch (operation) {
      case 'get_notifications': {
        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        const limit = parseInt(urlObj.searchParams.get('limit') || '20')
        const offset = parseInt(urlObj.searchParams.get('offset') || '0')

        // Get notifications for the member
        const { data: notifications, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (notificationsError) throw notificationsError

        // Get unread count
        const { count: unreadCount, error: countError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact' })
          .eq('member_id', member.id)
          .eq('is_read', false)

        if (countError) throw countError

        return new Response(
          JSON.stringify({ 
            success: true, 
            notifications,
            unreadCount: unreadCount || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'mark_as_read': {
        const body = await req.json()
        const { notificationIds } = body

        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Mark notifications as read
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', notificationIds)
          .eq('member_id', member.id)

        if (updateError) throw updateError

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'mark_all_as_read': {
        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Mark all notifications as read
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('member_id', member.id)
          .eq('is_read', false)

        if (updateError) throw updateError

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create_notification': {
        const body = await req.json()
        const { memberId, type, title, content, metadata } = body

        // Create notification
        const { data: notification, error: notificationError } = await supabase
          .from('notifications')
          .insert({
            member_id: memberId,
            type: type,
            title: title,
            content: content,
            metadata: metadata || {}
          })
          .select()
          .single()

        if (notificationError) throw notificationError

        return new Response(
          JSON.stringify({ success: true, notification }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'bulk_notify': {
        const body = await req.json()
        const { memberIds, type, title, content, metadata } = body

        // Create notifications for multiple members
        const notifications = memberIds.map((memberId: string) => ({
          member_id: memberId,
          type: type,
          title: title,
          content: content,
          metadata: metadata || {}
        }))

        const { data: createdNotifications, error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications)
          .select()

        if (notificationError) throw notificationError

        return new Response(
          JSON.stringify({ 
            success: true, 
            notifications: createdNotifications,
            count: createdNotifications.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete_notification': {
        const body = await req.json()
        const { notificationId } = body

        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Delete notification (only if it belongs to the user)
        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId)
          .eq('member_id', member.id)

        if (deleteError) throw deleteError

        return new Response(
          JSON.stringify({ success: true }),
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
    console.error('Notification operation error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})