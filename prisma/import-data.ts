import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Get Railway database URL (prioritize DATABASE_PUBLIC_URL for Railway proxy connections)
function getRailwayDatabaseUrl(): string {
  // Priority 1: Use Railway public TCP proxy connection
  if (process.env.DATABASE_PUBLIC_URL) {
    const url = process.env.DATABASE_PUBLIC_URL.trim();
    if (url && url.length > 0 && url !== 'undefined' && !url.includes('undefined')) {
      // Validate URL format
      if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
        throw new Error(
          `Invalid DATABASE_PUBLIC_URL format. Expected postgresql:// or postgres:// URL.\n` +
          `Got: ${url.substring(0, 50)}...`
        );
      }
      console.log('✓ Using DATABASE_PUBLIC_URL for Railway database');
      return url;
    }
  }
  
  // Priority 2: Fall back to standard DATABASE_URL (should be Railway in production)
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL.trim();
    if (url && url.length > 0 && url !== 'undefined' && !url.includes('undefined')) {
      // Check if it's a local database URL (should warn)
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        console.warn('⚠️  WARNING: DATABASE_URL appears to be a local database URL.');
        console.warn('   For importing to Railway, please set DATABASE_PUBLIC_URL');
        console.warn('   or ensure DATABASE_URL points to your Railway database.');
      }
      // Validate URL format
      if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
        throw new Error(
          `Invalid DATABASE_URL format. Expected postgresql:// or postgres:// URL.\n` +
          `Got: ${url.substring(0, 50)}...`
        );
      }
      console.log('✓ Using DATABASE_URL for Railway database');
      return url;
    }
  }
  
  // Show helpful error message
  console.error('\n❌ Database URL Error:');
  console.error('   DATABASE_PUBLIC_URL:', process.env.DATABASE_PUBLIC_URL || '(not set)');
  console.error('   DATABASE_URL:', process.env.DATABASE_URL ? '***set***' : '(not set)');
  console.error('\n💡 To fix this:');
  console.error('   1. Get your Railway database URL from Railway dashboard');
  console.error('   2. Set DATABASE_PUBLIC_URL in your environment:');
  console.error('      PowerShell: $env:DATABASE_PUBLIC_URL = "postgresql://..."');
  console.error('      Or add to .env file: DATABASE_PUBLIC_URL="postgresql://..."');
  console.error('   3. Or use Railway CLI: railway variables');
  
  throw new Error(
    "DATABASE_URL or DATABASE_PUBLIC_URL environment variable is not set or invalid.\n" +
    "Please set DATABASE_PUBLIC_URL to your Railway database connection string.\n" +
    "Example: postgresql://user:password@host:port/database"
  );
}

const railwayDatabaseUrl = getRailwayDatabaseUrl();

// Validate the URL before creating Prisma client
try {
  // Basic validation - check if URL has required components
  if (!railwayDatabaseUrl.includes('@') || !railwayDatabaseUrl.includes('://')) {
    throw new Error('Invalid URL format - missing required components');
  }
  // Try to parse as URL (replace postgres with http for URL parsing)
  const testUrl = railwayDatabaseUrl.replace(/^postgres(ql)?:/, 'http:');
  const url = new URL(testUrl);
  if (!url.hostname || url.hostname === '' || url.hostname === 'undefined') {
    throw new Error('Empty or invalid hostname in database URL');
  }
} catch (error: any) {
  console.error('\n❌ Invalid database URL format');
  console.error('   Error:', error.message);
  console.error('   URL (masked):', railwayDatabaseUrl.replace(/:[^:@]+@/, ':****@').substring(0, 80) + '...');
  console.error('\n💡 Please check your DATABASE_PUBLIC_URL or DATABASE_URL');
  throw new Error('Invalid database URL. Please check your Railway database connection string.');
}

process.env.DATABASE_URL = railwayDatabaseUrl;

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const exportDir = path.join(process.cwd(), 'prisma', 'data-export');

// Check for reset flag
const shouldReset = process.argv.includes('--reset') || process.argv.includes('-r');

