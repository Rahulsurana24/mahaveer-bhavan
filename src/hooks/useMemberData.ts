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

        // Try user_profiles first (this is what gets created by auth trigger)
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*, user_roles(name)')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          // Transform user_profiles data to MemberData format
          setMember({
            id: profileData.id,
            full_name: profileData.full_name || user.email || '',
            email: profileData.email || user.email || '',
            phone: profileData.phone || '',
            membership_type: (profileData as any).user_roles?.name || 'member',
            photo_url: profileData.photo_url || '',
            qr_code: profileData.qr_code || null,
            status: profileData.is_active ? 'active' : 'inactive',
            created_at: profileData.created_at,
            address: profileData.address || null,
            city: profileData.city || null,
            state: profileData.state || null,
            postal_code: profileData.postal_code || null,
            gender: profileData.gender || null,
            emergency_contact: profileData.emergency_contact || null
          } as MemberData);
        } else {
          setError('Profile not found');
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