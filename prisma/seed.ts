import "dotenv/config";
import { PrismaClient, PropertyStatus, DistributionStatus, PayoutStatus, InvestmentStatus } from "@prisma/client";

// Get database URL (prioritize DATABASE_PUBLIC_URL for Railway proxy connections)
function getDatabaseUrl(): string {
  // Priority 1: Use Railway public TCP proxy connection
  if (process.env.DATABASE_PUBLIC_URL) {
    const url = process.env.DATABASE_PUBLIC_URL.trim();
    if (url && url.length > 0) {
      console.log('✓ Using DATABASE_PUBLIC_URL for seeding');
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

// Create Prisma Client (Prisma 6.x reads DATABASE_URL from environment automatically)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Check for reset flag
const shouldReset = process.argv.includes('--reset') || process.argv.includes('-r');

// Helper function to generate slug from name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Cities in Nigeria
const cities = [
  { city: "Lagos", country: "Nigeria" },
  { city: "Abuja", country: "Nigeria" },
  { city: "Port Harcourt", country: "Nigeria" },
  { city: "Ibadan", country: "Nigeria" },
  { city: "Kano", country: "Nigeria" },
  { city: "Calabar", country: "Nigeria" },
];

const propertyTypes = ["APARTMENT", "VILLA", "STUDIO", "HOUSE", "CONDO", "TOWNHOUSE"] as const;
const shortletModels = ["ENTIRE_HOME", "PRIVATE_ROOM"] as const;

// Function to clear all data (in correct order to respect foreign keys)
async function clearDatabase() {
  console.log("🗑️  Clearing existing data...");
  
  // Delete in reverse order of dependencies
  await prisma.payoutAuditLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.rentalStatement.deleteMany();
  await prisma.document.deleteMany();
  await prisma.referralSignup.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.property.deleteMany();
  await prisma.onboarding.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  
  console.log("✅ Database cleared");
}

// Function to check and include existing test data
async function findExistingTestData() {
  console.log("🔍 Checking for existing test data...");
  
  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        not: {
          in: [
            "pogbonna@gmail.com",
            "user1@example.com",
            "user2@example.com",
            "user3@example.com",
            "user4@example.com",
            "user5@example.com",
          ],
        },
      },
    },
    include: {
      profile: true,
      onboarding: true,
    },
  });

  const existingProperties = await prisma.property.findMany({
    where: {
      slug: {
        not: {
          in: [
            "luxury-beachfront-villa-lekki",
            "modern-apartment-victoria-island",
            "executive-studio-ikoyi",
            "premium-condo-abuja",
            "spacious-house-port-harcourt",
            "townhouse-ibadan",
            "boutique-villa-calabar",
            "city-apartment-kano",
            "waterfront-villa-lagos",
            "garden-house-abuja",
            "skyline-condo-lagos",
            "heritage-villa-port-harcourt",
          ],
        },
      },
    },
  });

  console.log(`   Found ${existingUsers.length} existing test users`);
  console.log(`   Found ${existingProperties.length} existing test properties`);

  return { existingUsers, existingProperties };
}

