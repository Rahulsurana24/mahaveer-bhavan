import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, memberData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, memberData?: any) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: memberData?.full_name || email
          }
        }
      });
      
      if (authError) {
        console.error('Auth signup error:', authError);
        return { error: authError };
      }

      // If user was created and we have memberData, update the user_profiles
      if (authData.user && memberData) {
        // Wait a bit for the trigger to create the basic profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now update the profile with additional member data
        const { error: updateError } = await supabase
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
            emergency_contact: memberData.emergency_contact
          })
          .eq('auth_id', authData.user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          // Don't fail signup if profile update fails, just log it
        }
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Signup catch error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      });
      
      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }
      
      console.log('Sign in successful:', data);
      return { error: null };
    } catch (error) {
      console.error('Sign in catch error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};