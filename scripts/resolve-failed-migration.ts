#!/usr/bin/env tsx

/**
 * Resolve Failed Migration Script
 * 
 * This script helps resolve failed migrations by marking them as rolled back,
 * allowing you to retry the migration with fixed SQL.
 * 
 * Usage:
 *   tsx scripts/resolve-failed-migration.ts <migration-name>
 *   tsx scripts/resolve-failed-migration.ts 20251226000000_add_wallet_payment_method
 * 
 * Or run via Railway:
 *   railway run tsx scripts/resolve-failed-migration.ts 20251226000000_add_wallet_payment_method
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const PRISMA_BINARY = join(process.cwd(), 'node_modules', '.bin', 'prisma');

function checkPrismaInstalled(): boolean {
  if (!existsSync(PRISMA_BINARY)) {
    console.error('❌ ERROR: Prisma binary not found at:', PRISMA_BINARY);
    console.error('   Make sure dependencies are installed: npm install');
    return false;
  }
  return true;
}

function getDatabaseUrl(): string | null {
  // Priority 1: Use Railway public TCP proxy connection
  if (process.env.DATABASE_PUBLIC_URL) {
    const url = process.env.DATABASE_PUBLIC_URL.trim();
    if (url && url.length > 0) {
      return url;
    }
  }
  
  // Priority 2: Fall back to standard DATABASE_URL
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL.trim();
    if (url && url.length > 0) {
      return url;
    }
  }
  
  return null;
}

function resolveFailedMigration(migrationName: string): void {
  console.log('🔧 Resolving failed migration:', migrationName);
  console.log('');
  
  if (!checkPrismaInstalled()) {
    process.exit(1);
  }
  
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    console.error('❌ ERROR: DATABASE_PUBLIC_URL or DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const isWindows = process.platform === 'win32';
  const prismaCommand = isWindows 
    ? `"${PRISMA_BINARY}" migrate resolve --rolled-back ${migrationName}`
    : `${PRISMA_BINARY} migrate resolve --rolled-back ${migrationName}`;
  
  const env = { ...process.env };
  if (dbUrl) {
    env.DATABASE_URL = dbUrl;
  }
  
  try {
    console.log('📦 Running: prisma migrate resolve --rolled-back', migrationName);
    console.log('');
    
    execSync(prismaCommand, {
      stdio: 'inherit',
      env: env,
      cwd: process.cwd(),
      shell: isWindows ? true : false,
    });
    
    console.log('');
    console.log('✅ Migration marked as rolled back successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run migrations again: npm run db:migrate:deploy');
    console.log('2. Or via Railway: railway run npm run db:migrate:deploy');
    console.log('');
    
  } catch (error: any) {
    console.error('');
    console.error('❌ Failed to resolve migration!');
    console.error('');
    console.error('Error details:');
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
    if (error.stdout) {
      console.error(error.stdout.toString());
    }
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Verify the migration name is correct');
    console.error('2. Check DATABASE_URL or DATABASE_PUBLIC_URL is set correctly');
    console.error('3. Ensure you have database access');
    console.error('4. Check Prisma migration status: npx prisma migrate status');
    console.error('');
    
    process.exit(1);
  }
}

// Get migration name from command line arguments
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ ERROR: Migration name is required');
  console.error('');
  console.error('Usage:');
  console.error('  tsx scripts/resolve-failed-migration.ts <migration-name>');
  console.error('');
  console.error('Example:');
  console.error('  tsx scripts/resolve-failed-migration.ts 20251226000000_add_wallet_payment_method');
  console.error('');
  process.exit(1);
}

resolveFailedMigration(migrationName);

