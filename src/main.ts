import "dotenv/config";
import "reflect-metadata";
import prisma from "./config/db";

async function main() {
  await prisma.$connect();

  const passwords = await prisma.passwordManager.findMany();

  console.log("All Passwords:", passwords);
}

main();
