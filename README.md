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

Start the interactive session:

```bash
npx tsx src/main.ts
```

You'll see a `password-manager>` prompt. Type commands here.

### First-time Setup

```
password-manager> setup
```

You'll be prompted to create a master password. This password encrypts the AES key used for all stored passwords. **Remember this password** — there is no recovery.

### Login

```
password-manager> login
```

Enter your master password to decrypt the AES key. All subsequent commands use this key for the session.

### Add a Password

```
password-manager> add
```

You'll be prompted for: service name, username, email, password, and description. All fields except service name and password are optional.

### List All Passwords

```
password-manager> list
```

Displays all stored entries in a table (passwords hidden).

### Get a Password

```
password-manager> get github          # password masked
password-manager> get github -s       # show password in plain text
```

### Search

```
password-manager> search github
```

Searches across service name, username, email, and description.

### Edit a Password

```
password-manager> edit github
```

Select which fields to update interactively.

### Delete a Password

```
password-manager> delete github
```

### Logout / Exit

```
password-manager> logout    # clear session key
password-manager> exit      # exit the application
```

### Help

```
password-manager> help
```

## Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
  main.ts                 # Entry point and REPL loop
  config/
    index.ts              # App configuration
    db.ts                 # Prisma client setup
  prisma/
    schema.prisma         # Database schema
    migrations/           # Migration history
  services/
    actions.service.ts    # Core business logic (auth, CRUD, encryption)
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
- **Database**: SQLite via Prisma ORM
- **Encryption**: AES-256-CBC (Node.js crypto)
- **Key Derivation**: PBKDF2 (SHA-512, 100K iterations)
- **UI**: Inquirer.js (prompts), Chalk (colors), Ora (spinners)

## References

- [Prisma setup with SQLite](https://www.prisma.io/docs/getting-started/quickstart-sqlite)
