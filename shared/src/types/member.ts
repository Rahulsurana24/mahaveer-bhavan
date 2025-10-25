export interface Member {
  id: string;
  member_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  membership_type: 'standard' | 'family' | 'premium' | 'life';
  photo_url?: string;
  date_of_birth?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relation: string;
  };
  created_at: string;
  updated_at: string;
}

export interface MemberProfile extends Member {
  total_donations?: number;
  events_attended?: number;
  trips_attended?: number;
}
