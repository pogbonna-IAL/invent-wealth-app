# Data Migration Guide

This guide explains how to export data from your local database and import it into Railway production database.

## Prerequisites

1. **Local Database**: Ensure your local database has the data you want to migrate
2. **Railway Database**: Ensure your Railway database is set up and migrations are applied
3. **Environment Variables**: 
   - Local: `DATABASE_URL` should point to your local database
   - Railway: `DATABASE_PUBLIC_URL` or `DATABASE_URL` should point to your Railway database

## Step-by-Step Process

### Step 1: Export Data from Local Database

Run the export script to save all data from your local database to JSON files:

```bash
npm run db:export
```

This will:
- Connect to your local database (using `DATABASE_URL`)
- Export all tables to JSON files in `prisma/data-export/`
- Create a summary file with counts

**Exported files:**
- `users.json` - All users with profiles and onboarding data
- `properties.json` - All properties
- `investments.json` - All investments
- `rental-statements.json` - All rental statements
- `distributions.json` - All distributions
- `payouts.json` - All payouts
- `transactions.json` - All transactions
- `documents.json` - All documents
- `referral-codes.json` - All referral codes
- `audit-logs.json` - All audit logs
- `summary.json` - Export summary with counts

### Step 2: Set Railway Database URL

Before importing, ensure your Railway database URL is set:

**Option A: Using Railway CLI**
```bash
railway link
railway variables
# Set DATABASE_PUBLIC_URL or DATABASE_URL
```

**Option B: Using Environment Variables**
Set `DATABASE_PUBLIC_URL` or `DATABASE_URL` in your environment to point to Railway.

### Step 3: Import Data to Railway Database

**Option A: Import without clearing existing data (merges data)**
```bash
npm run db:import
```

**Option B: Import with reset (clears all data first, then imports)**
```bash
npm run db:import:reset
```

This will:
- Connect to your Railway database (using `DATABASE_PUBLIC_URL` or `DATABASE_URL`)
- Optionally clear existing data (if using `--reset` flag)
- Import all data from the exported JSON files
- Preserve IDs and relationships
- Show a summary of imported records

## Important Notes

### Data Relationships
The import script handles foreign key relationships automatically:
- Users are imported first (with profiles and onboarding)
- Properties are imported next
- Investments reference users and properties
- Rental statements reference properties
- Distributions reference properties and rental statements
- Payouts reference users, properties, distributions, and rental statements
- Transactions reference users
- Documents reference users and properties

### ID Preservation
- User IDs, Property IDs, and other IDs are preserved during import
- This ensures relationships between tables remain intact
- If a record already exists (by unique key), it will be updated instead of creating a duplicate

### Email-based User Matching
- Users are matched by email address (if available)
- If a user with the same email exists, it will be updated
- If no email exists, the user will be created with the original ID

### Reset Mode
- Using `--reset` flag will **DELETE ALL DATA** in the Railway database before importing
- Use with caution in production!
- Recommended for initial setup or when you want a clean slate

## Troubleshooting

### Error: "Export directory not found"
- Run `npm run db:export` first to create the export files

### Error: "DATABASE_URL not set"
- Ensure `DATABASE_URL` is set in your `.env` file for local export
- Ensure `DATABASE_PUBLIC_URL` or `DATABASE_URL` is set for Railway import

### Foreign Key Constraint Errors
- Ensure migrations are applied to Railway database first
- Run `railway run npm run db:migrate:deploy` on Railway

### Duplicate Key Errors
- The import script uses `upsert` to handle duplicates
- If you still get errors, try using `--reset` flag to clear existing data first

## Verification

After importing, verify the data:

```bash
# Check Railway database
railway run npm run db:check
```

Or connect to Railway database directly:
```bash
railway run npm run db:studio
```

## Best Practices

1. **Backup First**: Always backup your Railway database before importing
2. **Test Locally**: Test the export/import process with a test database first
3. **Verify Migrations**: Ensure Railway database has all migrations applied
4. **Check Data**: Verify imported data matches your expectations
5. **Monitor**: Watch for any errors during import process

## Security Notes

- The `prisma/data-export/` directory contains sensitive data and is gitignored
- Never commit exported data files to version control
- Delete exported files after successful import if they contain sensitive information

