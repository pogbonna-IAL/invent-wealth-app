import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Get database URL (prioritize DATABASE_PUBLIC_URL for Railway proxy connections)
function getDatabaseUrl(): string {
  // Priority 1: Use Railway public TCP proxy connection
  if (process.env.DATABASE_PUBLIC_URL) {
    const url = process.env.DATABASE_PUBLIC_URL.trim();
    if (url && url.length > 0) {
      console.log('✓ Using DATABASE_PUBLIC_URL for checking data');
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
  
  throw new Error(
    "DATABASE_URL or DATABASE_PUBLIC_URL environment variable is not set.\n" +
    "Please set one of these variables to connect to your database."
  );
}

// Set DATABASE_URL for Prisma Client
const databaseUrl = getDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaClient();

async function checkData() {
  console.log("📊 Checking existing database data...\n");

  // Check Users
  const users = await prisma.user.findMany({
    include: {
      profile: true,
      onboarding: true,
    },
    orderBy: { createdAt: "desc" },
  });
  console.log(`👥 Users: ${users.length}`);
  users.forEach((user) => {
    console.log(`   - ${user.email} (${user.name}) - Role: ${user.role}`);
  });

  // Check Properties
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: "desc" },
  });
  console.log(`\n🏠 Properties: ${properties.length}`);
  properties.forEach((prop) => {
    console.log(`   - ${prop.name} (${prop.slug}) - Status: ${prop.status}`);
  });

  // Check Investments
  const investments = await prisma.investment.findMany({
    include: {
      user: { select: { email: true } },
      property: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\n💰 Investments: ${investments.length}`);
  investments.forEach((inv) => {
    console.log(`   - ${inv.user.email} → ${inv.shares} shares in ${inv.property.name}`);
  });

  // Check Rental Statements
  const statements = await prisma.rentalStatement.findMany({
    include: {
      property: { select: { name: true } },
    },
    orderBy: { periodStart: "desc" },
  });
  console.log(`\n📄 Rental Statements: ${statements.length}`);

  // Check Distributions
  const distributions = await prisma.distribution.count();
  console.log(`\n💵 Distributions: ${distributions}`);

  // Check Payouts
  const payouts = await prisma.payout.count();
  console.log(`\n💸 Payouts: ${payouts}`);

  // Check Transactions
  const transactions = await prisma.transaction.count();
  console.log(`\n💳 Transactions: ${transactions}`);

  await prisma.$disconnect();
}

checkData().catch(console.error);

