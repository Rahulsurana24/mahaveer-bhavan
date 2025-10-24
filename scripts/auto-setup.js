#!/usr/bin/env node

/**
 * Mahaveer Bhavan - Automated Complete Setup
 * This script does EVERYTHING needed to make login work
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Credentials
const SUPABASE_URL = 'https://juvrytwhtivezeqrmtpq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJ5dHdodGl2ZXplcXJtdHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTMzMDksImV4cCI6MjA3Mzk2OTMwOX0.kElx1ywKoltQxqOd0cP0_Fw9b4kDdd-syZbIhwD61tc';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 Mahaveer Bhavan - Automated Setup\n');
console.log('=' .repeat(70));
console.log('This script will automatically set up your entire authentication system');
console.log('=' .repeat(70));

async function executeSQL(sql, description) {
  console.log(`\n📝 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // RPC might not exist, that's okay - we'll handle it differently
      console.log('   ℹ️  Note: Direct SQL execution not available');
      console.log('   📋 You need to run the SQL manually in Supabase Dashboard');
      return false;
    }

    console.log('   ✅ Success!');
    return true;
  } catch (err) {
    console.log('   ⚠️  Could not execute directly:', err.message);
    return false;
  }
}

async function setupRoles() {
  console.log('\n📋 STEP 1: Setting up user roles...');

  try {
    // Try to insert roles
    const roles = [
      { name: 'superadmin', description: 'Super Administrator with full system access' },
      { name: 'admin', description: 'Administrator with management access' },
      { name: 'management_admin', description: 'Management Administrator with reporting access' },
      { name: 'view_only_admin', description: 'View-only Administrator' },
      { name: 'member', description: 'Regular Member' }
    ];

    for (const role of roles) {
      const { error } = await supabase
        .from('user_roles')
        .upsert(role, { onConflict: 'name' });

      if (error) {
        console.log(`   ⚠️  Could not create role ${role.name}:`, error.message);
      } else {
        console.log(`   ✅ Created/updated role: ${role.name}`);
      }
    }

    // Verify roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .order('id');

    if (rolesError) {
      console.log('   ❌ Error verifying roles:', rolesError.message);
      return false;
    }

    console.log(`   ✅ Total roles configured: ${rolesData.length}`);
    rolesData.forEach(role => {
      console.log(`      - ${role.name} (ID: ${role.id})`);
    });

    return true;
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

async function createAdminUser() {
  console.log('\n📋 STEP 2: Creating admin user...');

  const adminEmail = 'admin@mahaveer.com';
  const adminPassword = 'AdminMahaveer2025!';

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === adminEmail);

    if (existingUser) {
      console.log('   ℹ️  Admin user already exists:', adminEmail);
      console.log('   📋 User ID:', existingUser.id);
      return existingUser.id;
    }

    // Create new admin user
    console.log('   📝 Creating new admin user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin User'
      }
    });

    if (createError) {
      console.log('   ❌ Error creating user:', createError.message);
      return null;
    }

    console.log('   ✅ Admin user created successfully!');
    console.log('   📧 Email:', adminEmail);
    console.log('   🔑 Password:', adminPassword);
    console.log('   🆔 User ID:', newUser.user.id);

    return newUser.user.id;
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return null;
  }
}

async function assignAdminRole(userId) {
  console.log('\n📋 STEP 3: Assigning admin role...');

  try {
    // Get superadmin role ID
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('name', 'superadmin')
      .single();

    if (roleError || !roles) {
      console.log('   ❌ Could not find superadmin role:', roleError?.message);
      return false;
    }

    const superadminRoleId = roles.id;
    console.log('   ℹ️  Superadmin role ID:', superadminRoleId);

    // Wait for profile to be created by trigger
    console.log('   ⏳ Waiting for profile to be created...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .update({ role_id: superadminRoleId })
      .eq('auth_id', userId)
      .select();

    if (profileError) {
      console.log('   ⚠️  Could not update profile directly:', profileError.message);
      console.log('   📋 You may need to run this SQL manually:');
      console.log(`   UPDATE user_profiles SET role_id = ${superadminRoleId} WHERE auth_id = '${userId}';`);
      return false;
    }

    if (!profile || profile.length === 0) {
      console.log('   ⚠️  Profile not found. Trying to create it...');

      // Try to create profile manually
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          auth_id: userId,
          email: 'admin@mahaveer.com',
          full_name: 'Admin User',
          role_id: superadminRoleId
        });

      if (insertError) {
        console.log('   ❌ Could not create profile:', insertError.message);
        return false;
      }

      console.log('   ✅ Profile created manually!');
    } else {
      console.log('   ✅ Admin role assigned successfully!');
    }

    return true;
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

async function verifySetup() {
  console.log('\n📋 STEP 4: Verifying setup...');

  try {
    // Check admin user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        full_name,
        user_roles (
          id,
          name
        )
      `)
      .eq('email', 'admin@mahaveer.com')
      .single();

    if (error) {
      console.log('   ❌ Error fetching profile:', error.message);
      return false;
    }

    if (!profile) {
      console.log('   ❌ Admin profile not found');
      return false;
    }

    const roleName = profile.user_roles?.name;
    console.log('   ✅ Admin user verified!');
    console.log('   📧 Email:', profile.email);
    console.log('   👤 Name:', profile.full_name);
    console.log('   🎭 Role:', roleName);

    if (roleName === 'superadmin') {
      console.log('   🎉 Perfect! Admin user is configured correctly!');
      return true;
    } else {
      console.log('   ⚠️  Role is not superadmin. Manual SQL needed.');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

async function displayManualSteps() {
  console.log('\n' + '='.repeat(70));
  console.log('📋 MANUAL STEPS REQUIRED');
  console.log('='.repeat(70));
  console.log('\n⚠️  Some steps require manual execution in Supabase Dashboard\n');

  console.log('1️⃣  Go to Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/juvrytwhtivezeqrmtpq/sql\n');

  console.log('2️⃣  Run this SQL script:');
  console.log('   Copy the entire contents of: scripts/complete-setup.sql');
  console.log('   Paste into SQL Editor and click "Run"\n');

  console.log('3️⃣  Then run this script again:');
  console.log('   node scripts/auto-setup.js\n');
}

async function main() {
  try {
    console.log('\n🔍 Checking current state...\n');

    // Step 1: Setup roles
    const rolesOk = await setupRoles();

    if (!rolesOk) {
      console.log('\n⚠️  Could not set up roles automatically.');
      await displayManualSteps();
      return;
    }

    // Step 2: Create admin user
    const userId = await createAdminUser();

    if (!userId) {
      console.log('\n❌ Could not create admin user.');
      console.log('Please check the error above and try again.');
      return;
    }

    // Step 3: Assign admin role
    const roleAssigned = await assignAdminRole(userId);

    // Step 4: Verify everything
    const verified = await verifySetup();

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('🎯 SETUP SUMMARY');
    console.log('='.repeat(70));
    console.log('✅ User roles configured');
    console.log('✅ Admin user created');
    console.log(roleAssigned ? '✅ Admin role assigned' : '⚠️  Admin role needs manual assignment');
    console.log(verified ? '✅ Setup verified' : '⚠️  Verification incomplete');

    if (verified) {
      console.log('\n🎉 SUCCESS! Everything is set up!\n');
      console.log('🔐 Admin Login Credentials:');
      console.log('   Email: admin@mahaveer.com');
      console.log('   Password: AdminMahaveer2025!');
      console.log('\n🌐 Test Login:');
      console.log('   https://mahaveer-bhavan.netlify.app/admin-auth');
      console.log('\n💡 Open browser console (F12) to see detailed authentication logs');
    } else {
      console.log('\n⚠️  Setup incomplete. Run the manual steps above.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await displayManualSteps();
  }
}

main();
