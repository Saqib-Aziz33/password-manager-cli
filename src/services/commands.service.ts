import { Command } from "commander";
import Actions from "./actions.service";

class Commands {
  constructor(
    private readonly program: Command,
    private readonly actions: Actions,
    private readonly config: {
      appName: string;
      appDescription: string;
      version: string;
    }
  ) {}

  init() {
    this.program
      .name(this.config.appName.toLowerCase().replace(/\s+/g, "-"))
      .description(this.config.appDescription)
      .version(this.config.version);

    this.program
      .command("setup")
      .description("Initialize the master encryption key")
      .action(this.actions.setup.bind(this.actions));

    this.program
      .command("login")
      .description("Authenticate with your master password")
      .action(this.actions.login.bind(this.actions));

    this.program
      .command("logout")
      .description("End the current session")
      .action(this.actions.logout.bind(this.actions));

    this.program
      .command("add")
      .description("Add a new password entry")
      .action(this.actions.addEntry.bind(this.actions));

    this.program
      .command("list")
      .description("List all stored passwords")
      .action(this.actions.listEntries.bind(this.actions));

    this.program
      .command("get <service>")
      .description("Get a password entry by service name")
      .option("-s, --show", "Show the password in plain text")
      .action(
        (service: string, options: { show?: boolean }) =>
          this.actions.getPassword(service, options.show ?? false)
      );

    this.program
      .command("delete <service>")
      .description("Delete a password entry")
      .action(this.actions.deleteEntry.bind(this.actions));

    this.program
      .command("edit <service>")
      .description("Edit an existing password entry")
      .action(this.actions.editEntry.bind(this.actions));

    this.program
      .command("search <query>")
      .description("Search stored passwords")
      .action(this.actions.searchEntries.bind(this.actions));

    this.program.parse();
    return this.program;
  }
}

export default Commands;
