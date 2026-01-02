import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Get local database URL (explicitly use local, not Railway)
function getLocalDatabaseUrl(): string {
  // Check for explicit local database URL
  if (process.env.LOCAL_DATABASE_URL) {
    return process.env.LOCAL_DATABASE_URL.trim();
  }
  
  // Use DATABASE_URL but warn if it looks like Railway URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL or LOCAL_DATABASE_URL environment variable is not set.\n" +
      "Please set DATABASE_URL to your LOCAL database connection string."
    );
  }
  
  // Check if it's a Railway URL (internal or public)
  if (dbUrl.includes('railway') || dbUrl.includes('railway.internal')) {
    console.warn('⚠️  WARNING: DATABASE_URL appears to be a Railway URL.');
    console.warn('   For exporting from LOCAL database, please set LOCAL_DATABASE_URL');
    console.warn('   or ensure DATABASE_URL points to your local database.');
    throw new Error(
      "DATABASE_URL points to Railway database. For local export, please:\n" +
      "1. Set LOCAL_DATABASE_URL to your local database URL, OR\n" +
      "2. Temporarily set DATABASE_URL to your local database URL"
    );
  }
  
  return dbUrl.trim();
}

const localDatabaseUrl = getLocalDatabaseUrl();
process.env.DATABASE_URL = localDatabaseUrl;

const prisma = new PrismaClient({
  log: ['error'],
});

const exportDir = path.join(process.cwd(), 'prisma', 'data-export');

// Ensure export directory exists
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

async function exportData() {
  console.log("📤 Exporting data from LOCAL database...\n");
  console.log(`   Database: ${localDatabaseUrl.replace(/:[^:]*@/, ':****@')}\n`);

  try {
    // Export Users (with related data)
    console.log("👥 Exporting users...");
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        onboarding: true,
      },
      orderBy: { createdAt: "asc" },
    });
    fs.writeFileSync(
      path.join(exportDir, 'users.json'),
      JSON.stringify(users, null, 2)
    );
    console.log(`   ✅ Exported ${users.length} users`);

    // Export Properties
    console.log("🏠 Exporting properties...");
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: "asc" },
    });
    fs.writeFileSync(
      path.join(exportDir, 'properties.json'),
      JSON.stringify(properties, null, 2)
    );
    console.log(`   ✅ Exported ${properties.length} properties`);

    // Export Investments
    console.log("💰 Exporting investments...");
    const investments = await prisma.investment.findMany({
      orderBy: { createdAt: "asc" },
    });
    fs.writeFileSync(
      path.join(exportDir, 'investments.json'),
      JSON.stringify(investments, null, 2)
    );
    console.log(`   ✅ Exported ${investments.length} investments`);

    // Export Rental Statements
    console.log("📄 Exporting rental statements...");
    const rentalStatements = await prisma.rentalStatement.findMany({
      orderBy: { periodStart: "asc" },
    });
    fs.writeFileSync(
      path.join(exportDir, 'rental-statements.json'),
      JSON.stringify(rentalStatements, null, 2)
    );
    console.log(`   ✅ Exported ${rentalStatements.length} rental statements`);

    // Export Distributions
    console.log("💵 Exporting distributions...");
    const distributions = await prisma.distribution.findMany({
      orderBy: { createdAt: "asc" },
    });
    fs.writeFileSync(
      path.join(exportDir, 'distributions.json'),
      JSON.stringify(distributions, null, 2)
    );
    console.log(`   ✅ Exported ${distributions.length} distributions`);

    // Export Payouts
    console.log("💸 Exporting payouts...");
    const payouts = await prisma.payout.findMany({
      orderBy: { createdAt: "asc" },
    });
    fs.writeFileSync(
      path.join(exportDir, 'payouts.json'),
      JSON.stringify(payouts, null, 2)
    );
    console.log(`   ✅ Exported ${payouts.length} payouts`);

    // Export Transactions
    console.log("💳 Exporting transactions...");
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: "asc" },
    });
    fs.writeFileSync(
      path.join(exportDir, 'transactions.json'),
      JSON.stringify(transactions, null, 2)
    );
    console.log(`   ✅ Exported ${transactions.length} transactions`);

    // Export Documents
    console.log("📋 Exporting documents...");
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: "asc" },
    });
    fs.writeFileSync(
      path.join(exportDir, 'documents.json'),
      JSON.stringify(documents, null, 2)
    );
    console.log(`   ✅ Exported ${documents.length} documents`);

    // Export Referral Codes
    console.log("🎁 Exporting referral codes...");
    const referralCodes = await prisma.referralCode.findMany({
      orderBy: { createdAt: "asc" },
    });
    fs.writeFileSync(
      path.join(exportDir, 'referral-codes.json'),
      JSON.stringify(referralCodes, null, 2)
    );
    console.log(`   ✅ Exported ${referralCodes.length} referral codes`);

    // Export Audit Logs
    console.log("📝 Exporting audit logs...");
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
    });
    fs.writeFileSync(
      path.join(exportDir, 'audit-logs.json'),
      JSON.stringify(auditLogs, null, 2)
    );
    console.log(`   ✅ Exported ${auditLogs.length} audit logs`);

    // Create summary
    const summary = {
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        properties: properties.length,
        investments: investments.length,
        rentalStatements: rentalStatements.length,
        distributions: distributions.length,
        payouts: payouts.length,
        transactions: transactions.length,
        documents: documents.length,
        referralCodes: referralCodes.length,
        auditLogs: auditLogs.length,
      },
    };

    fs.writeFileSync(
      path.join(exportDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log("\n✨ Export completed successfully!");
    console.log(`\n📊 Summary:`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Properties: ${properties.length}`);
    console.log(`   - Investments: ${investments.length}`);
    console.log(`   - Rental Statements: ${rentalStatements.length}`);
    console.log(`   - Distributions: ${distributions.length}`);
    console.log(`   - Payouts: ${payouts.length}`);
    console.log(`   - Transactions: ${transactions.length}`);
    console.log(`   - Documents: ${documents.length}`);
    console.log(`   - Referral Codes: ${referralCodes.length}`);
    console.log(`   - Audit Logs: ${auditLogs.length}`);
    console.log(`\n📁 Data exported to: ${exportDir}`);

  } catch (error) {
    console.error("❌ Error exporting data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportData().catch((error) => {
  console.error(error);
  process.exit(1);
});

