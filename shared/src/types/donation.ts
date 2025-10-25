export interface Donation {
  id: string;
  member_id: string;
  amount: number;
  purpose?: string;
  payment_method: 'cash' | 'card' | 'upi' | 'netbanking';
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  receipt_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DonationSummary {
  total_amount: number;
  total_donations: number;
  monthly_total: number;
  yearly_total: number;
}
