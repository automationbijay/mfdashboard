const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.isornzmtlnkukfjpemnh:1gCjRwtWwmjhDMg6@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  const tables = ['view_mf_ask_bid', 'wiki_profit_loss_analysis', 'view_mf_summary_analytics'];
  
  for (const table of tables) {
    console.log(`\n--- Schema for ${table} ---`);
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1;
    `, [table]);
    
    if (res.rows.length === 0) {
       console.log(`No columns found or table doesn't exist.`);
    }
    for (const row of res.rows) {
      console.log(`${row.column_name}: ${row.data_type}`);
    }
  }
  
  await client.end();
}

run().catch(console.error);
