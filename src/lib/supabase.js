import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Fail loudly during development so a missing .env is obvious.
  throw new Error(
    'Missing Supabase config. Set REACT_APP_SUPABASE_URL and ' +
      'REACT_APP_SUPABASE_ANON_KEY in your .env (see .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
