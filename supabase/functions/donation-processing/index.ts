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

    console.log(`Donation operation: ${operation} by user: ${user.id}`)

    switch (operation) {
      case 'create_donation': {
        const body = await req.json()
        const { amount, payment_method, notes } = body

        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Generate receipt number
        const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        // Create donation record
        const { data: donation, error: donationError } = await supabase
          .from('donations')
          .insert({
            member_id: member.id,
            amount: amount,
            payment_method: payment_method,
            notes: notes,
            receipt_number: receiptNumber,
            payment_status: 'pending'
          })
          .select()
          .single()

        if (donationError) throw donationError

        // Create notification
        await supabase
          .from('notifications')
          .insert({
            member_id: member.id,
            type: 'donation',
            title: 'Donation Received',
            content: `Thank you for your donation of ₹${amount}. Receipt: ${receiptNumber}`
          })

        return new Response(
          JSON.stringify({ 
            success: true, 
            donation,
            paymentUrl: `https://example-payment-gateway.com/pay/${donation.id}` // Mock payment URL
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_payment_status': {
        const body = await req.json()
        const { donationId, status, transactionId } = body

        // Update donation status
        const { data: donation, error: updateError } = await supabase
          .from('donations')
          .update({
            payment_status: status,
            transaction_id: transactionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', donationId)
          .select()
          .single()

        if (updateError) throw updateError

        // Create notification if payment successful
        if (status === 'completed') {
          await supabase
            .from('notifications')
            .insert({
              member_id: donation.member_id,
              type: 'donation',
              title: 'Payment Confirmed',
              content: `Your donation payment has been successfully processed. Transaction ID: ${transactionId}`
            })
        }

        return new Response(
          JSON.stringify({ success: true, donation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_donation_history': {
        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Get donation history
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select('*')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false })

        if (donationsError) throw donationsError

        return new Response(
          JSON.stringify({ success: true, donations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_donation_summary': {
        // Get member ID
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (memberError) throw memberError

        // Get donation statistics
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select('amount, payment_status, created_at')
          .eq('member_id', member.id)

        if (donationsError) throw donationsError

        const totalDonated = donations
          .filter(d => d.payment_status === 'completed')
          .reduce((sum, d) => sum + Number(d.amount), 0)

        const totalCount = donations.filter(d => d.payment_status === 'completed').length
        const pendingAmount = donations
          .filter(d => d.payment_status === 'pending')
          .reduce((sum, d) => sum + Number(d.amount), 0)

        return new Response(
          JSON.stringify({ 
            success: true, 
            summary: {
              totalDonated,
              totalCount,
              pendingAmount,
              lastDonation: donations[0]?.created_at || null
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
    console.error('Donation operation error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})