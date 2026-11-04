import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gswxpkphoerdfnwflikq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eY0yEHT0rkXLYSQw9WyeVw_bnxPm2FN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
