require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS public.topic_settings (
  topic TEXT PRIMARY KEY,
  image_url TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.topic_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view topic settings' AND tablename = 'topic_settings') THEN
    CREATE POLICY "Anyone can view topic settings"
      ON public.topic_settings FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage topic settings' AND tablename = 'topic_settings') THEN
    CREATE POLICY "Admins can manage topic settings"
      ON public.topic_settings FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;
`;

async function main() {
  // Try direct connection
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ref = url.replace('https://', '').replace('.supabase.co', '');
  
  // Try multiple connection approaches
  const configs = [
    {
      name: 'Direct connection (port 5432)',
      connectionString: `postgresql://postgres.${ref}:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    },
    {
      name: 'Transaction pooler (port 6543)',
      connectionString: `postgresql://postgres.${ref}:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
      ssl: { rejectUnauthorized: false }
    },
    {
      name: 'Direct DB host',
      connectionString: `postgresql://postgres:${process.env.SUPABASE_SERVICE_ROLE_KEY}@db.${ref}.supabase.co:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    },
  ];

  for (const cfg of configs) {
    console.log(`Trying: ${cfg.name}...`);
    const client = new Client({ connectionString: cfg.connectionString, ssl: cfg.ssl });
    try {
      await client.connect();
      console.log('Connected! Running SQL...');
      await client.query(SQL);
      console.log('SUCCESS: topic_settings table created!');
      await client.end();
      return;
    } catch (err) {
      console.log(`Failed: ${err.message}`);
      try { await client.end(); } catch {}
    }
  }
  console.log('All connection methods failed.');
}

main();
