const postgres = require('postgres');
const sql = postgres('postgresql://postgres:Wewin2026@ashtalakshmi-db.c3qscc4my51a.ap-south-1.rds.amazonaws.com:5432/ashtalakshmi?sslmode=require');
sql`SELECT gender, count(*) FROM profiles WHERE height_cm >= 165 AND height_cm <= 173 GROUP BY gender`.then(console.log).finally(() => sql.end());
