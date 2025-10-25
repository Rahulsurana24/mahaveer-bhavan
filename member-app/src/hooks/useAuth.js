import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase/client';

/**
 * Authentication hook for member app
 * Manages user authentication state and operations
 *
 * @returns {Object} Authentication state and methods
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  // Load user profile data
  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('auth_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadProfile(session.user.id);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  /**
   * Sign up a new user with member data
   * @param {string} email
   * @param {string} password
   * @param {Object} memberData - Member registration data
   */
  const register = async (email, password, memberData) => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            full_name: memberData?.full_name || email
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        return { error: authError };
      }

      // Wait for trigger to create basic entries
      if (authData.user && memberData) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update user_profiles
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            full_name: memberData.full_name,
            first_name: memberData.first_name,
            middle_name: memberData.middle_name,
            last_name: memberData.last_name,
            phone: memberData.phone,
            date_of_birth: memberData.date_of_birth,
            gender: memberData.gender,
            address: memberData.address,
            street_address: memberData.street_address,
            city: memberData.city,
            state: memberData.state,
            postal_code: memberData.postal_code,
            country: memberData.country,
            emergency_contact: memberData.emergency_contact,
            photo_url: memberData.photo_url
          })
          .eq('auth_id', authData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        // Update members
        const { error: memberError } = await supabase
          .from('members')
          .update({
            full_name: memberData.full_name,
            first_name: memberData.first_name,
            middle_name: memberData.middle_name,
            last_name: memberData.last_name,
            phone: memberData.phone,
            date_of_birth: memberData.date_of_birth,
            gender: memberData.gender,
            address: memberData.address,
            street_address: memberData.street_address,
            city: memberData.city,
            state: memberData.state,
            postal_code: memberData.postal_code,
            country: memberData.country,
            emergency_contact: memberData.emergency_contact,
            membership_type: memberData.membership_type || 'standard',
            photo_url: memberData.photo_url
          })
          .eq('auth_id', authData.user.id);

        if (memberError) {
          console.error('Member update error:', memberError);
        }
      }

      return { error: null, data: authData };
    } catch (error) {
      console.error('Registration error:', error);
      return { error };
    }
  };

  /**
   * Sign in with email and password
   * @param {string} email
   * @param {string} password
   */
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      console.log('Sign in successful');
      return { error: null, data };
    } catch (error) {
      console.error('Login error:', error);
      return { error };
    }
  };

  /**
   * Sign out current user
   */
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local state
      setUser(null);
      setSession(null);
      setProfile(null);

      return { error: null };
    } catch (error) {
      console.error('Logout error:', error);
      return { error };
    }
  };

  /**
   * Send password reset email
   * @param {string} email
   */
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'mahaverbhavan://reset-password' // Deep link for mobile
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error };
    }
  };

  /**
   * Update password (for force password change or reset)
   * @param {string} newPassword
   */
  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Clear force_password_change flag if it exists
      if (profile?.force_password_change) {
        await supabase
          .from('user_profiles')
          .update({ force_password_change: false })
          .eq('auth_id', user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('Update password error:', error);
      return { error };
    }
  };

  /**
   * Update user profile
   * @param {Object} updates - Profile fields to update
   */
  const updateProfile = async (updates) => {
    try {
      const { error } = await supabase
        .from('members')
        .update(updates)
        .eq('auth_id', user.id);

      if (error) throw error;

      // Reload profile
      await loadProfile(user.id);

      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error };
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
  };
};
