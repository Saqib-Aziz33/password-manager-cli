import "dotenv/config";
import prisma from "./config/db";
import { config } from "@/config";
import Actions from "./services/actions.service";
import * as readline from "readline";

const HELP = `
Commands:
  setup                  Initialize the master encryption key
  login                  Authenticate with your master password
  logout                 End the current session
  add                    Add a new password entry
  list                   List all stored passwords
  get <service> [-s]     Get a password entry (--show to reveal password)
  delete <service>       Delete a password entry
  edit <service>         Edit an existing password entry
  search <query>         Search stored passwords
  help                   Show this help message
  exit                   Exit the application
`;

async function main() {
  const actions = new Actions(prisma);
  await prisma.$connect();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "password-manager> ",
  });

  const prompt = () => rl.prompt();

  const dispatch = async (input: string): Promise<boolean> => {
    const trimmed = input.trim();
    if (!trimmed) return true;

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case "exit":
        case "quit":
          return false;

        case "help":
          console.log(HELP);
          break;

        case "setup":
          await actions.setup();
          break;

        case "login":
          await actions.login();
          break;

        case "logout":
          await actions.logout();
          break;

        case "add":
          await actions.addEntry();
          break;

        case "list":
          await actions.listEntries();
          break;

        case "get": {
          const service = args.find((a) => !a.startsWith("-"));
          if (!service) {
            console.log("Usage: get <service> [-s|--show]");
            break;
          }
          const show = args.includes("-s") || args.includes("--show");
          await actions.getPassword(service, show);
          break;
        }

        case "delete": {
          const service = args[0];
          if (!service) {
            console.log("Usage: delete <service>");
            break;
          }
          await actions.deleteEntry(service);
          break;
        }

        case "edit": {
          const service = args[0];
          if (!service) {
            console.log("Usage: edit <service>");
            break;
          }
          await actions.editEntry(service);
          break;
        }

        case "search": {
          const query = args.join(" ");
          if (!query) {
            console.log("Usage: search <query>");
            break;
          }
          await actions.searchEntries(query);
          break;
        }

        default:
          console.log(`Unknown command: ${cmd}. Type 'help' for available commands.`);
      }
    } catch (err: any) {
      if (err.message === "Not logged in. Run 'login' first.") {
        console.log("Not logged in. Run 'login' first.");
      } else {
        console.error(err.message || err);
      }
    }

    return true;
  };

  console.log(`${config.appName} v${config.version}`);
  console.log(`Type 'help' for available commands.\n`);

  prompt();

  let closed = false;

  rl.on("line", async (line) => {
    if (closed) return;
    const cont = await dispatch(line);
    if (!cont) {
      closed = true;
      rl.close();
    } else if (!closed) {
      prompt();
    }
  });

  rl.on("close", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
