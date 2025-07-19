import "dotenv/config";
import prisma from "./config/db";
import ora from "ora";
import Commands from "./services/commands.service";
import { Command } from "commander";
import { config } from "@/config";
import { Aes256Cbc } from "./services/encrypt.service";
import Actions from "./services/actions.service";

async function main() {
  const spinner = ora("Starting application").start();
  await prisma.$connect();
  const actions = new Actions(prisma);
  const commands = new Commands(new Command(), actions, config);
  spinner.succeed("application started successfully");
  commands.init();
}

main();
