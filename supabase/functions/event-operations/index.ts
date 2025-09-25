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

    console.log(`Event operation: ${operation} by user: ${user.id}`)

    switch (operation) {
      case 'register_for_event': {
        const body = await req.json()
        const { eventId } = body

        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Check if event exists and has capacity
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('capacity')
          .eq('id', eventId)
          .single()

        if (eventError) throw eventError

        // Check current registrations
        const { count: currentRegistrations, error: countError } = await supabase
          .from('event_registrations')
          .select('*', { count: 'exact' })
          .eq('event_id', eventId)
          .eq('status', 'registered')

        if (countError) throw countError

        if (event.capacity && (currentRegistrations || 0) >= event.capacity) {
          return new Response(
            JSON.stringify({ error: 'Event is at full capacity' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if already registered
        const { data: existingRegistration, error: existingError } = await supabase
          .from('event_registrations')
          .select('id')
          .eq('event_id', eventId)
          .eq('member_id', member.id)
          .maybeSingle()

        if (existingError) throw existingError

        if (existingRegistration) {
          return new Response(
            JSON.stringify({ error: 'Already registered for this event' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create registration
        const { data: registration, error: regError } = await supabase
          .from('event_registrations')
          .insert({
            event_id: eventId,
            member_id: member.id,
            status: 'registered'
          })
          .select()
          .single()

        if (regError) throw regError

        // Create notification
        await supabase
          .from('notifications')
          .insert({
            member_id: member.id,
            type: 'event_registration',
            title: 'Event Registration Confirmed',
            content: 'You have successfully registered for the event.'
          })

        return new Response(
          JSON.stringify({ success: true, registration }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'cancel_registration': {
        const body = await req.json()
        const { registrationId } = body

        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Update registration status
        const { data: registration, error: updateError } = await supabase
          .from('event_registrations')
          .update({ status: 'cancelled' })
          .eq('id', registrationId)
          .eq('member_id', member.id)
          .select()
          .single()

        if (updateError) throw updateError

        return new Response(
          JSON.stringify({ success: true, registration }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_my_registrations': {
        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Get registrations with event details
        const { data: registrations, error: regError } = await supabase
          .from('event_registrations')
          .select(`
            *,
            events (
              id,
              title,
              description,
              date,
              time,
              location,
              image_url
            )
          `)
          .eq('member_id', member.id)
          .order('registered_at', { ascending: false })

        if (regError) throw regError

        return new Response(
          JSON.stringify({ success: true, registrations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_upcoming_events': {
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('is_published', true)
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })

        if (eventsError) throw eventsError

        return new Response(
          JSON.stringify({ success: true, events }),
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
    console.error('Event operation error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})