// Function to clear all data (in correct order to respect foreign keys)
async function clearDatabase() {
  console.log("🗑️  Clearing Railway database...");
  
  // Helper function to safely delete (handles missing tables)
  const safeDelete = async (model: any, name: string) => {
    try {
      await model.deleteMany();
      return true;
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.log(`   ⚠️  Table ${name} does not exist, skipping...`);
        return false;
      }
      throw error;
    }
  };
  
  await safeDelete(prisma.payoutAuditLog, 'PayoutAuditLog');
  await safeDelete(prisma.auditLog, 'AuditLog');
  await safeDelete(prisma.transaction, 'Transaction');
  await safeDelete(prisma.payout, 'Payout');
  await safeDelete(prisma.distribution, 'Distribution');
  await safeDelete(prisma.rentalStatement, 'RentalStatement');
  await safeDelete(prisma.document, 'Document');
  await safeDelete(prisma.referralSignup, 'ReferralSignup');
  await safeDelete(prisma.referralCode, 'ReferralCode');
  await safeDelete(prisma.investment, 'Investment');
  await safeDelete(prisma.property, 'Property');
  await safeDelete(prisma.onboarding, 'Onboarding');
  await safeDelete(prisma.profile, 'Profile');
  await safeDelete(prisma.session, 'Session');
  await safeDelete(prisma.account, 'Account');
  await safeDelete(prisma.verificationToken, 'VerificationToken');
  await safeDelete(prisma.user, 'User');
  
  console.log("✅ Railway database cleared");
}

