import { Role, UserStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

export async function clearDatabaseExceptAdmin(): Promise<void> {
  console.log("🧹 Starting database cleanup (preserving Admin accounts)...");

  // Step 1: Count existing records before cleanup
  const totalUsersBefore = await prisma.user.count();
  const adminUsers = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, email: true, name: true },
  });

  console.log(`📊 Found ${totalUsersBefore} total users (${adminUsers.length} admin accounts)`);
  if (adminUsers.length > 0) {
    console.log("🛡️ Preserving admin accounts:");
    adminUsers.forEach((admin) => console.log(`   - ${admin.name} (${admin.email})`));
  } else {
    console.warn("⚠️ No admin accounts found in database. Will seed default admin if configured.");
  }

  // Step 2: Delete transactional & dependent records in foreign-key safe order
  console.log("🗑️ Deleting operational data...");

  await prisma.auditLog.deleteMany({});
  await prisma.fraudFlag.deleteMany({});
  await prisma.rewardEvent.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.internalNote.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.chatThread.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.rating.deleteMany({});
  await prisma.donationMatch.deleteMany({});
  await prisma.beneficiaryRequest.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.donationNgoResponse.deleteMany({});
  await prisma.donationImage.deleteMany({});
  await prisma.donation.deleteMany({});
  await prisma.storedFile.deleteMany({});
  await prisma.ngoVolunteer.deleteMany({});
  await prisma.volunteerProfile.deleteMany({});
  await prisma.ngoMember.deleteMany({});
  await prisma.ngo.deleteMany({});
  await prisma.otpCode.deleteMany({});

  // Step 3: Delete non-admin users (and any automated test admin accounts)
  const primaryAdminEmail = process.env.ADMIN_EMAIL || "admin@donateconnect.org";

  const deletedUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { role: { not: Role.ADMIN } },
        {
          role: Role.ADMIN,
          email: { not: primaryAdminEmail },
          OR: [
            { email: { contains: "test" } },
            { email: { contains: "phase" } },
          ],
        },
      ],
    },
  });

  console.log(`✅ Deleted ${deletedUsers.count} non-admin and test accounts.`);

  // Step 4: Ensure at least one Admin user exists
  const remainingAdmins = await prisma.user.count({ where: { role: Role.ADMIN } });
  if (remainingAdmins === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    const newAdmin = await prisma.user.create({
      data: {
        email: process.env.ADMIN_EMAIL,
        name: "DonateConnect Admin",
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`👑 Recreated default admin from .env: ${newAdmin.email}`);
  }

  const finalAdmins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { email: true },
  });

  console.log("-------------------------------------------------------");
  console.log("✨ Database successfully cleared!");
  console.log(`🛡️ Active Admin accounts remaining: ${finalAdmins.map((a) => a.email).join(", ")}`);
  console.log("-------------------------------------------------------");
}

if (require.main === module || process.argv[1]?.includes("clear-database")) {
  clearDatabaseExceptAdmin()
    .catch((err) => {
      console.error("❌ Error while clearing database:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
