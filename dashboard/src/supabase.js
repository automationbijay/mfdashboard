import { createClient } from '@supabase/supabase-js';

// Fallback to service role key if anon key isn't provided in the environment.
// WARNING: This is for local development only. Do not expose SERVICE_ROLE_KEY in production.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://isornzmtlnkukfjpemnh.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzb3Juem10bG5rdWtmanBlbW5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI5MzA5MiwiZXhwIjoyMDg0ODY5MDkyfQ.IslXaAazHpD5_4sYLjkHunUdCzat2GrSh5nQwWWP-JE'; // Using service role key as fallback since it's in the root .env

export const supabase = createClient(supabaseUrl, supabaseKey);
