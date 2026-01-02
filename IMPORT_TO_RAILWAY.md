# Quick Import Guide to Railway

## Prerequisites
✅ Data exported from local database (done!)

## Step 1: Set Railway Database URL

**Option A: Using Railway CLI**
```bash
railway link
railway variables
# Set DATABASE_PUBLIC_URL
```

**Option B: Set in .env file (temporarily)**
```bash
DATABASE_PUBLIC_URL="your-railway-database-url"
```

## Step 2: Apply Migrations to Railway
```bash
railway run npm run db:migrate:deploy
```

## Step 3: Import Data

**First time import (recommended - clears existing data):**
```bash
npm run db:import:reset
```

**Merge with existing data:**
```bash
npm run db:import
```

## Step 4: Verify
```bash
railway run npm run db:check
```

## Expected Results
After import, you should see:
- ✅ 16 users
- ✅ 13 properties  
- ✅ 12 investments
- ✅ 1 rental statement
- ✅ 1 distribution
- ✅ 13 payouts
- ✅ 25 transactions
- ✅ 3 referral codes
- ✅ 11 audit logs

