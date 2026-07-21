const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.isornzmtlnkukfjpemnh:1gCjRwtWwmjhDMg6@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

client.connect()
  .then(() => client.query("SELECT * FROM raw_marketdepth_nepseapi_new LIMIT 1"))
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    client.end();
  })
  .catch(err => console.error(err));