async function main() {
  console.log("🌱 Seeding database...");

  // Reset database if flag is set
  if (shouldReset) {
    console.log("\n⚠️  RESET MODE: All existing data will be deleted!");
    await clearDatabase();
  } else {
    // Check for existing test data
    const { existingUsers, existingProperties } = await findExistingTestData();
    console.log(`\n📝 Note: Found ${existingUsers.length} test users and ${existingProperties.length} test properties that will be preserved.\n`);
  }

  // Check if passwordHash column exists in the database
  let hasPasswordHashColumn = false;
  try {
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'passwordHash'
    `;
    hasPasswordHashColumn = result.length > 0;
  } catch (error: any) {
    console.log('⚠️  Could not check for passwordHash column:', error.message);
  }

  if (!hasPasswordHashColumn) {
    console.log('');
    console.log('⚠️  WARNING: passwordHash column not found in database');
    console.log('   The seed script requires the passwordHash column to exist.');
    console.log('   Please run the migration first:');
    console.log('   npm run db:migrate:deploy');
    console.log('');
    console.log('   Or if using Railway:');
    console.log('   railway run npm run db:migrate:deploy');
    console.log('');
    throw new Error('passwordHash column does not exist. Please run migrations first.');
  }

  // Create test users
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.upsert({
      where: { email: `user${i}@example.com` },
      update: {},
      create: {
        email: `user${i}@example.com`,
        name: `Test User ${i}`,
        role: "INVESTOR",
        emailVerified: new Date(),
        profile: {
          create: {
            phone: `+234800000000${i}`,
            address: `${i} Test Street`,
            country: "Nigeria",
            dob: new Date(1990, 0, 1),
          },
        },
        onboarding: {
          create: {
            status: "COMPLETED",
            kycStatus: "APPROVED",
            riskAnswers: {
              riskTolerance: "moderate",
              investmentExperience: "intermediate",
            },
          },
        },
      },
    });
    users.push(user);
    console.log(`✅ Created/Updated user: ${user.email}`);
  }

  // Include existing test users if not resetting
  if (!shouldReset) {
    const { existingUsers } = await findExistingTestData();
    users.push(...existingUsers);
    if (existingUsers.length > 0) {
      console.log(`✅ Included ${existingUsers.length} existing test users`);
    }
  }

  // Create admin user for development login (admin/admin123)
  const bcrypt = require("bcryptjs");
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  
  const admin = await prisma.user.upsert({
    where: { email: "pogbonna@gmail.com" },
    update: {
      role: "ADMIN", // Ensure role is ADMIN even if user exists
      passwordHash: adminPasswordHash, // Ensure password hash is set
    },
    create: {
      email: "pogbonna@gmail.com",
      name: "Admin",
      role: "ADMIN",
      emailVerified: new Date(),
      passwordHash: adminPasswordHash,
      profile: {
        create: {},
      },
      onboarding: {
        create: {
          status: "COMPLETED",
          kycStatus: "APPROVED",
        },
      },
    },
  });
  console.log(`✅ Created/Updated admin: ${admin.email} (Login: admin/admin123)`);

  // Create 10 properties
  const properties = [];
  const propertyNames = [
    "Luxury Beachfront Villa Lekki",
    "Modern Apartment Victoria Island",
    "Executive Studio Ikoyi",
    "Premium Condo Abuja",
    "Spacious House Port Harcourt",
    "Townhouse Ibadan",
    "Boutique Villa Calabar",
    "City Apartment Kano",
    "Waterfront Villa Lagos",
    "Garden House Abuja",
    "Skyline Condo Lagos",
    "Heritage Villa Port Harcourt",
  ];

  for (let i = 0; i < propertyNames.length; i++) {
    const name = propertyNames[i];
    const cityData = cities[i % cities.length];
    const propertyType = propertyTypes[i % propertyTypes.length];
    const shortletModel = shortletModels[i % shortletModels.length];
    const slug = slugify(name);

    // Use smaller values to ensure we stay well within DECIMAL(12,2) limits
    const totalShares = [5000, 7500, 10000, 12500][i % 4];
    const pricePerShare = 50000.00; // NGN50,000.00 per share (reduced from 60k for safety)
    // Calculate targetRaise, ensuring it doesn't exceed DECIMAL(12,2) limit
    // DECIMAL(12,2) max is 9,999,999,999.99 (must be < 10^10)
    // Use a conservative max to avoid any precision/rounding issues
    const maxAllowedValue = 9999999999.00; // Well below the theoretical max
    const calculatedTargetRaise = Number(totalShares) * Number(pricePerShare);
    
    // Cap the value and round to 2 decimal places
    const targetRaise = Math.min(
      Math.round(calculatedTargetRaise * 100) / 100, // Round to 2 decimals
      maxAllowedValue // Cap at max
    );
    const availableShares = Math.floor(totalShares * (0.3 + Math.random() * 0.5)); // 30-80% available
    const projectedYield = [7.5, 8.0, 8.5, 9.0, 9.5, 10.0][i % 6];

    const propertyData = {
      slug,
      name,
      city: cityData.city,
      country: cityData.country,
      addressShort: `${i + 1} ${cityData.city} Street`,
      description: `A beautiful ${propertyType.toLowerCase()} located in the heart of ${cityData.city}. This property offers modern amenities, excellent location, and strong rental potential. Perfect for short-term rentals with high occupancy rates.`,
      highlights: [
        "Prime location",
        "Modern amenities",
        "High rental yield",
        "Professional management",
        "Fully furnished",
      ],
      // Use Picsum Photos for reliable placeholder images
      coverImage: `https://picsum.photos/800/600?random=${i}`,
      gallery: [
        `https://picsum.photos/800/600?random=${i}`,
        `https://picsum.photos/800/600?random=${i + 100}`,
        `https://picsum.photos/800/600?random=${i + 200}`,
      ],
      propertyType,
      shortletModel,
      totalShares,
      availableShares,
      pricePerShare,
      minShares: [10, 5, 20, 15][i % 4],
      targetRaise,
      status: availableShares > totalShares * 0.2 ? PropertyStatus.OPEN : PropertyStatus.FUNDED,
      projectedAnnualYieldPct: projectedYield,
    };

    const property = await prisma.property.upsert({
      where: { slug },
      update: propertyData,
      create: propertyData,
    });
    properties.push(property);
    console.log(`✅ Created/Updated property: ${property.name} (${property.slug})`);
  }

  // Include existing test properties if not resetting
  if (!shouldReset) {
    const { existingProperties } = await findExistingTestData();
    properties.push(...existingProperties);
    if (existingProperties.length > 0) {
      console.log(`✅ Included ${existingProperties.length} existing test properties`);
    }
  }

  // Create investments for some users (only if resetting, to avoid duplicates)
  if (shouldReset) {
  console.log("\n📊 Creating investments...");
  for (let i = 0; i < 3; i++) {
    const user = users[i];
    const property = properties[i];
    const shares = property.minShares * (2 + i); // Invest 2-4x minimum

    // Calculate totalAmount, ensuring it doesn't exceed DECIMAL(12,2) limit
    const maxAllowedValue = 9999999999.99;
    const calculatedTotalAmount = Number(property.pricePerShare) * shares;
    const totalAmount = calculatedTotalAmount > maxAllowedValue 
      ? maxAllowedValue 
      : Number(calculatedTotalAmount.toFixed(2));

    const investment = await prisma.investment.create({
      data: {
        userId: user.id,
        propertyId: property.id,
        shares,
        pricePerShareAtPurchase: property.pricePerShare,
        totalAmount,
        status: InvestmentStatus.CONFIRMED,
      },
    });
    console.log(`✅ Created investment: User ${user.email} → ${shares} shares in ${property.name}`);
  }
  }

  // Create 6 months of rental statements for first 5 properties (only if resetting)
  if (shouldReset) {
  console.log("\n💰 Creating rental statements...");
  const now = new Date();
  for (let propIndex = 0; propIndex < 5; propIndex++) {
    const property = properties[propIndex];
    
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0);

      // Generate realistic rental data
      const baseRevenue = 50000 + Math.random() * 30000; // 50k-80k
      const occupancyRate = 65 + Math.random() * 25; // 65-90%
      const maxAllowedValue = 9999999999.99;
      
      // Calculate values and ensure they don't exceed DECIMAL(12,2) limit
      const grossRevenue = Math.min(
        Number((baseRevenue * (occupancyRate / 100)).toFixed(2)),
        maxAllowedValue
      );
      const operatingCosts = Math.min(
        Number((grossRevenue * (0.15 + Math.random() * 0.1)).toFixed(2)),
        maxAllowedValue
      );
      const managementFee = Math.min(
        Number((grossRevenue * 0.1).toFixed(2)),
        maxAllowedValue
      );
      const netDistributable = Math.min(
        Number((grossRevenue - operatingCosts - managementFee).toFixed(2)),
        maxAllowedValue
      );
      const adr = Number((grossRevenue / 30).toFixed(2)); // Average daily rate

      const rentalStatement = await prisma.rentalStatement.create({
        data: {
          propertyId: property.id,
          periodStart,
          periodEnd,
          grossRevenue,
          operatingCosts,
          managementFee,
          netDistributable,
          occupancyRatePct: occupancyRate,
          adr,
          notes: `Monthly rental statement for ${periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
        },
      });

      // Create distribution for this statement
      const distribution = await prisma.distribution.create({
        data: {
          propertyId: property.id,
          rentalStatementId: rentalStatement.id,
          declaredAt: periodEnd,
          totalDistributed: netDistributable,
          status: monthOffset <= 2 ? DistributionStatus.PAID : DistributionStatus.DECLARED, // Last 3 months paid
        },
      });

      // Create payouts for users who invested in this property
      const investments = await prisma.investment.findMany({
        where: {
          propertyId: property.id,
          status: InvestmentStatus.CONFIRMED,
        },
      });

      for (const investment of investments) {
        // Calculate payout amount, ensuring it doesn't exceed DECIMAL(12,2) limit
        const maxAllowedValue = 9999999999.99;
        const calculatedPayoutAmount = (Number(investment.shares) / property.totalShares) * netDistributable;
        const payoutAmount = calculatedPayoutAmount > maxAllowedValue 
          ? maxAllowedValue 
          : Number(calculatedPayoutAmount.toFixed(2));
        
        await prisma.payout.create({
          data: {
            userId: investment.userId,
            propertyId: property.id,
            distributionId: distribution.id,
            rentalStatementId: rentalStatement.id,
            sharesAtRecord: investment.shares,
            amount: payoutAmount,
            status: monthOffset <= 2 ? PayoutStatus.PAID : PayoutStatus.PENDING,
            paidAt: monthOffset <= 2 ? periodEnd : null,
          },
        });
      }

      console.log(
        `✅ Created rental statement for ${property.name} (${periodStart.toLocaleDateString("en-US", { month: "short", year: "numeric" })})`
      );
    }
  }
  }

  // Create transactions (only if resetting)
  if (shouldReset) {
  console.log("\n💳 Creating transactions...");
  const investments = await prisma.investment.findMany({
    where: { status: InvestmentStatus.CONFIRMED },
  });

  for (const investment of investments) {
    await prisma.transaction.create({
      data: {
        userId: investment.userId,
        type: "INVESTMENT",
        amount: investment.totalAmount,
        currency: "NGN", // Amounts are stored in NGN
        reference: `INV-${investment.id.slice(0, 8)}`,
      },
    });
  }

  const payouts = await prisma.payout.findMany({
    where: { status: PayoutStatus.PAID },
  });

  for (const payout of payouts) {
    await prisma.transaction.create({
      data: {
        userId: payout.userId,
        type: "PAYOUT",
        amount: payout.amount,
        currency: "NGN", // Amounts are stored in NGN
        reference: `PAY-${payout.id.slice(0, 8)}`,
      },
    });
  }
  console.log(`✅ Created ${investments.length + payouts.length} transactions`);
  }

  // Create documents (only if resetting)
  if (shouldReset) {
  console.log("\n📄 Creating documents...");
  
  // Global documents
  await prisma.document.createMany({
    data: [
      {
        scope: "GLOBAL",
        title: "Terms of Service",
        url: "/documents/terms-of-service.pdf",
        docType: "AGREEMENT",
      },
      {
        scope: "GLOBAL",
        title: "Privacy Policy",
        url: "/documents/privacy-policy.pdf",
        docType: "AGREEMENT",
      },
      {
        scope: "GLOBAL",
        title: "Investment Guide",
        url: "/documents/investment-guide.pdf",
        docType: "PROSPECTUS",
      },
    ],
  });

  // Property documents
  for (const property of properties.slice(0, 5)) {
    await prisma.document.createMany({
      data: [
        {
          scope: "PROPERTY",
          propertyId: property.id,
          title: `${property.name} - Property Prospectus`,
          url: `/documents/properties/${property.slug}/prospectus.pdf`,
          docType: "PROSPECTUS",
        },
        {
          scope: "PROPERTY",
          propertyId: property.id,
          title: `${property.name} - Purchase Agreement`,
          url: `/documents/properties/${property.slug}/agreement.pdf`,
          docType: "AGREEMENT",
        },
      ],
    });
  }

  // User statements
  for (const user of users.slice(0, 3)) {
    await prisma.document.create({
      data: {
        scope: "USER",
        userId: user.id,
        title: `Investment Statement - ${new Date().toLocaleDateString()}`,
        url: `/documents/users/${user.id}/statement.pdf`,
        docType: "STATEMENT",
      },
    });
  }
  console.log("✅ Created documents");
  }

  // Create referral codes
  console.log("\n🎁 Creating referral codes...");
  for (const user of users.slice(0, 3)) {
    const code = `REF${user.id.slice(0, 8).toUpperCase()}`;
    await prisma.referralCode.upsert({
      where: { userId: user.id },
      update: { code },
      create: {
        userId: user.id,
        code,
      },
    });
  }
  console.log("✅ Created/Updated referral codes");

  // Create audit logs (only if resetting)
  if (shouldReset) {
  console.log("\n📝 Creating audit logs...");
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "USER_CREATED",
        metadata: { count: users.length },
      },
      {
        userId: admin.id,
        action: "PROPERTY_CREATED",
        metadata: { count: properties.length },
      },
      {
        action: "SYSTEM_INITIALIZED",
        metadata: { timestamp: new Date().toISOString() },
      },
    ],
  });
  console.log("✅ Created audit logs");
  }

  console.log("\n✨ Seeding completed successfully!");
  console.log(`\n📊 Summary:`);
  console.log(`   - ${users.length + 1} users (${users.length} investors, 1 admin)`);
  console.log(`   - ${properties.length} properties`);
  if (shouldReset) {
    const investments = await prisma.investment.findMany({
      where: { status: InvestmentStatus.CONFIRMED },
    });
    console.log(`   - ${investments.length} investments`);
    console.log(`   - ${await prisma.rentalStatement.count()} rental statements`);
    console.log(`   - ${await prisma.distribution.count()} distributions`);
    console.log(`   - ${await prisma.payout.count()} payouts`);
    console.log(`   - ${await prisma.transaction.count()} transactions`);
    console.log(`   - ${await prisma.document.count()} documents`);
  } else {
    console.log(`   - (Run with --reset flag to see full statistics)`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    
    // Provide helpful error messages
    if (e instanceof Error) {
      if (e.message.includes('DATABASE_URL')) {
        console.error('\n💡 Tip: Make sure DATABASE_URL or DATABASE_PUBLIC_URL is set in your environment variables.');
      } else if (e.message.includes('Can\'t reach') || e.message.includes('P1001')) {
        console.error('\n💡 Tip: Check your database connection. Ensure:');
        console.error('   - Database service is running');
        console.error('   - DATABASE_URL or DATABASE_PUBLIC_URL is correct');
        console.error('   - Network connectivity is available');
      } else if (e.message.includes('PrismaClientInitializationError')) {
        console.error('\n💡 Tip: Try running: npx prisma generate');
        console.error('   This regenerates Prisma Client with the latest schema.');
      }
    }
    
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
