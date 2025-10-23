# Automated Supabase Database Deployment

This guide explains how to automatically deploy the consolidated SQL migration to your Supabase database.

## 📋 Prerequisites

1. **Get your Supabase Database Connection URL**
   - Go to your [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to **Project Settings** → **Database**
   - Scroll to **Connection String** section
   - Copy the **URI** format (not the other formats)
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - **Important**: Replace `[YOUR-PASSWORD]` with your actual database password

## 🚀 Option 1: Using Bash Script (Recommended)

### Step 1: Set Environment Variable (Secure)
```bash
export SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Step 2: Run Deployment Script
```bash
./deploy_to_supabase.sh
```

**Alternative**: Run without environment variable (will prompt for URL):
```bash
./deploy_to_supabase.sh
```

## 🚀 Option 2: Using Node.js Script

### Step 1: Install PostgreSQL Node Client
```bash
npm install pg
```

### Step 2: Set Environment Variable (Secure)
```bash
export SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Step 3: Run Deployment Script
```bash
node deploy_to_supabase.js
```

**Alternative**: Run without environment variable (will prompt for URL):
```bash
node deploy_to_supabase.js
```

## 🚀 Option 3: Manual psql Command

If you prefer to run the command directly:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f consolidated_migration.sql
```

## ✅ What Happens During Deployment

The script will automatically:

1. **Drop unwanted tables** (login_attempts, whatsapp_* tables)
2. **Create 14 tables** in correct dependency order
3. **Create 9 database functions** with proper security
4. **Create 13 triggers** for automation
5. **Enable Row Level Security** on all tables
6. **Create RLS policies** for access control
7. **Insert initial user roles** (member, admin, superadmin, etc.)
8. **Setup super admin** for rahulsuranat@gmail.com

## 🔒 Security Notes

- ✅ **Use environment variables** for your database URL (recommended)
- ✅ Never commit database credentials to git
- ✅ The scripts use secure connections (SSL enabled by default with Supabase)
- ✅ Your password is never logged or displayed

## 📝 After Successful Deployment

1. Go to your **Supabase Dashboard** → **Authentication**
2. Create a new user with email: **rahulsuranat@gmail.com**
3. This user will automatically receive **superadmin** role
4. Log in to your application and start managing!

## 🆘 Troubleshooting

### Error: "connection refused"
- Check your database URL is correct
- Ensure your IP is allowed in Supabase settings (or use password mode)
- Verify your database password is correct

### Error: "permission denied"
- Make sure you're using the `postgres` user (default)
- Check that your database password is correct

### Error: "relation already exists"
- This is OK! The SQL is idempotent and uses `IF NOT EXISTS`
- The migration will continue and complete successfully

### Error: "pg module not found" (Node.js only)
- Run: `npm install pg`
- Then try again

## 📄 Files Created

- `consolidated_migration.sql` - Complete database schema (900 lines)
- `deploy_to_supabase.sh` - Bash deployment script
- `deploy_to_supabase.js` - Node.js deployment script
- `DEPLOYMENT_README.md` - This file

## 🎯 Quick Start (One Command)

If you want to deploy right now:

```bash
# Install pg client (if using Node.js)
npm install pg

# Set your database URL
export SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Run deployment (choose one)
./deploy_to_supabase.sh          # Bash version
node deploy_to_supabase.js       # Node.js version
```

That's it! Your database will be fully set up and ready to use.
