-- ============================================
-- MEMBER APPROVAL SYSTEM
-- ============================================
-- Adds columns and triggers for member approval workflow
--
-- Features:
-- - pending_approval and rejected status values
-- - Approval/rejection tracking (who, when, why)
-- - Automatic notification creation on status change

-- STEP 1: Add approval tracking columns
-- ============================================

ALTER TABLE members
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES user_profiles(auth_id),
ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES user_profiles(auth_id),
ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN members.approved_at IS 'Timestamp when member was approved';
COMMENT ON COLUMN members.approved_by IS 'Admin who approved the member';
COMMENT ON COLUMN members.rejected_at IS 'Timestamp when member was rejected';
COMMENT ON COLUMN members.rejected_by IS 'Admin who rejected the member';
COMMENT ON COLUMN members.rejection_reason IS 'Reason for rejection shown to member';

-- STEP 2: Create function to handle member approval
-- ============================================

CREATE OR REPLACE FUNCTION approve_member(
  p_member_id text,
  p_approved_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_name text;
  v_member_auth_id uuid;
BEGIN
  -- Get member details
  SELECT full_name, auth_id INTO v_member_name, v_member_auth_id
  FROM members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member % not found', p_member_id;
  END IF;

  -- Update member status to active
  UPDATE members
  SET
    status = 'active',
    approved_at = now(),
    approved_by = p_approved_by,
    rejected_at = NULL,
    rejected_by = NULL,
    rejection_reason = NULL
  WHERE id = p_member_id;

  -- Create notification for member
  INSERT INTO notifications (
    member_id,
    title,
    message,
    type,
    read,
    created_at
  ) VALUES (
    p_member_id,
    'Account Approved',
    'Your membership has been approved. You can now access all features.',
    'account',
    false,
    now()
  );

  RAISE NOTICE 'Member % approved successfully', v_member_name;
END;
$$;

COMMENT ON FUNCTION approve_member IS 'Approves a pending member and sends notification';

-- STEP 3: Create function to handle member rejection
-- ============================================

CREATE OR REPLACE FUNCTION reject_member(
  p_member_id text,
  p_rejected_by uuid,
  p_rejection_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_name text;
  v_member_auth_id uuid;
BEGIN
  -- Get member details
  SELECT full_name, auth_id INTO v_member_name, v_member_auth_id
  FROM members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member % not found', p_member_id;
  END IF;

  -- Validate rejection reason
  IF p_rejection_reason IS NULL OR LENGTH(TRIM(p_rejection_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Update member status to rejected
  UPDATE members
  SET
    status = 'rejected',
    rejected_at = now(),
    rejected_by = p_rejected_by,
    rejection_reason = p_rejection_reason,
    approved_at = NULL,
    approved_by = NULL
  WHERE id = p_member_id;

  -- Create notification for member
  INSERT INTO notifications (
    member_id,
    title,
    message,
    type,
    read,
    created_at
  ) VALUES (
    p_member_id,
    'Account Rejected',
    format('Your membership application was not approved. Reason: %s. Contact admin for details.', p_rejection_reason),
    'account',
    false,
    now()
  );

  RAISE NOTICE 'Member % rejected', v_member_name;
END;
$$;

COMMENT ON FUNCTION reject_member IS 'Rejects a pending member with reason and sends notification';

-- STEP 4: Create view for pending approvals count
-- ============================================

CREATE OR REPLACE VIEW pending_approvals_count AS
SELECT COUNT(*) as count
FROM members
WHERE status = 'pending_approval';

COMMENT ON VIEW pending_approvals_count IS 'Quick count of members awaiting approval for dashboard badges';

-- STEP 5: Grant necessary permissions
-- ============================================

GRANT SELECT ON pending_approvals_count TO authenticated;
GRANT EXECUTE ON FUNCTION approve_member TO authenticated;
GRANT EXECUTE ON FUNCTION reject_member TO authenticated;
