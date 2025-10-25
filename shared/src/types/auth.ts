export interface User {
  id: string;
  email: string;
  role: 'member' | 'admin' | 'super_admin' | 'partial_admin' | 'view_only';
  force_password_change?: boolean;
  created_at: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AdminRole {
  id: string;
  user_id: string;
  role: 'admin' | 'super_admin' | 'partial_admin' | 'view_only';
  permissions: AdminPermissions;
  created_at: string;
  updated_at: string;
}

export interface AdminPermissions {
  member_management?: boolean;
  event_management?: boolean;
  financial_management?: boolean;
  gallery_moderation?: boolean;
  system_settings?: boolean;
  user_management?: boolean;
  [key: string]: boolean | undefined;
}