async function importData() {
  console.log("📥 Importing data to Railway database...\n");

  // Check if export directory exists
  if (!fs.existsSync(exportDir)) {
    throw new Error(`Export directory not found: ${exportDir}\nPlease run 'npm run db:export' first.`);
  }

  // Check if summary file exists
  const summaryPath = path.join(exportDir, 'summary.json');
  if (!fs.existsSync(summaryPath)) {
    throw new Error(`Summary file not found: ${summaryPath}\nPlease run 'npm run db:export' first.`);
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8')) as {
    exportedAt: string;
    counts: Record<string, number>;
  };
  console.log(`📊 Found export from ${new Date(summary.exportedAt).toLocaleString()}`);
  console.log(`   Ready to import ${Object.values(summary.counts).reduce((a: number, b: number) => a + b, 0)} records\n`);

  if (shouldReset) {
    await clearDatabase();
  }

  try {
    // Import Users (with related data)
    const usersPath = path.join(exportDir, 'users.json');
    if (fs.existsSync(usersPath)) {
      console.log("👥 Importing users...");
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      
      for (const userData of users) {
        // Extract nested data
        const { profile, onboarding, ...userFields } = userData;
        
        // Remove userId from nested objects (Prisma handles this automatically)
        const profileData = profile ? (({ userId, ...rest }) => rest)(profile) : undefined;
        const onboardingData = onboarding ? (({ userId, ...rest }) => rest)(onboarding) : undefined;
        
        // Create or update user
        let user;
        const { id, createdAt, updatedAt, ...userFieldsWithoutMeta } = userFields;
        
        if (userFields.email) {
          // Use email as unique identifier if available
          // Check if user exists first
          const existingUser = await prisma.user.findUnique({
            where: { email: userFields.email },
          });
          
          if (existingUser) {
            // Update existing user (can't update createdAt, so we'll update other fields)
            user = await prisma.user.update({
              where: { email: userFields.email },
              data: userFieldsWithoutMeta,
            });
          } else {
            // Create new user with original data
            user = await prisma.user.create({
              data: {
                ...userFields,
                profile: profileData ? {
                  create: profileData,
                } : undefined,
                onboarding: onboardingData ? {
                  create: onboardingData,
                } : undefined,
              },
            });
          }
        } else {
          // If no email, try to find by ID or create new
          try {
            user = await prisma.user.findUnique({
              where: { id: userFields.id },
            });
            if (user) {
              user = await prisma.user.update({
                where: { id: userFields.id },
                data: userFieldsWithoutMeta,
              });
            } else {
              user = await prisma.user.create({
                data: {
                  ...userFields,
                  profile: profileData ? {
                    create: profileData,
                  } : undefined,
                  onboarding: onboardingData ? {
                    create: onboardingData,
                  } : undefined,
                },
              });
            }
          } catch {
            // If ID doesn't exist, create new user
            user = await prisma.user.create({
              data: {
                ...userFields,
                profile: profileData ? {
                  create: profileData,
                } : undefined,
                onboarding: onboardingData ? {
                  create: onboardingData,
                } : undefined,
              },
            });
          }
        }

        // If user exists, update profile and onboarding separately
        if (profileData && user.id) {
          await prisma.profile.upsert({
            where: { userId: user.id },
            update: profileData,
            create: { ...profileData, userId: user.id },
          });
        }

        if (onboardingData && user.id) {
          await prisma.onboarding.upsert({
            where: { userId: user.id },
            update: onboardingData,
            create: { ...onboardingData, userId: user.id },
          });
        }
      }
      console.log(`   ✅ Imported ${users.length} users`);
    }

    // Import Properties
    const propertiesPath = path.join(exportDir, 'properties.json');
    if (fs.existsSync(propertiesPath)) {
      console.log("🏠 Importing properties...");
      const properties = JSON.parse(fs.readFileSync(propertiesPath, 'utf-8'));
      
      for (const propertyData of properties) {
        const { id: propId, createdAt: propCreatedAt, updatedAt: propUpdatedAt, ...propertyFields } = propertyData;
        const existingProperty = await prisma.property.findUnique({
          where: { slug: propertyData.slug },
        });
        
        if (existingProperty) {
          await prisma.property.update({
            where: { slug: propertyData.slug },
            data: propertyFields,
          });
        } else {
          await prisma.property.create({
            data: propertyData,
          });
        }
      }
      console.log(`   ✅ Imported ${properties.length} properties`);
    }

    // Import Investments
    const investmentsPath = path.join(exportDir, 'investments.json');
    if (fs.existsSync(investmentsPath)) {
      console.log("💰 Importing investments...");
      const investments = JSON.parse(fs.readFileSync(investmentsPath, 'utf-8'));
      
      for (const investmentData of investments) {
        const { createdAt: invCreatedAt, updatedAt: invUpdatedAt, ...investmentFields } = investmentData;
        const existingInvestment = await prisma.investment.findUnique({
          where: { id: investmentData.id },
        });
        
        if (existingInvestment) {
          await prisma.investment.update({
            where: { id: investmentData.id },
            data: investmentFields,
          });
        } else {
          await prisma.investment.create({
            data: investmentData,
          });
        }
      }
      console.log(`   ✅ Imported ${investments.length} investments`);
    }

    // Import Rental Statements
    const rentalStatementsPath = path.join(exportDir, 'rental-statements.json');
    if (fs.existsSync(rentalStatementsPath)) {
      console.log("📄 Importing rental statements...");
      const rentalStatements = JSON.parse(fs.readFileSync(rentalStatementsPath, 'utf-8'));
      
      for (const statementData of rentalStatements) {
        const { createdAt: stmtCreatedAt, updatedAt: stmtUpdatedAt, ...statementFields } = statementData;
        const existingStatement = await prisma.rentalStatement.findUnique({
          where: { id: statementData.id },
        });
        
        if (existingStatement) {
          await prisma.rentalStatement.update({
            where: { id: statementData.id },
            data: statementFields,
          });
        } else {
          await prisma.rentalStatement.create({
            data: statementData,
          });
        }
      }
      console.log(`   ✅ Imported ${rentalStatements.length} rental statements`);
    }

    // Import Distributions
    const distributionsPath = path.join(exportDir, 'distributions.json');
    if (fs.existsSync(distributionsPath)) {
      console.log("💵 Importing distributions...");
      const distributions = JSON.parse(fs.readFileSync(distributionsPath, 'utf-8'));
      
      for (const distributionData of distributions) {
        const { createdAt: distCreatedAt, updatedAt: distUpdatedAt, ...distributionFields } = distributionData;
        const existingDistribution = await prisma.distribution.findUnique({
          where: { id: distributionData.id },
        });
        
        if (existingDistribution) {
          await prisma.distribution.update({
            where: { id: distributionData.id },
            data: distributionFields,
          });
        } else {
          await prisma.distribution.create({
            data: distributionData,
          });
        }
      }
      console.log(`   ✅ Imported ${distributions.length} distributions`);
    }

    // Import Payouts
    const payoutsPath = path.join(exportDir, 'payouts.json');
    if (fs.existsSync(payoutsPath)) {
      console.log("💸 Importing payouts...");
      const payouts = JSON.parse(fs.readFileSync(payoutsPath, 'utf-8'));
      
      for (const payoutData of payouts) {
        const { createdAt: payoutCreatedAt, updatedAt: payoutUpdatedAt, ...payoutFields } = payoutData;
        const existingPayout = await prisma.payout.findUnique({
          where: { id: payoutData.id },
        });
        
        if (existingPayout) {
          await prisma.payout.update({
            where: { id: payoutData.id },
            data: payoutFields,
          });
        } else {
          await prisma.payout.create({
            data: payoutData,
          });
        }
      }
      console.log(`   ✅ Imported ${payouts.length} payouts`);
    }

    // Import Transactions
    const transactionsPath = path.join(exportDir, 'transactions.json');
    if (fs.existsSync(transactionsPath)) {
      console.log("💳 Importing transactions...");
      const transactions = JSON.parse(fs.readFileSync(transactionsPath, 'utf-8'));
      
      for (const transactionData of transactions) {
        const { createdAt: txCreatedAt, ...transactionFields } = transactionData;
        const existingTransaction = await prisma.transaction.findUnique({
          where: { id: transactionData.id },
        });
        
        if (existingTransaction) {
          await prisma.transaction.update({
            where: { id: transactionData.id },
            data: transactionFields,
          });
        } else {
          await prisma.transaction.create({
            data: transactionData,
          });
        }
      }
      console.log(`   ✅ Imported ${transactions.length} transactions`);
    }

    // Import Documents
    const documentsPath = path.join(exportDir, 'documents.json');
    if (fs.existsSync(documentsPath)) {
      console.log("📋 Importing documents...");
      const documents = JSON.parse(fs.readFileSync(documentsPath, 'utf-8'));
      
      for (const documentData of documents) {
        const { createdAt: docCreatedAt, ...documentFields } = documentData;
        const existingDocument = await prisma.document.findUnique({
          where: { id: documentData.id },
        });
        
        if (existingDocument) {
          await prisma.document.update({
            where: { id: documentData.id },
            data: documentFields,
          });
        } else {
          await prisma.document.create({
            data: documentData,
          });
        }
      }
      console.log(`   ✅ Imported ${documents.length} documents`);
    }

    // Import Referral Codes
    const referralCodesPath = path.join(exportDir, 'referral-codes.json');
    if (fs.existsSync(referralCodesPath)) {
      console.log("🎁 Importing referral codes...");
      const referralCodes = JSON.parse(fs.readFileSync(referralCodesPath, 'utf-8'));
      
      for (const codeData of referralCodes) {
        await prisma.referralCode.upsert({
          where: { userId: codeData.userId },
          update: codeData,
          create: codeData,
        });
      }
      console.log(`   ✅ Imported ${referralCodes.length} referral codes`);
    }

    // Import Audit Logs
    const auditLogsPath = path.join(exportDir, 'audit-logs.json');
    if (fs.existsSync(auditLogsPath)) {
      console.log("📝 Importing audit logs...");
      const auditLogs = JSON.parse(fs.readFileSync(auditLogsPath, 'utf-8'));
      
      for (const logData of auditLogs) {
        await prisma.auditLog.create({
          data: logData,
        });
      }
      console.log(`   ✅ Imported ${auditLogs.length} audit logs`);
    }

    console.log("\n✨ Import completed successfully!");
    console.log("\n📊 Final counts in Railway database:");
    console.log(`   - Users: ${await prisma.user.count()}`);
    console.log(`   - Properties: ${await prisma.property.count()}`);
    console.log(`   - Investments: ${await prisma.investment.count()}`);
    console.log(`   - Rental Statements: ${await prisma.rentalStatement.count()}`);
    console.log(`   - Distributions: ${await prisma.distribution.count()}`);
    console.log(`   - Payouts: ${await prisma.payout.count()}`);
    console.log(`   - Transactions: ${await prisma.transaction.count()}`);
    console.log(`   - Documents: ${await prisma.document.count()}`);
    console.log(`   - Referral Codes: ${await prisma.referralCode.count()}`);
    console.log(`   - Audit Logs: ${await prisma.auditLog.count()}`);

  } catch (error) {
    console.error("❌ Error importing data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importData().catch((error) => {
  console.error(error);
  process.exit(1);
});

