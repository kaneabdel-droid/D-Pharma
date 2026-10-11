import pg from 'pg';
const { Client } = pg;

async function testConnection() {
  const hosts = [
    'db.tgnqcqfynkvmocxqdxyc.supabase.co',
    'aws-0-eu-west-1.pooler.supabase.com'
  ];

  for (const host of hosts) {
    console.log('Testing host:', host);
    const connectionString = host.includes('pooler')
      ? 'postgresql://postgres.tgnqcqfynkvmocxqdxyc:Kanor%40e2026@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
      : 'postgresql://postgres:Kanor%40e2026@db.tgnqcqfynkvmocxqdxyc.supabase.co:5432/postgres';

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      console.log('Connected successfully to:', host);
      const res = await client.query('SELECT current_database(), current_user;');
      console.log('Result:', res.rows);
      await client.end();
      return connectionString;
    } catch (e) {
      console.error('Failed on', host, e.message);
      try { await client.end(); } catch {}
    }
  }
}

testConnection().catch(console.error);
