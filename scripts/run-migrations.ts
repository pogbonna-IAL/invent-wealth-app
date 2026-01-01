#!/usr/bin/env tsx

/**
 * Railway Migration Script
 * 
 * This script runs Prisma migrations using the local Prisma binary
 * to ensure the correct version (6.x) is used instead of a global 7.x.
 * 
 * Usage:
 *   npm run db:migrate:deploy
 *   railway run npm run db:migrate:deploy
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Database connection retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000; // 3 seconds

const PRISMA_BINARY = join(process.cwd(), 'node_modules', '.bin', 'prisma');
const PRISMA_CLI = join(process.cwd(), 'node_modules', 'prisma', 'package.json');

function checkPrismaInstalled(): boolean {
  if (!existsSync(PRISMA_BINARY)) {
    console.error('❌ ERROR: Prisma binary not found at:', PRISMA_BINARY);
    console.error('   Make sure dependencies are installed: npm install');
    return false;
  }
  
  if (!existsSync(PRISMA_CLI)) {
    console.error('❌ ERROR: Prisma package not found');
    return false;
  }
  
  return true;
}

function checkDatabaseUrl(): boolean {
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.error('');
    console.error('To fix this:');
    console.error('1. Ensure DATABASE_URL is set in Railway environment variables');
    console.error('2. Or set it manually: export DATABASE_URL="postgresql://..."');
    console.error('');
    return false;
  }
  
  // Mask password in URL for logging
  const maskedUrl = process.env.DATABASE_URL.replace(
    /:\/\/[^:]+:[^@]+@/,
    '://****:****@'
  );
  console.log('✓ DATABASE_URL found:', maskedUrl);
  
  return true;
}

function getPrismaVersion(): string | null {
  try {
    const packageJson = require(PRISMA_CLI);
    return packageJson.version || null;
  } catch {
    return null;
  }
}

async function waitForDatabase(maxRetries: number = MAX_RETRIES): Promise<boolean> {
  console.log('⏳ Checking database connectivity...');
  
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const isWindows = process.platform === 'win32';
  
  // Use Prisma's migrate status command to check connectivity
  // This is simpler and doesn't require stdin
  const prismaCommand = isWindows 
    ? `"${PRISMA_BINARY}" migrate status --schema "${schemaPath}"`
    : `${PRISMA_BINARY} migrate status --schema "${schemaPath}"`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try to check migration status - this will fail if database is unreachable
      execSync(prismaCommand, {
        stdio: 'pipe',
        env: process.env,
        cwd: process.cwd(),
        shell: isWindows ? true : false,
        timeout: 10000, // 10 second timeout per attempt
      });
      
      console.log('✓ Database is reachable!');
      return true;
    } catch (error: any) {
      const errorOutput = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
      const isConnectionError = errorOutput.includes("Can't reach") || 
                                errorOutput.includes("P1001") ||
                                errorOutput.includes("connect") ||
                                errorOutput.includes("ECONNREFUSED");
      
      if (attempt < maxRetries && isConnectionError) {
        console.log(`   Attempt ${attempt}/${maxRetries} failed, retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else if (attempt === maxRetries) {
        // Last attempt failed - but this might be OK if migrations haven't been run yet
        // So we'll still try to run migrations
        console.log('⚠️  Database connectivity check failed, but proceeding with migration attempt...');
        return true; // Return true to proceed - let migrate deploy handle the actual error
      } else if (!isConnectionError) {
        // Non-connection error (like migration status), that's OK - database is reachable
        console.log('✓ Database is reachable!');
        return true;
      }
    }
  }
  
  // If we get here, all retries failed but we'll still try
  console.log('⚠️  Database connectivity check inconclusive, proceeding with migration...');
  return true;
}

async function runMigrations(): Promise<void> {
  console.log('🚀 Starting database migrations...');
  console.log('');
  
  // Check prerequisites
  if (!checkPrismaInstalled()) {
    process.exit(1);
  }
  
  if (!checkDatabaseUrl()) {
    process.exit(1);
  }
  
  // Show Prisma version
  const prismaVersion = getPrismaVersion();
  if (prismaVersion) {
    console.log(`✓ Using Prisma version: ${prismaVersion}`);
  }
  console.log('');
  
  // Wait for database to be ready (with retries)
  const dbReady = await waitForDatabase();
  if (!dbReady) {
    console.error('');
    console.error('❌ ERROR: Cannot reach database server after multiple attempts');
    console.error('');
    console.error('Troubleshooting steps:');
    console.error('1. Verify PostgreSQL service is running in Railway:');
    console.error('   - Go to Railway dashboard → Your project');
    console.error('   - Check PostgreSQL service status');
    console.error('');
    console.error('2. Verify services are linked:');
    console.error('   - Ensure your app service is linked to PostgreSQL service');
    console.error('   - Railway should auto-generate DATABASE_URL when linked');
    console.error('');
    console.error('3. Check DATABASE_URL format:');
    console.error('   - Should be: postgresql://user:password@host:port/database');
    console.error('   - Railway internal: postgres.railway.internal:5432');
    console.error('   - External: your-db.railway.app:5432');
    console.error('');
    console.error('4. Verify database is in the same Railway project');
    console.error('');
    process.exit(1);
  }
  
  console.log('');
  
  // Run migrations
  try {
    console.log('📦 Running: prisma migrate deploy');
    console.log('');
    
    // Quote the binary path for Windows compatibility (handles paths with spaces)
    const isWindows = process.platform === 'win32';
    const prismaCommand = isWindows 
      ? `"${PRISMA_BINARY}" migrate deploy`
      : `${PRISMA_BINARY} migrate deploy`;
    
    execSync(prismaCommand, {
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd(),
      shell: isWindows ? true : false, // Use shell on Windows for proper path handling
    });
    
    console.log('');
    console.log('✅ Migrations completed successfully!');
    
  } catch (error: any) {
    console.error('');
    console.error('❌ Migration failed!');
    
    if (error.status === 1) {
      console.error('   Exit code: 1 - Migration command failed');
    } else if (error.signal) {
      console.error(`   Process killed by signal: ${error.signal}`);
    }
    
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check DATABASE_URL is correct');
    console.error('2. Verify database service is running in Railway');
    console.error('3. Ensure services are linked in Railway');
    console.error('4. Check migration files exist in prisma/migrations/');
    console.error('5. Ensure Prisma version matches (should be 6.x)');
    console.error('');
    console.error('Railway-specific checks:');
    console.error('- Go to Railway dashboard → Your project → PostgreSQL service');
    console.error('- Verify service is "Active" and not "Paused"');
    console.error('- Check service logs for any errors');
    console.error('- Ensure DATABASE_URL is set in your app service variables');
    console.error('');
    
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

