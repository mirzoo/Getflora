import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

console.log("ADMIN_EMAILS count:", adminEmails.length);

const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true, bannedAt: true },
  orderBy: { createdAt: "desc" },
  take: 10,
});

console.log("Users in DB:", users.length);

for (const user of users) {
  const email = (user.email || "").toLowerCase();
  const isAdmin = adminEmails.includes(email);
  const masked = user.email ? user.email.replace(/(.{2}).*(@.*)/, "$1***$2") : "NULL";
  console.log(`- ${masked} | admin: ${isAdmin} | banned: ${Boolean(user.bannedAt)}`);
}

const sessions = await prisma.session.count();
console.log("Session rows:", sessions);

try {
  await prisma.report.count();
  console.log("Report table: OK");
} catch {
  console.log("Report table: MISSING (run npm run db:migrate)");
}

const matchingAdminUser = users.find((user) =>
  adminEmails.includes((user.email || "").toLowerCase()),
);

if (!matchingAdminUser) {
  console.log("PROBLEM: No user in DB matches ADMIN_EMAILS. Register/login with that exact email.");
} else if (matchingAdminUser.bannedAt) {
  console.log("PROBLEM: Matching admin user is banned.");
} else {
  console.log("OK: At least one DB user matches ADMIN_EMAILS.");
}

await prisma.$disconnect();
await pool.end();
