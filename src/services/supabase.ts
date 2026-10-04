import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://xzjijjrtjbnryvsvrflx.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_T6IL2nNOQkHIasXJ5qd1Ew_OewPGQHk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
