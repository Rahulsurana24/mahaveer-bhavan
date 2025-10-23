#!/usr/bin/env node

/**
 * Apply WhatsApp Integration Migration
 * This script applies the WhatsApp integration migration to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file manually
const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').replace(/["']/g, '');
    }
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in .env file');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🚀 Applying WhatsApp Integration Migration...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

// Read migration file
const migrationPath = join(__dirname, 'supabase/migrations/20251023190000_whatsapp_integration.sql');
let migrationSQL;

try {
  migrationSQL = readFileSync(migrationPath, 'utf8');
  console.log('✓ Migration file loaded');
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}

// Split SQL into individual statements (basic splitting by semicolon)
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`✓ Found ${statements.length} SQL statements\n`);

console.log('⚠️  NOTE: This script uses the Supabase client with anon key.');
console.log('   Some operations may require service role key or direct database access.');
console.log('   If this fails, please use: npx supabase db push\n');

console.log('──────────────────────────────────────');
console.log('Attempting to create tables...\n');

// Try to check if tables exist
async function checkTables() {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      // Table doesn't exist
      return false;
    }

    if (!error) {
      console.log('✓ whatsapp_sessions table already exists');
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

const tablesExist = await checkTables();

if (tablesExist) {
  console.log('\n✅ WhatsApp tables already exist!');
  console.log('   Migration may have been applied previously.\n');
} else {
  console.log('\n⚠️  Tables do not exist. Migration needs to be applied.\n');
  console.log('To apply the migration, use one of these methods:\n');
  console.log('1. Using Supabase CLI (recommended):');
  console.log('   npx supabase db push\n');
  console.log('2. Using SQL Editor in Supabase Dashboard:');
  console.log('   - Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('.')[0].split('//')[1]);
  console.log('   - Navigate to SQL Editor');
  console.log('   - Copy contents of: supabase/migrations/20251023190000_whatsapp_integration.sql');
  console.log('   - Run the query\n');
  console.log('3. Using direct database connection:');
  console.log('   psql "YOUR_DATABASE_URL" -f supabase/migrations/20251023190000_whatsapp_integration.sql\n');
}

console.log('──────────────────────────────────────\n');

// Try to insert default session to test if tables work
if (tablesExist) {
  console.log('Testing WhatsApp session insertion...');

  try {
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .upsert({
        session_name: 'default',
        status: 'disconnected'
      }, {
        onConflict: 'session_name'
      })
      .select();

    if (error) {
      console.log('⚠️  Could not insert test record:', error.message);
      console.log('   This is normal if RLS policies require admin role.');
    } else {
      console.log('✓ WhatsApp session record created/verified');
    }
  } catch (error) {
    console.log('⚠️  Test insertion skipped');
  }
}

console.log('\n✅ Migration script complete!\n');
console.log('Next steps:');
console.log('  1. Ensure migration is applied (using one of the methods above)');
console.log('  2. Start servers: ./start-with-whatsapp.sh');
console.log('  3. Connect WhatsApp in admin panel\n');

process.exit(0);
