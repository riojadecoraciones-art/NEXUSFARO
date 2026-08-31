import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wbvlszyxammnccepkkzw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indidmxzenl4YW1tbmNjZXBra3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTg3MDgsImV4cCI6MjEwMjYzNDcwOH0.MdXeGOr01N_VfLolttQ30962QvIoxtkg-jHgAPFJl10';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('store_settings').select('id').limit(1);
    if (error) {
      console.warn('Supabase connection check returned error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
    return false;
  }
};
