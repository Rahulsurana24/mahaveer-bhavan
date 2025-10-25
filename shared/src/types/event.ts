export interface Event {
  id: string;
  title: string;
  description: string;
  event_type: 'event' | 'trip' | 'pilgrimage' | 'workshop' | 'celebration';
  start_date: string;
  end_date?: string;
  location: string;
  capacity: number;
  registered_count: number;
  pricing_tiers?: PricingTier[];
  image_url?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
  deadline?: string;
  description?: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  member_id: string;
  pricing_tier_id?: string;
  amount_paid: number;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  special_comments?: string;
  registered_at: string;
}
