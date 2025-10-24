#!/usr/bin/env node

/**
 * Mahaveer Bhavan - Authentication Diagnostic Tool
 *
 * This script diagnoses authentication issues and provides fixes.
 * Run with: node scripts/diagnose-auth.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://juvrytwhtivezeqrmtpq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJ5dHdodGl2ZXplcXJtdHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTMzMDksImV4cCI6MjA3Mzk2OTMwOX0.kElx1ywKoltQxqOd0cP0_Fw9b4kDdd-syZbIhwD61tc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Mahaveer Bhavan - Authentication Diagnostic Tool\n');
console.log('=' .repeat(60));

async function diagnose() {
  try {
    // 1. Check Auth Users
    console.log('\n📋 Step 1: Checking Authentication Users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
    } else {
      console.log(`✅ Found ${authUsers.users.length} authentication users`);
      authUsers.users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (ID: ${user.id.substring(0, 8)}...)`);
      });
    }

    // 2. Check User Roles
    console.log('\n📋 Step 2: Checking User Roles Table...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .order('id');

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message);
      console.log('   Fix: Run the setup-database.sql script in Supabase SQL Editor');
    } else {
      console.log(`✅ Found ${roles.length} roles:`);
      roles.forEach(role => {
        console.log(`   - ${role.name} (ID: ${role.id})`);
      });
    }

    // 3. Check User Profiles
    console.log('\n📋 Step 3: Checking User Profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        auth_id,
        email,
        full_name,
        role_id,
        user_roles (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      console.log('   This might be due to RLS policies blocking the query');
      console.log('   Fix: Run the setup-database.sql script to fix RLS policies');
    } else {
      console.log(`✅ Found ${profiles.length} user profiles:`);
      profiles.forEach((profile, index) => {
        const roleName = profile.user_roles?.name || 'NO ROLE';
        console.log(`   ${index + 1}. ${profile.email || 'No email'} - Role: ${roleName}`);
      });
    }

    // 4. Check for Admin Users
    console.log('\n📋 Step 4: Checking for Admin Users...');
    const adminRoles = ['admin', 'superadmin', 'management_admin', 'view_only_admin'];
    const admins = profiles?.filter(p => adminRoles.includes(p.user_roles?.name)) || [];

    if (admins.length === 0) {
      console.log('⚠️  NO ADMIN USERS FOUND!');
      console.log('   This is why login is failing.');
      console.log('\n   To fix:');
      console.log('   1. Go to Supabase Dashboard > Authentication > Users');
      console.log('   2. Create a new user (email + password)');
      console.log('   3. Check "Auto Confirm User"');
      console.log('   4. After creating, run this SQL:');
      console.log('');
      console.log('   UPDATE user_profiles');
      console.log('   SET role_id = (SELECT id FROM user_roles WHERE name = \'superadmin\')');
      console.log('   WHERE email = \'YOUR_ADMIN_EMAIL\';');
      console.log('');
    } else {
      console.log(`✅ Found ${admins.length} admin user(s):`);
      admins.forEach(admin => {
        console.log(`   - ${admin.email} (Role: ${admin.user_roles.name})`);
      });
    }

    // 5. Check RLS Status
    console.log('\n📋 Step 5: Checking RLS Policies...');
    console.log('   Note: Cannot check RLS directly via API');
    console.log('   If login fails, RLS might be blocking profile queries');
    console.log('   Fix: Run setup-database.sql to recreate policies');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(60));

    if (authUsers?.users.length === 0) {
      console.log('❌ No authentication users exist');
      console.log('   → Create users in Supabase Dashboard');
    } else {
      console.log(`✅ ${authUsers.users.length} auth user(s) exist`);
    }

    if (!roles || roles.length === 0) {
      console.log('❌ User roles table is empty');
      console.log('   → Run setup-database.sql');
    } else {
      console.log(`✅ ${roles.length} role(s) configured`);
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No user profiles exist');
      console.log('   → Check database triggers');
    } else {
      console.log(`✅ ${profiles.length} profile(s) exist`);
    }

    if (admins.length === 0) {
      console.log('❌ NO ADMIN USERS - THIS IS THE MAIN ISSUE');
      console.log('   → Follow steps above to create admin user');
    } else {
      console.log(`✅ ${admins.length} admin user(s) configured`);
    }

    console.log('\n📖 Next Steps:');
    console.log('   1. Read scripts/create-admin-user.md for detailed instructions');
    console.log('   2. Run setup-database.sql in Supabase SQL Editor');
    console.log('   3. Create admin user via Supabase Dashboard');
    console.log('   4. Test login at https://mahaveer-bhavan.netlify.app/admin-auth');
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error);
  }
}

diagnose();
