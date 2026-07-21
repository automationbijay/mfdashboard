import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://isornzmtlnkukfjpemnh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzb3Juem10bG5rdWtmanBlbW5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI5MzA5MiwiZXhwIjoyMDg0ODY5MDkyfQ.IslXaAazHpD5_4sYLjkHunUdCzat2GrSh5nQwWWP-JE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('view_mf_ask_bid').select('*').limit(1);
  if (error) console.error(error);
  console.log("view_mf_ask_bid:", data);

  const { data: pnl } = await supabase.from('wiki_profit_loss_analysis').select('*').limit(1);
  console.log("wiki_profit_loss_analysis:", pnl);

  const { data: summary } = await supabase.from('view_mf_summary_analytics').select('*').limit(1);
  console.log("view_mf_summary_analytics:", summary);
}

run();
