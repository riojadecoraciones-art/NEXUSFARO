import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las credenciales de Supabase. Copiá .env.example a .env.local y completá ' +
      'VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY con los datos de tu proyecto ' +
      '(Supabase → Project Settings → API).'
  );
}

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
