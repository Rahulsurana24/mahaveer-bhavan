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

    console.log(`Member operation: ${operation} by user: ${user.id}`)

    switch (operation) {
      case 'create_member': {
        const body = await req.json()
        const { memberData, profileData } = body

        // Generate member ID
        const { data: generatedId, error: idError } = await supabase
          .rpc('generate_member_id', { membership_type: memberData.membership_type })

        if (idError) throw idError

        // Create member record
        const { data: member, error: memberError } = await supabase
          .from('members')
          .insert({
            id: generatedId,
            auth_id: user.id,
            ...memberData
          })
          .select()
          .single()

        if (memberError) throw memberError

        // Create user profile if provided
        if (profileData) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              auth_id: user.id,
              email: memberData.email,
              full_name: memberData.full_name,
              ...profileData
            })

          if (profileError) throw profileError
        }

        return new Response(
          JSON.stringify({ success: true, member }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_member': {
        const body = await req.json()
        const { memberId, updates } = body

        // Verify user can update this member
        const { data: member, error: checkError } = await supabase
          .from('members')
          .select('auth_id')
          .eq('id', memberId)
          .single()

        if (checkError || member.auth_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized to update this member' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: updatedMember, error: updateError } = await supabase
          .from('members')
          .update(updates)
          .eq('id', memberId)
          .select()
          .single()

        if (updateError) throw updateError

        return new Response(
          JSON.stringify({ success: true, member: updatedMember }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_member_profile': {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select(`
            *,
            user_profiles (*)
          `)
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        return new Response(
          JSON.stringify({ success: true, member }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_member_stats': {
        // Get member statistics
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Get donation count and total
        const { data: donations, error: donationError } = await supabase
          .from('donations')
          .select('amount')
          .eq('member_id', member.id)

        if (donationError) throw donationError

        // Get event registrations count
        const { count: eventCount, error: eventError } = await supabase
          .from('event_registrations')
          .select('*', { count: 'exact' })
          .eq('member_id', member.id)

        if (eventError) throw eventError

        // Get unread notifications count
        const { count: notificationCount, error: notificationError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact' })
          .eq('member_id', member.id)
          .eq('is_read', false)

        if (notificationError) throw notificationError

        const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount), 0)

        return new Response(
          JSON.stringify({
            success: true,
            stats: {
              totalDonations,
              donationCount: donations.length,
              eventRegistrations: eventCount || 0,
              unreadNotifications: notificationCount || 0
            }
          }),
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
    console.error('Member operation error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})