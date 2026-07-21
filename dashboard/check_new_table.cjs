const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.isornzmtlnkukfjpemnh:1gCjRwtWwmjhDMg6@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

client.connect()
  .then(() => client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'raw_marketdepth_nepseapi_new'"))
  .then(res => {
    console.log("--- Schema for raw_marketdepth_nepseapi_new ---");
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
    client.end();
  })
  .catch(err => console.error(err));
