import { PrismaClient } from "@/../dist/generated/prisma";

class Actions {
  constructor(private readonly prisma: PrismaClient) {}

  async setup(key: string) {
    console.log(`Setting up encryption key: ${key}`);
  }

  async status() {
    const keys = await this.prisma.key.findMany();
    if (keys.length === 0) {
      console.log("No encryption keys found. Please setup an encryption key.");
      return;
    }
    console.log("Encryption Key exists.");
  }

  async login(key: string) {}
}

export default Actions;
