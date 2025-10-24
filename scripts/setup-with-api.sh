#!/bin/bash

# ============================================
# Mahaveer Bhavan - Complete Setup via API
# ============================================

set -e  # Exit on error

echo "🚀 Mahaveer Bhavan - Automated Setup"
echo "======================================================================"
echo ""

# Configuration
SUPABASE_URL="https://juvrytwhtivezeqrmtpq.supabase.co"
PROJECT_REF="juvrytwhtivezeqrmtpq"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dnJ5dHdodGl2ZXplcXJtdHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTMzMDksImV4cCI6MjA3Mzk2OTMwOX0.kElx1ywKoltQxqOd0cP0_Fw9b4kDdd-syZbIhwD61tc"
SUPABASE_ACCESS_TOKEN="sbp_b16cc13c16084523a56e907883f63c1acb355216"

# Admin credentials to create
ADMIN_EMAIL="admin@mahaveer.com"
ADMIN_PASSWORD="AdminMahaveer2025!"

echo "📋 Configuration:"
echo "   Project: $PROJECT_REF"
echo "   Admin Email: $ADMIN_EMAIL"
echo ""

# Step 1: Run SQL setup via Management API
echo "📝 STEP 1: Setting up database schema..."
echo ""

# Read the SQL file
SQL_CONTENT=$(cat scripts/complete-setup.sql)

# Execute SQL via Supabase Management API
echo "   Executing SQL script..."
RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}" \
  2>&1)

if echo "$RESPONSE" | grep -q "error"; then
  echo "   ⚠️  API response: $RESPONSE"
  echo "   ℹ️  Continuing anyway..."
else
  echo "   ✅ Database setup executed"
fi

echo ""

# Step 2: Create admin user via Auth Admin API
echo "📝 STEP 2: Creating admin user..."
echo ""

CREATE_USER_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${ADMIN_EMAIL}\",
    \"password\": \"${ADMIN_PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"full_name\": \"Admin User\"
    }
  }" \
  2>&1)

if echo "$CREATE_USER_RESPONSE" | grep -q "\"id\""; then
  USER_ID=$(echo "$CREATE_USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   ✅ Admin user created!"
  echo "   🆔 User ID: $USER_ID"
  echo "   📧 Email: $ADMIN_EMAIL"
  echo "   🔑 Password: $ADMIN_PASSWORD"

  # Step 3: Update user profile to admin role
  echo ""
  echo "📝 STEP 3: Assigning admin role..."
  echo "   ⏳ Waiting for profile creation trigger..."
  sleep 3

  # Update via REST API
  UPDATE_RESPONSE=$(curl -s -X PATCH \
    "${SUPABASE_URL}/rest/v1/user_profiles?auth_id=eq.${USER_ID}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{
      "role_id": 1
    }' \
    2>&1)

  if echo "$UPDATE_RESPONSE" | grep -q "\"role_id\""; then
    echo "   ✅ Admin role assigned!"
  else
    echo "   ⚠️  Could not update role automatically"
    echo "   📋 Run this SQL manually:"
    echo ""
    echo "   UPDATE user_profiles"
    echo "   SET role_id = (SELECT id FROM user_roles WHERE name = 'superadmin')"
    echo "   WHERE auth_id = '${USER_ID}';"
    echo ""
  fi

elif echo "$CREATE_USER_RESPONSE" | grep -q "already exists"; then
  echo "   ℹ️  Admin user already exists"
  echo "   📧 Email: $ADMIN_EMAIL"
  echo "   🔑 Password: $ADMIN_PASSWORD"
else
  echo "   ❌ Error creating user:"
  echo "   $CREATE_USER_RESPONSE"
  echo ""
  echo "   💡 This likely means you need the Service Role Key"
  echo "   📋 Follow manual steps below instead"
fi

echo ""
echo "======================================================================"
echo "🎯 SETUP COMPLETE"
echo "======================================================================"
echo ""
echo "🔐 Admin Login Credentials:"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: $ADMIN_PASSWORD"
echo ""
echo "🌐 Test Login:"
echo "   https://mahaveer-bhavan.netlify.app/admin-auth"
echo ""
echo "💡 Open browser console (F12) to see authentication logs"
echo ""
