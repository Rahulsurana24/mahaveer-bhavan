import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// TODO: Move these to environment variables
const SUPABASE_URL = 'https://juvrytwhtivezeqrmtpq.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here'; // Replace with actual key

/**
 * Supabase client configured for React Native
 * Uses AsyncStorage instead of localStorage for session persistence
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});
