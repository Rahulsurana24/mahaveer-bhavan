-- ============================================
-- SYSTEM LOGS TABLE
-- ============================================
-- Audit trail and system activity logging

-- Create enum for log levels
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_level_type') THEN
        CREATE TYPE log_level_type AS ENUM ('info', 'warning', 'error', 'critical');
    END IF;
END $$;

-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now() NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  level log_level_type DEFAULT 'info',
  entity_type text,
  entity_id text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_entity ON system_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view all logs"
ON system_logs FOR SELECT
USING (is_admin_role(auth.uid()));

CREATE POLICY "System can insert logs"
ON system_logs FOR INSERT
WITH CHECK (true);

-- Create function to log activity
CREATE OR REPLACE FUNCTION log_system_activity(
  p_action text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_level log_level_type DEFAULT 'info',
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO system_logs (
    user_id,
    action,
    details,
    level,
    entity_type,
    entity_id
  ) VALUES (
    auth.uid(),
    p_action,
    p_details,
    p_level,
    p_entity_type,
    p_entity_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_system_activity IS 'Helper function to log system activities';
COMMENT ON TABLE system_logs IS 'System activity and audit logs';

-- Grant permissions
GRANT SELECT ON system_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_system_activity TO authenticated;
