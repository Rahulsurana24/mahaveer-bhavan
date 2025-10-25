import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import Config from 'react-native-config';

// Production Supabase Configuration
const SUPABASE_URL = Config.SUPABASE_URL || 'https://juvrytwhtivezeqrmtpq.supabase.co';
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJ5dHdodGl2ZXplcXJtdHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwNDkwNzgsImV4cCI6MjA0NTYyNTA3OH0.6LJmXKqY9p2tGQHHZGW0QHQKMqGQYMJQJQMqGQYMJQI';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase credentials not configured. Please check your .env file.');
}

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
