#!/usr/bin/env node

/**
 * Reset Superadmin User Script
 *
 * This script helps reset and recreate the superadmin user programmatically
 * using the Supabase Admin API.
 *
 * Usage:
 *   node scripts/reset-superadmin.js
 *
 * Environment Variables Required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your service role key (from Project Settings > API)
 */

const SUPERADMIN_EMAIL = 'rahulsuranat@gmail.com';
const SUPERADMIN_PASSWORD = '9480413653';
const SUPERADMIN_NAME = 'Super Admin';

async function resetSuperadmin() {
  console.log('================================================');
  console.log('Superadmin User Reset Script');
  console.log('================================================\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: Required environment variables not set\n');
    console.log('Please set the following environment variables:');
    console.log('  SUPABASE_URL - Your Supabase project URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY - Your service role key\n');
    console.log('Example:');
    console.log('  export SUPABASE_URL="https://your-project.supabase.co"');
    console.log('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"\n');
    console.log('Get your service role key from:');
    console.log('  Supabase Dashboard → Project Settings → API → service_role secret\n');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  Email: ${SUPERADMIN_EMAIL}`);
  console.log(`  Name: ${SUPERADMIN_NAME}\n`);

  try {
    // Step 1: Clean up existing user
    console.log('Step 1: Cleaning up existing superadmin...');

    const cleanupResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/cleanup_superadmin`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_email: SUPERADMIN_EMAIL })
    });

    if (cleanupResponse.ok) {
      console.log('✓ Cleanup completed\n');
    } else {
      console.log('⚠ Cleanup may have failed (user might not exist)\n');
    }

    // Step 2: Create new user
    console.log('Step 2: Creating new superadmin user...');

    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: SUPERADMIN_NAME
        }
      })
    });

    const createUserData = await createUserResponse.json();

    if (!createUserResponse.ok) {
      throw new Error(`Failed to create user: ${createUserData.message || JSON.stringify(createUserData)}`);
    }

    console.log('✓ Superadmin user created');
    console.log(`  User ID: ${createUserData.id}\n`);

    // Step 3: Verify profile (trigger should have created it)
    console.log('Step 3: Verifying superadmin profile...');

    const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_superadmin_profile`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_email: SUPERADMIN_EMAIL,
        p_full_name: SUPERADMIN_NAME
      })
    });

    if (verifyResponse.ok) {
      console.log('✓ Superadmin profile verified\n');
    } else {
      console.log('⚠ Profile verification response:', await verifyResponse.text(), '\n');
    }

    // Success message
    console.log('================================================');
    console.log('✓ Superadmin user successfully created!');
    console.log('================================================\n');
    console.log('Login credentials:');
    console.log(`  Email: ${SUPERADMIN_EMAIL}`);
    console.log(`  Password: ${SUPERADMIN_PASSWORD}\n`);
    console.log('You can now log in at: /admin/auth\n');
    console.log('⚠️  IMPORTANT: Change the password after first login!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the script
resetSuperadmin();
