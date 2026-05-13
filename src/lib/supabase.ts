import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project-url.supabase.co') {
  console.error('ERROR: Credenciales de Supabase no configuradas. Por favor, configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el panel de Secrets.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
