const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require'
});
client.connect()
  .then(() => client.query('SELECT count(*), min(height_cm), max(height_cm) FROM profiles'))
  .then(res => console.log('Agg:', res.rows))
  .then(() => client.query('SELECT count(*) FROM profiles WHERE height_cm >= 165 AND height_cm <= 173'))
  .then(res => console.log('165-173:', res.rows))
  .then(() => client.query('SELECT height_cm FROM profiles LIMIT 10'))
  .then(res => console.log('Sample:', res.rows))
  .catch(console.error)
  .finally(() => client.end());
