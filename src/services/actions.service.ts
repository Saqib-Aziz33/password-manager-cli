import { PrismaClient, PasswordManager } from "../../dist/generated/prisma";
import crypto from "crypto";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import { Aes256Cbc } from "./encrypt.service";

class Actions {
  private sessionKey: Buffer | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  private requireAuth(): Buffer {
    if (!this.sessionKey) {
      throw new Error("Not logged in. Run 'login' first.");
    }
    return this.sessionKey;
  }

  private deriveKey(
    password: string,
    salt: Buffer
  ): Promise<{ key: Buffer; iv: Buffer }> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 48, "sha512", (err, derived) => {
        if (err) return reject(err);
        resolve({ key: derived.subarray(0, 32), iv: derived.subarray(32, 48) });
      });
    });
  }

  private async encryptAesKey(aesKey: Buffer, masterPassword: string) {
    const salt = crypto.randomBytes(16);
    const { key, iv } = await this.deriveKey(masterPassword, salt);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(aesKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return {
      text: encrypted.toString("hex"),
      iv: salt.toString("hex") + ":" + iv.toString("hex"),
    };
  }

  private async decryptAesKey(
    encryptedText: string,
    ivData: string,
    masterPassword: string
  ): Promise<Buffer> {
    const [saltHex, ivHex] = ivData.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const { key } = await this.deriveKey(masterPassword, salt);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(Buffer.from(encryptedText, "hex"));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
  }

  private maskPassword(password: string, show: boolean): string {
    if (show) return password;
    return "*".repeat(Math.min(password.length, 16));
  }

  async setup() {
    const existingKey = await this.prisma.key.findFirst();
    if (existingKey) {
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: "An encryption key already exists. Overwrite it?",
          default: false,
        },
      ]);
      if (!overwrite) {
        console.log(chalk.yellow("Setup cancelled."));
        return;
      }
    }

    const { masterPassword } = await inquirer.prompt([
      {
        type: "password",
        name: "masterPassword",
        message: "Set a master password:",
        mask: "*",
        validate: (input: string) =>
          input.length >= 4 ? true : "Password must be at least 4 characters",
      },
    ]);

    const { confirm } = await inquirer.prompt([
      {
        type: "password",
        name: "confirm",
        message: "Confirm master password:",
        mask: "*",
      },
    ]);

    if (masterPassword !== confirm) {
      console.log(chalk.red("Passwords do not match. Setup cancelled."));
      return;
    }

    const spinner = ora("Generating encryption key...").start();

    try {
      const aesKey = Aes256Cbc.generateKey();
      const encrypted = await this.encryptAesKey(aesKey, masterPassword);

      if (existingKey) {
        await this.prisma.key.update({
          where: { id: existingKey.id },
          data: { text: encrypted.text, iv: encrypted.iv },
        });
      } else {
        await this.prisma.key.create({
          data: { text: encrypted.text, iv: encrypted.iv },
        });
      }

      spinner.succeed("Encryption key generated and stored successfully.");
    } catch (error) {
      spinner.fail("Failed to setup encryption key.");
      console.error(error);
    }
  }

  async login() {
    if (this.sessionKey) {
      console.log(chalk.yellow("Already logged in."));
      return;
    }

    const keyRecord = await this.prisma.key.findFirst();
    if (!keyRecord) {
      console.log(
        chalk.red("No encryption key found. Run 'setup' first to create one.")
      );
      return;
    }

    const { masterPassword } = await inquirer.prompt([
      {
        type: "password",
        name: "masterPassword",
        message: "Enter master password:",
        mask: "*",
      },
    ]);

    const spinner = ora("Authenticating...").start();

    try {
      this.sessionKey = await this.decryptAesKey(
        keyRecord.text,
        keyRecord.iv,
        masterPassword
      );
      spinner.succeed("Logged in successfully.");
    } catch {
      spinner.fail("Invalid master password.");
    }
  }

  async logout() {
    if (!this.sessionKey) {
      console.log(chalk.yellow("Not logged in."));
      return;
    }
    this.sessionKey = null;
    console.log(chalk.green("Logged out successfully."));
  }

  async addEntry() {
    this.requireAuth();

    const answers = await inquirer.prompt([
      { type: "input", name: "service", message: "Service name:", validate: (v: string) => v.trim() !== "" || "Service name is required" },
      { type: "input", name: "username", message: "Username (optional):" },
      { type: "input", name: "email", message: "Email (optional):" },
      { type: "password", name: "password", message: "Password:", mask: "*", validate: (v: string) => v.trim() !== "" || "Password is required" },
      { type: "input", name: "description", message: "Description (optional):" },
    ]);

    const spinner = ora("Encrypting and saving...").start();

    try {
      const iv = Aes256Cbc.generateIv();
      const cipher = new Aes256Cbc(this.sessionKey!, iv);
      const { iv: ivHex, string: encrypted } = cipher.encrypt(answers.password);

      await this.prisma.passwordManager.create({
        data: {
          service: answers.service.trim(),
          username: answers.username?.trim() || null,
          email: answers.email?.trim() || null,
          password: encrypted,
          description: answers.description?.trim() || null,
          iv: ivHex,
        },
      });

      spinner.succeed(`Password for '${answers.service}' saved successfully.`);
    } catch (error) {
      spinner.fail("Failed to save password.");
      console.error(error);
    }
  }

  async listEntries() {
    this.requireAuth();

    const entries = await this.prisma.passwordManager.findMany({
      orderBy: { updatedAt: "desc" },
    });

    if (entries.length === 0) {
      console.log(chalk.yellow("No passwords stored yet."));
      return;
    }

    console.log(chalk.bold("\nStored Passwords:\n"));

    const rows = entries.map((entry: PasswordManager, i: number) => ({
      "#": String(i + 1),
      Service: entry.service,
      Username: entry.username || "-",
      Email: entry.email || "-",
      Description: entry.description || "-",
      Updated: entry.updatedAt.toLocaleDateString(),
    }));

    console.table(rows);
    console.log(chalk.dim(`Total: ${entries.length} entries\n`));
  }

  async getPassword(service: string, show: boolean) {
    this.requireAuth();

    const entry = await this.prisma.passwordManager.findFirst({
      where: { service: { contains: service } },
    });

    if (!entry) {
      console.log(chalk.red(`No password found for '${service}'.`));
      return;
    }

    try {
      const cipher = new Aes256Cbc(this.sessionKey!, Buffer.alloc(0));
      const decrypted = cipher.decrypt(entry.password, entry.iv);

      console.log(chalk.bold("\nPassword Entry:\n"));
      console.log(`  ${chalk.dim("Service:")}     ${entry.service}`);
      console.log(`  ${chalk.dim("Username:")}    ${entry.username || "-"}`);
      console.log(`  ${chalk.dim("Email:")}       ${entry.email || "-"}`);
      console.log(`  ${chalk.dim("Password:")}    ${this.maskPassword(decrypted, show)}`);
      if (entry.description) {
        console.log(`  ${chalk.dim("Description:")} ${entry.description}`);
      }
      console.log(`  ${chalk.dim("Created:")}    ${entry.createdAt.toLocaleString()}`);
      console.log(`  ${chalk.dim("Updated:")}    ${entry.updatedAt.toLocaleString()}`);
      console.log();
    } catch {
      console.log(chalk.red("Failed to decrypt password. The encryption key may be incorrect."));
    }
  }

  async deleteEntry(service: string) {
    this.requireAuth();

    const entry = await this.prisma.passwordManager.findFirst({
      where: { service: { contains: service } },
    });

    if (!entry) {
      console.log(chalk.red(`No password found for '${service}'.`));
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `Delete password for '${entry.service}'?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow("Deletion cancelled."));
      return;
    }

    await this.prisma.passwordManager.delete({ where: { id: entry.id } });
    console.log(chalk.green(`Password for '${entry.service}' deleted successfully.`));
  }

  async editEntry(service: string) {
    this.requireAuth();

    const entry = await this.prisma.passwordManager.findFirst({
      where: { service: { contains: service } },
    });

    if (!entry) {
      console.log(chalk.red(`No password found for '${service}'.`));
      return;
    }

    console.log(chalk.dim(`Editing entry for '${entry.service}' (leave blank to keep current value):\n`));

    const { fields } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "fields",
        message: "Select fields to edit:",
        choices: ["username", "email", "password", "description"],
      },
    ]);

    if (fields.length === 0) {
      console.log(chalk.yellow("No fields selected. Nothing updated."));
      return;
    }

    const updates: Record<string, any> = {};

    for (const field of fields) {
      if (field === "password") {
        const { value } = await inquirer.prompt([
          { type: "password", name: "value", message: "New password:", mask: "*" },
        ]);
        const iv = Aes256Cbc.generateIv();
        const cipher = new Aes256Cbc(this.sessionKey!, iv);
        const { iv: ivHex, string: encrypted } = cipher.encrypt(value);
        updates.password = encrypted;
        updates.iv = ivHex;
      } else {
        const current = entry[field as keyof typeof entry] || "";
        const { value } = await inquirer.prompt([
          {
            type: "input",
            name: "value",
            message: `New ${field}:`,
            default: String(current),
          },
        ]);
        updates[field] = value.trim() || null;
      }
    }

    await this.prisma.passwordManager.update({
      where: { id: entry.id },
      data: updates,
    });

    console.log(chalk.green(`Password for '${entry.service}' updated successfully.`));
  }

  async searchEntries(query: string) {
    this.requireAuth();

    const entries = await this.prisma.passwordManager.findMany({
      where: {
        OR: [
          { service: { contains: query } },
          { username: { contains: query } },
          { email: { contains: query } },
          { description: { contains: query } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    if (entries.length === 0) {
      console.log(chalk.yellow(`No entries found matching '${query}'.`));
      return;
    }

    console.log(chalk.bold(`\nResults for '${query}':\n`));

    const rows = entries.map((entry: PasswordManager, i: number) => ({
      "#": String(i + 1),
      Service: entry.service,
      Username: entry.username || "-",
      Email: entry.email || "-",
      Description: entry.description || "-",
    }));

    console.table(rows);
    console.log(chalk.dim(`Found: ${entries.length} entries\n`));
  }
}

export default Actions;
