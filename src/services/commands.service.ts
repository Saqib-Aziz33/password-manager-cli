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
      .name(this.config.appName)
      .description(this.config.appDescription)
      .version(this.config.version);

    this.program
      .command("setup")
      .description("Setup the application encryption key")
      .argument("<key>", "Encryption key to set")
      .action(this.actions.setup.bind(this.actions));

    this.program
      .command("status")
      .description("Check the status of the application")
      .action(this.actions.status.bind(this.actions));

    this.program.parse();
    return this.program;
  }
}

export default Commands;
