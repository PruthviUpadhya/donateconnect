import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../src/db/prisma";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_CATEGORIES = [
  { name: "Food", description: "Fresh, packaged, cooked, or raw food supplies", icon: "utensils" },
  { name: "Clothes", description: "Wearable garments, shoes, and blankets", icon: "shirt" },
  { name: "Books", description: "Educational textbooks, novels, and stationery", icon: "book-open" },
  { name: "Medical supplies", description: "First-aid kits, mobility aids, and OTC medicines", icon: "heart-pulse" },
  { name: "Electronics", description: "Computers, phones, gadgets, and appliances", icon: "laptop" },
  { name: "Furniture", description: "Desks, chairs, cots, and storage units", icon: "armchair" },
  { name: "Other", description: "General utility and uncategorized donations", icon: "box" },
];

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("🌱 Starting DonateConnect database seed...");

  // 1. Seed Donation Categories
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.donationCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description, icon: cat.icon },
      create: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
      },
    });
  }
  console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} donation categories`);

  // 2. Seed Initial Admin if ADMIN_EMAIL is configured
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: adminEmail,
        name: "DonateConnect Admin",
        passwordHash: hashPassword(adminPassword),
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`✅ Initial Admin seeded: ${adminUser.email}`);
  } else {
    console.log("ℹ️  ADMIN_EMAIL/ADMIN_PASSWORD not set in environment, skipping admin seed");
  }

  console.log("🎉 Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Error while seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
