const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.isornzmtlnkukfjpemnh:1gCjRwtWwmjhDMg6@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

client.connect()
  .then(() => client.query("SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public'"))
  .then(res => {
    console.log(res.rows);
    client.end();
  })
  .catch(err => console.error(err));
