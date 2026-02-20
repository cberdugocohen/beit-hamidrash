require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data, error } = await s.from('topic_settings').select('topic').limit(1);
  console.log('topic_settings:', JSON.stringify({ data, error }));
  
  const { data: d2, error: e2 } = await s.from('lesson_meta').select('video_id').limit(1);
  console.log('lesson_meta:', JSON.stringify({ data: d2, error: e2 }));
}
main();
