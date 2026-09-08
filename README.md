# Password Manager CLI

A secure command-line password manager built with TypeScript, Prisma, and AES-256-CBC encryption. Stores passwords encrypted in a local SQLite database, protected by a master password.

## Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0

## Installation

```bash
# Clone and install dependencies
git clone <repo-url>
cd password-manager-cli
npm install

# Generate Prisma client
npm run prisma:generate
```

## Usage

### First-time Setup

```bash
# Initialize the master encryption key
npx tsx src/main.ts setup
```

You'll be prompted to create a master password. This password encrypts the AES key used for all stored passwords. **Remember this password** — there is no recovery.

### Login

```bash
# Authenticate with your master password
npx tsx src/main.ts login
```

All commands after login use the decrypted key for the current session.

### Add a Password

```bash
npx tsx src/main.ts add
```

You'll be prompted for: service name, username, email, password, and description. All fields except service name and password are optional.

### List All Passwords

```bash
npx tsx src/main.ts list
```

Displays all stored entries in a table (passwords are hidden).

### Get a Password

```bash
# Show password entry (password masked)
npx tsx src/main.ts get github

# Show password in plain text
npx tsx src/main.ts get github --show
```

### Search

```bash
npx tsx src/main.ts search github
```

Searches across service name, username, email, and description.

### Edit a Password

```bash
npx tsx src/main.ts edit github
```

Select which fields to update interactively.

### Delete a Password

```bash
npx tsx src/main.ts delete github
```

### Logout

```bash
npx tsx src/main.ts logout
```

Clears the session key from memory.

### Version

```bash
npx tsx src/main.ts --version
```

## Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
  main.ts                 # Entry point
  config/
    index.ts              # App configuration
    db.ts                 # Prisma client setup
  prisma/
    schema.prisma         # Database schema
    migrations/           # Migration history
  services/
    actions.service.ts    # Core business logic (auth, CRUD, encryption)
    commands.service.ts   # CLI command definitions (Commander.js)
    encrypt.service.ts    # AES-256-CBC encryption/decryption
```

## How It Works

1. **Setup** generates a random AES-256 key and encrypts it using your master password (PBKDF2-derived key with 100K iterations + random salt). The encrypted key is stored in the `Key` table.

2. **Login** decrypts the AES key using your master password and holds it in memory for the session.

3. **Add** encrypts each password with the AES key and a unique IV (initialization vector), storing both the ciphertext and IV.

4. **Get** decrypts the stored password using the AES key and stored IV.

5. **Logout** clears the key from memory. The database remains encrypted.

## Database

SQLite via Prisma ORM. Database file is located at `src/prisma/dev.db`.

### Schema Commands

```bash
npm run prisma:generate   # Regenerate Prisma client
npm run prisma:studio     # Open Prisma Studio (GUI)
npm run prisma:migrate    # Run migrations
npm run prisma:reset      # Reset database (destructive)
```

## Environment Variables

Create a `.env` file:

```
DATABASE_URL=file:./dev.db
```

## Tech Stack

- **Runtime**: Node.js 22+
- **Language**: TypeScript
- **CLI Framework**: Commander.js
- **Database**: SQLite via Prisma ORM
- **Encryption**: AES-256-CBC (Node.js crypto)
- **Key Derivation**: PBKDF2 (SHA-512, 100K iterations)
- **UI**: Inquirer.js (prompts), Chalk (colors), Ora (spinners)

## References

- [Prisma setup with SQLite](https://www.prisma.io/docs/getting-started/quickstart-sqlite)
