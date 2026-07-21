import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://isornzmtlnkukfjpemnh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzb3Juem10bG5rdWtmanBlbW5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI5MzA5MiwiZXhwIjoyMDg0ODY5MDkyfQ.IslXaAazHpD5_4sYLjkHunUdCzat2GrSh5nQwWWP-JE');
supabase.from('wiki_average').select('*').limit(1).then(console.log);
