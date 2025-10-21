-- ============================================
-- PAYMENT CONFIGURATION SYSTEM
-- ============================================
-- Stores trust's payment details for donations

-- STEP 1: Create payment configuration table
-- ============================================

CREATE TABLE IF NOT EXISTS payment_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text,
  upi_qr_code_url text,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc_code text,
  bank_name text,
  bank_branch text,
  instructions text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(auth_id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(auth_id)
);

COMMENT ON TABLE payment_configuration IS 'Trust payment details displayed to members for donations';
COMMENT ON COLUMN payment_configuration.upi_id IS 'UPI ID for donations (e.g., trust@okicici)';
COMMENT ON COLUMN payment_configuration.upi_qr_code_url IS 'URL to UPI QR code image in Supabase Storage';
COMMENT ON COLUMN payment_configuration.bank_account_name IS 'Name on bank account';
COMMENT ON COLUMN payment_configuration.bank_account_number IS 'Bank account number';
COMMENT ON COLUMN payment_configuration.bank_ifsc_code IS 'IFSC code for bank transfers';
COMMENT ON COLUMN payment_configuration.instructions IS 'Additional instructions for donors';
COMMENT ON COLUMN payment_configuration.is_active IS 'Whether this configuration is currently active';

-- Insert default configuration
INSERT INTO payment_configuration (
  bank_account_name,
  instructions,
  is_active
) VALUES (
  'Sree Mahaveer Swami Charitable Trust',
  'Please send payment confirmation screenshot after donation.',
  true
);

-- STEP 2: Enhance donations table
-- ============================================

ALTER TABLE donations
ADD COLUMN IF NOT EXISTS screenshot_url text,
ADD COLUMN IF NOT EXISTS transaction_reference text,
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES user_profiles(auth_id),
ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES user_profiles(auth_id),
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS certificate_url text,
ADD COLUMN IF NOT EXISTS receipt_number text;

COMMENT ON COLUMN donations.screenshot_url IS 'URL to payment screenshot uploaded by donor';
COMMENT ON COLUMN donations.transaction_reference IS 'UTR number or transaction ID from payment';
COMMENT ON COLUMN donations.verified_at IS 'When donation was verified by admin';
COMMENT ON COLUMN donations.verified_by IS 'Admin who verified the donation';
COMMENT ON COLUMN donations.rejected_at IS 'When donation was rejected';
COMMENT ON COLUMN donations.rejected_by IS 'Admin who rejected the donation';
COMMENT ON COLUMN donations.rejection_reason IS 'Reason for rejection';
COMMENT ON COLUMN donations.certificate_url IS '80G tax exemption certificate URL';
COMMENT ON COLUMN donations.receipt_number IS 'Unique receipt number for verified donations';

-- STEP 3: Create function to verify donation
-- ============================================

CREATE OR REPLACE FUNCTION verify_donation(
  p_donation_id uuid,
  p_verified_by uuid,
  p_receipt_number text DEFAULT NULL,
  p_generate_certificate boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id text;
  v_amount decimal;
BEGIN
  -- Get donation details
  SELECT member_id, amount INTO v_member_id, v_amount
  FROM donations
  WHERE id = p_donation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation % not found', p_donation_id;
  END IF;

  -- Generate receipt number if not provided
  IF p_receipt_number IS NULL THEN
    p_receipt_number := 'RCP-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999)::text, 4, '0');
  END IF;

  -- Update donation status
  UPDATE donations
  SET
    status = 'verified',
    verified_at = now(),
    verified_by = p_verified_by,
    receipt_number = p_receipt_number,
    rejected_at = NULL,
    rejected_by = NULL,
    rejection_reason = NULL
  WHERE id = p_donation_id;

  -- Create notification for member
  INSERT INTO notifications (
    member_id,
    title,
    message,
    type,
    read,
    created_at
  ) VALUES (
    v_member_id,
    'Donation Verified',
    format('Your donation of ₹%s has been verified. Receipt number: %s. Thank you for your generous contribution!', v_amount, p_receipt_number),
    'donation',
    false,
    now()
  );

  RAISE NOTICE 'Donation verified successfully';
END;
$$;

COMMENT ON FUNCTION verify_donation IS 'Verifies a donation and generates receipt';

-- STEP 4: Create function to reject donation
-- ============================================

CREATE OR REPLACE FUNCTION reject_donation(
  p_donation_id uuid,
  p_rejected_by uuid,
  p_rejection_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id text;
  v_amount decimal;
BEGIN
  -- Get donation details
  SELECT member_id, amount INTO v_member_id, v_amount
  FROM donations
  WHERE id = p_donation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation % not found', p_donation_id;
  END IF;

  -- Validate rejection reason
  IF p_rejection_reason IS NULL OR LENGTH(TRIM(p_rejection_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Update donation status
  UPDATE donations
  SET
    status = 'rejected',
    rejected_at = now(),
    rejected_by = p_rejected_by,
    rejection_reason = p_rejection_reason,
    verified_at = NULL,
    verified_by = NULL
  WHERE id = p_donation_id;

  -- Create notification for member
  INSERT INTO notifications (
    member_id,
    title,
    message,
    type,
    read,
    created_at
  ) VALUES (
    v_member_id,
    'Donation Rejected',
    format('Your donation submission of ₹%s could not be verified. Reason: %s. Please contact admin for assistance.', v_amount, p_rejection_reason),
    'donation',
    false,
    now()
  );

  RAISE NOTICE 'Donation rejected';
END;
$$;

COMMENT ON FUNCTION reject_donation IS 'Rejects a donation with reason';

-- STEP 5: Grant permissions
-- ============================================

GRANT SELECT ON payment_configuration TO authenticated;
GRANT ALL ON payment_configuration TO authenticated;
GRANT EXECUTE ON FUNCTION verify_donation TO authenticated;
GRANT EXECUTE ON FUNCTION reject_donation TO authenticated;
