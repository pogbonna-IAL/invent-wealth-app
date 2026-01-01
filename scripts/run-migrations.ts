#!/usr/bin/env tsx

/**
 * Railway Migration Script
 * 
 * This script runs Prisma migrations using the local Prisma binary
 * to ensure the correct version (6.x) is used instead of a global 7.x.
 * 
 * Supports Railway public TCP proxy connections via DATABASE_PUBLIC_URL.
 * 
 * Usage:
 *   npm run db:migrate:deploy
 *   railway run npm run db:migrate:deploy
 * 
 * Connection priority:
 *   1. DATABASE_PUBLIC_URL (Railway public TCP proxy connection)
 *   2. DATABASE_URL (Railway internal connection)
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

function getDatabaseUrl(): string | null {
  // Priority 1: Use Railway public TCP proxy connection
  if (process.env.DATABASE_PUBLIC_URL) {
    console.log('✓ Using Railway public TCP connection (DATABASE_PUBLIC_URL)');
    return process.env.DATABASE_PUBLIC_URL;
  }
  
  // Priority 2: Fall back to standard DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  return null;
}

function checkDatabaseUrl(): boolean {
  const dbUrl = getDatabaseUrl();
  
  if (!dbUrl) {
    console.error('❌ ERROR: DATABASE_PUBLIC_URL or DATABASE_URL environment variable is not set');
    console.error('');
    console.error('To fix this:');
    console.error('1. Set DATABASE_PUBLIC_URL in Railway (recommended for migrations):');
    console.error('   - Go to Railway dashboard → PostgreSQL service → Connect');
    console.error('   - Copy the "Public Network" connection string');
    console.error('   - Set it as DATABASE_PUBLIC_URL in your app service variables');
    console.error('');
    console.error('2. Or use DATABASE_URL (internal connection):');
    console.error('   - Railway auto-generates this when services are linked');
    console.error('   - Format: postgresql://user:password@postgres.railway.internal:5432/database');
    console.error('');
    return false;
  }
  
  // Mask password in URL for logging
  const maskedUrl = dbUrl.replace(
    /:\/\/[^:]+:[^@]+@/,
    '://****:****@'
  );
  console.log('✓ Database URL found:', maskedUrl);
  
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
  const prismaCommand = isWindows 
    ? `"${PRISMA_BINARY}" migrate status --schema "${schemaPath}"`
    : `${PRISMA_BINARY} migrate status --schema "${schemaPath}"`;
  
  // Use the correct database URL
  const dbUrl = getDatabaseUrl();
  const env = { ...process.env };
  if (dbUrl) {
    // Override DATABASE_URL with the selected connection (public or internal)
    env.DATABASE_URL = dbUrl;
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try to check migration status - this will fail if database is unreachable
      execSync(prismaCommand, {
        stdio: 'pipe',
        env: env,
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
    console.error('2. Set DATABASE_PUBLIC_URL for TCP proxy connection:');
    console.error('   - Go to Railway dashboard → PostgreSQL service → Connect');
    console.error('   - Copy the "Public Network" connection string');
    console.error('   - Set it as DATABASE_PUBLIC_URL in your app service variables');
    console.error('   - Format: postgresql://user:password@public-host:port/database');
    console.error('');
    console.error('3. Verify services are linked:');
    console.error('   - Ensure your app service is linked to PostgreSQL service');
    console.error('   - Railway should auto-generate DATABASE_URL when linked');
    console.error('');
    console.error('4. Check connection URLs:');
    console.error('   - DATABASE_PUBLIC_URL: Public TCP proxy (recommended for migrations)');
    console.error('   - DATABASE_URL: Internal connection (postgres.railway.internal:5432)');
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
    
    // Use the correct database URL (public or internal)
    const dbUrl = getDatabaseUrl();
    const env = { ...process.env };
    if (dbUrl) {
      // Override DATABASE_URL with the selected connection
      env.DATABASE_URL = dbUrl;
      if (process.env.DATABASE_PUBLIC_URL) {
        console.log('🔗 Using public TCP connection for migration');
      }
    }
    
    execSync(prismaCommand, {
      stdio: 'inherit',
      env: env,
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
    console.error('1. Check DATABASE_PUBLIC_URL or DATABASE_URL is correct');
    console.error('2. Verify database service is running in Railway');
    console.error('3. Set DATABASE_PUBLIC_URL for public TCP connection:');
    console.error('   - Railway dashboard → PostgreSQL service → Connect');
    console.error('   - Copy "Public Network" connection string');
    console.error('   - Set as DATABASE_PUBLIC_URL in app service variables');
    console.error('4. Ensure services are linked in Railway');
    console.error('5. Check migration files exist in prisma/migrations/');
    console.error('6. Ensure Prisma version matches (should be 6.x)');
    console.error('');
    console.error('Railway-specific checks:');
    console.error('- Go to Railway dashboard → Your project → PostgreSQL service');
    console.error('- Verify service is "Active" and not "Paused"');
    console.error('- Check service logs for any errors');
    console.error('- Use DATABASE_PUBLIC_URL for reliable TCP connections');
    console.error('');
    
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
