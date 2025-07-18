import crypto from "crypto";

abstract class BaseEncryption {
  abstract readonly key: Buffer;
  abstract readonly iv: Buffer;
  abstract readonly algorithm: string;

  abstract encrypt(text: string): { iv: string; string: string };
  abstract decrypt(encrypted: string, ivHex: string): string;

  static generateIv(): Buffer {
    return crypto.randomBytes(16);
  }

  static generateKey(): Buffer {
    return crypto.randomBytes(32);
  }
}

class Aes256Cbc extends BaseEncryption {
  readonly key: Buffer;
  readonly iv: Buffer;
  readonly algorithm = "aes-256-cbc";

  constructor(key: Buffer, iv: Buffer) {
    super();
    this.key = key;
    this.iv = iv;
  }

  encrypt(text: string) {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return {
      iv: this.iv.toString("hex"),
      string: encrypted,
    };
  }

  decrypt(encrypted: string, ivHex: string): string {
    const ivBuffer = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      ivBuffer
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}

export { Aes256Cbc };
