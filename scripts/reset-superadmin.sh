#!/bin/bash

# ============================================
# RESET SUPERADMIN USER SCRIPT
# ============================================
# This script helps reset and recreate the superadmin user

set -e

echo "================================================"
echo "Superadmin User Reset Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Superadmin credentials
SUPERADMIN_EMAIL="rahulsuranat@gmail.com"
SUPERADMIN_PASSWORD="9480413653"
SUPERADMIN_NAME="Super Admin"

echo -e "${YELLOW}This script will:${NC}"
echo "1. Clean up existing superadmin user"
echo "2. Create a new superadmin user"
echo "3. Assign superadmin role"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 1: Cleaning up existing superadmin...${NC}"

# Run cleanup function via Supabase SQL
npx supabase db execute <<EOF
SELECT cleanup_superadmin('$SUPERADMIN_EMAIL');
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Cleanup completed${NC}"
else
    echo -e "${RED}✗ Cleanup failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Creating new superadmin user...${NC}"

# Create user via Supabase Auth API
# Note: This requires SUPABASE_SERVICE_ROLE_KEY to be set
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set${NC}"
    echo ""
    echo "To set it, run:"
    echo "  export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo ""
    echo "Get your service role key from:"
    echo "  Supabase Dashboard > Project Settings > API > service_role secret"
    echo ""
    echo -e "${YELLOW}Alternative: Manual signup${NC}"
    echo "You can also manually sign up through the app:"
    echo "  1. Go to /admin/auth"
    echo "  2. Sign up with:"
    echo "     Email: $SUPERADMIN_EMAIL"
    echo "     Password: $SUPERADMIN_PASSWORD"
    echo "  3. The trigger will automatically assign superadmin role"
    exit 1
fi

# Get Supabase URL from .env or config
if [ -f ".env" ]; then
    source .env
fi

SUPABASE_URL=${SUPABASE_URL:-"http://localhost:54321"}

# Create user using Admin API
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$SUPERADMIN_EMAIL\",
    \"password\": \"$SUPERADMIN_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"full_name\": \"$SUPERADMIN_NAME\"
    }
  }")

if echo "$RESPONSE" | grep -q "\"id\""; then
    echo -e "${GREEN}✓ Superadmin user created${NC}"

    # Extract user ID
    USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "User ID: $USER_ID"

    echo ""
    echo -e "${YELLOW}Step 3: Verifying superadmin profile...${NC}"

    # The trigger should have created the profile automatically
    # But we'll run the function to be sure
    npx supabase db execute <<EOF
SELECT create_superadmin_profile('$SUPERADMIN_EMAIL', '$SUPERADMIN_NAME');
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Superadmin profile verified${NC}"
    else
        echo -e "${RED}✗ Profile verification failed${NC}"
    fi

    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}Superadmin user successfully created!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo "Login credentials:"
    echo "  Email: $SUPERADMIN_EMAIL"
    echo "  Password: $SUPERADMIN_PASSWORD"
    echo ""
    echo "You can now log in at: /admin/auth"

else
    echo -e "${RED}✗ Failed to create superadmin user${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi
