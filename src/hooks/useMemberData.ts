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

        // Fetch from members table using auth_id
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (memberError) throw memberError;

        if (memberData) {
          setMember({
            id: memberData.id,
            full_name: memberData.full_name || user.email || '',
            email: memberData.email || user.email || '',
            phone: memberData.phone || '',
            membership_type: memberData.membership_type || 'member',
            photo_url: memberData.photo_url || '',
            qr_code: memberData.qr_code || null,
            status: memberData.status || 'active',
            created_at: memberData.created_at,
            address: memberData.address || null,
            city: memberData.city || null,
            state: memberData.state || null,
            postal_code: memberData.postal_code || null,
            gender: memberData.gender || null,
            emergency_contact: memberData.emergency_contact || null
          } as MemberData);
        } else {
          setError('Member profile not found');
        }
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