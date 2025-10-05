import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface MemberData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  membership_type: string;
  photo_url: string;
  qr_code: string | null;
  status: string;
  created_at: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  gender: string | null;
  emergency_contact: any;
}

export const useMemberData = () => {
  const { user } = useAuth();
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMember(null);
      setLoading(false);
      return;
    }

    const fetchMemberData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('members')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        setMember(data);
      } catch (err: any) {
        console.error('Error fetching member data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [user]);

  return { member, loading, error };
};