# Example: Create CLI Tool

Complete working example of a production-ready command-line interface for GLIN Network.

## What You'll Build

A full-featured CLI tool that provides:

- 👤 **Account management** - Create, import, list, and export accounts
- 💸 **Token transfers** - Send GLIN tokens with confirmation
- 💰 **Balance queries** - Check balances with formatting
- 🔧 **Configuration** - Manage network endpoints and settings
- 📊 **Transaction history** - View recent transactions
- 🎨 **Beautiful output** - Colorful, formatted terminal output

## Prerequisites

- Node.js 18+ (for TypeScript version)
- Rust 1.70+ (for Rust version)
- GLIN wallet or seed phrase

## Project Setup

### TypeScript Version

```bash
mkdir glin-cli
cd glin-cli
npm init -y
npm install @glin-ai/sdk @polkadot/util-crypto
npm install commander inquirer chalk ora conf
npm install -D @types/node @types/inquirer typescript tsx
```

### Rust Version

```bash
cargo new glin-cli
cd glin-cli
cargo add glin-client tokio clap --features clap/derive
cargo add colored dialoguer serde serde_json anyhow
cargo add dirs keyring
```

## TypeScript Implementation

### 1. CLI Structure

```typescript title="src/cli.ts"
import { Command } from 'commander';
import chalk from 'chalk';
import * as commands from './commands';

const program = new Command();

program
  .name('glin')
  .description('GLIN Network CLI - Manage accounts, transfers, and more')
  .version('1.0.0');

// Account commands
const account = program.command('account').description('Manage accounts');

account
  .command('create')
  .description('Create a new account')
  .option('-n, --name <name>', 'Account name')
  .action(commands.createAccount);

account
  .command('import')
  .description('Import account from mnemonic')
  .option('-m, --mnemonic <phrase>', 'Mnemonic phrase')
  .option('-n, --name <name>', 'Account name')
  .action(commands.importAccount);

account
  .command('list')
  .description('List all accounts')
  .action(commands.listAccounts);

account
  .command('export <name>')
  .description('Export account mnemonic')
  .action(commands.exportAccount);

// Balance commands
program
  .command('balance <address>')
  .description('Check account balance')
  .action(commands.checkBalance);

// Transfer commands
program
  .command('transfer <to> <amount>')
  .description('Send GLIN tokens')
  .option('-f, --from <name>', 'From account name')
  .option('-y, --yes', 'Skip confirmation')
  .action(commands.transfer);

// Config commands
const config = program.command('config').description('Manage configuration');

config
  .command('set <key> <value>')
  .description('Set configuration value')
  .action(commands.setConfig);

config
  .command('get <key>')
  .description('Get configuration value')
  .action(commands.getConfig);

config
  .command('list')
  .description('List all configuration')
  .action(commands.listConfig);

// Transaction history
program
  .command('history <address>')
  .description('View transaction history')
  .option('-l, --limit <number>', 'Number of transactions', '10')
  .action(commands.showHistory);

program.parse();
```

### 2. Account Management

```typescript title="src/commands/account.ts"
import { Keyring } from '@glin-ai/sdk';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getConfig, saveAccount, loadAccounts } from '../utils/storage';

export async function createAccount(options: any) {
  try {
    // Generate mnemonic
    const mnemonic = mnemonicGenerate(12);

    // Get account name
    let name = options.name;
    if (!name) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Account name:',
          validate: (input) => input.length > 0 || 'Name is required'
        }
      ]);
      name = answer.name;
    }

    // Create account
    const keyring = new Keyring({ type: 'sr25519' });
    const account = keyring.addFromMnemonic(mnemonic);

    // Save account
    await saveAccount({
      name,
      address: account.address,
      mnemonic
    });

    console.log(chalk.green('\n✅ Account created successfully!\n'));
    console.log(chalk.bold('Name:'), name);
    console.log(chalk.bold('Address:'), account.address);
    console.log(chalk.bold('\nMnemonic (SAVE THIS SECURELY):'));
    console.log(chalk.yellow(mnemonic));
    console.log(chalk.red('\n⚠️  Never share your mnemonic phrase!\n'));

  } catch (error: any) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

export async function importAccount(options: any) {
  try {
    // Get mnemonic
    let mnemonic = options.mnemonic;
    if (!mnemonic) {
      const answer = await inquirer.prompt([
        {
          type: 'password',
          name: 'mnemonic',
          message: 'Enter mnemonic phrase:',
          validate: (input) => {
            const words = input.trim().split(/\s+/);
            return [12, 24].includes(words.length) || 'Must be 12 or 24 words';
          }
        }
      ]);
      mnemonic = answer.mnemonic;
    }

    // Get account name
    let name = options.name;
    if (!name) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Account name:',
          validate: (input) => input.length > 0 || 'Name is required'
        }
      ]);
      name = answer.name;
    }

    // Import account
    const keyring = new Keyring({ type: 'sr25519' });
    const account = keyring.addFromMnemonic(mnemonic);

    // Save account
    await saveAccount({
      name,
      address: account.address,
      mnemonic
    });

    console.log(chalk.green('\n✅ Account imported successfully!\n'));
    console.log(chalk.bold('Name:'), name);
    console.log(chalk.bold('Address:'), account.address);

  } catch (error: any) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

export async function listAccounts() {
  try {
    const accounts = await loadAccounts();

    if (accounts.length === 0) {
      console.log(chalk.yellow('No accounts found. Create one with: glin account create'));
      return;
    }

    console.log(chalk.bold('\n📋 Accounts:\n'));

    accounts.forEach((account, index) => {
      console.log(chalk.cyan(`${index + 1}. ${account.name}`));
      console.log(`   ${chalk.gray(account.address)}\n`);
    });

  } catch (error: any) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

export async function exportAccount(name: string) {
  try {
    const accounts = await loadAccounts();
    const account = accounts.find(a => a.name === name);

    if (!account) {
      console.error(chalk.red(`❌ Account "${name}" not found`));
      process.exit(1);
    }

    // Confirm export
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to export the mnemonic?',
        default: false
      }
    ]);

    if (!answer.confirm) {
      console.log(chalk.yellow('Export cancelled'));
      return;
    }

    console.log(chalk.bold('\nMnemonic for'), chalk.cyan(name));
    console.log(chalk.yellow(account.mnemonic));
    console.log(chalk.red('\n⚠️  Never share your mnemonic phrase!\n'));

  } catch (error: any) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}
```

### 3. Balance & Transfer

```typescript title="src/commands/balance.ts"
import { GlinClient } from '@glin-ai/sdk';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig } from '../utils/storage';

export async function checkBalance(address: string) {
  const spinner = ora('Fetching balance...').start();

  try {
    const config = await getConfig();
    const client = await GlinClient.connect(config.rpc);

    const balance = await client.getBalance(address);

    spinner.stop();

    const free = BigInt(balance.free.toString()) / BigInt(10 ** 18);
    const reserved = BigInt(balance.reserved.toString()) / BigInt(10 ** 18);
    const frozen = BigInt(balance.frozen.toString()) / BigInt(10 ** 18);

    console.log(chalk.bold('\n💰 Balance for'), chalk.cyan(address));
    console.log(chalk.bold('\nFree:     '), chalk.green(`${free.toString()} GLIN`));
    console.log(chalk.bold('Reserved: '), `${reserved.toString()} GLIN`);
    console.log(chalk.bold('Frozen:   '), `${frozen.toString()} GLIN\n`);

    await client.disconnect();

  } catch (error: any) {
    spinner.stop();
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}
```

```typescript title="src/commands/transfer.ts"
import { GlinClient, Keyring } from '@glin-ai/sdk';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { getConfig, loadAccounts } from '../utils/storage';

export async function transfer(to: string, amount: string, options: any) {
  try {
    // Load accounts
    const accounts = await loadAccounts();
    if (accounts.length === 0) {
      console.error(chalk.red('❌ No accounts found. Create one first.'));
      process.exit(1);
    }

    // Select account
    let fromAccount;
    if (options.from) {
      fromAccount = accounts.find(a => a.name === options.from);
      if (!fromAccount) {
        console.error(chalk.red(`❌ Account "${options.from}" not found`));
        process.exit(1);
      }
    } else {
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'account',
          message: 'Select account to send from:',
          choices: accounts.map(a => ({ name: `${a.name} (${a.address})`, value: a }))
        }
      ]);
      fromAccount = answer.account;
    }

    // Parse amount
    const amountBN = BigInt(amount) * BigInt(10 ** 18);

    // Show transfer details
    console.log(chalk.bold('\n📤 Transfer Details:\n'));
    console.log(chalk.bold('From:  '), fromAccount.name);
    console.log(chalk.bold('To:    '), to);
    console.log(chalk.bold('Amount:'), chalk.green(`${amount} GLIN`));

    // Confirm transfer
    if (!options.yes) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Confirm transfer?',
          default: false
        }
      ]);

      if (!answer.confirm) {
        console.log(chalk.yellow('Transfer cancelled'));
        return;
      }
    }

    const spinner = ora('Sending transaction...').start();

    // Connect to network
    const config = await getConfig();
    const client = await GlinClient.connect(config.rpc);

    // Create signer
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromMnemonic(fromAccount.mnemonic);

    // Create transfer
    const transfer = client.api.tx.balances.transfer(to, amountBN);

    // Send and wait for finalization
    await new Promise((resolve, reject) => {
      transfer.signAndSend(signer, ({ status, dispatchError }) => {
        if (status.isInBlock) {
          spinner.text = `In block: ${status.asInBlock.toHex()}`;
        }

        if (status.isFinalized) {
          if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = client.api.registry.findMetaError(
                dispatchError.asModule
              );
              reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs}`));
            } else {
              reject(new Error(dispatchError.toString()));
            }
          } else {
            spinner.succeed(chalk.green('Transaction finalized!'));
            resolve(status.asFinalized);
          }
        }
      });
    });

    console.log(chalk.green('\n✅ Transfer successful!\n'));

    await client.disconnect();

  } catch (error: any) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}
```

### 4. Configuration Management

```typescript title="src/commands/config.ts"
import chalk from 'chalk';
import { getConfig, setConfigValue, Config } from '../utils/storage';

export async function setConfig(key: string, value: string) {
  try {
    await setConfigValue(key as keyof Config, value);
    console.log(chalk.green('✅ Configuration updated'));
    console.log(chalk.bold(key + ':'), value);
  } catch (error: any) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

export async function getConfig(key: string) {
  try {
    const config = await getConfig();
    const value = config[key as keyof Config];

    if (value === undefined) {
      console.error(chalk.red(`❌ Configuration key "${key}" not found`));
      process.exit(1);
    }

    console.log(chalk.bold(key + ':'), value);
  } catch (error: any) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

export async function listConfig() {
  try {
    const config = await getConfig();

    console.log(chalk.bold('\n⚙️  Configuration:\n'));

    Object.entries(config).forEach(([key, value]) => {
      console.log(chalk.cyan(key + ':'), value);
    });

    console.log();
  } catch (error: any) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}
```

### 5. Storage Utilities

```typescript title="src/utils/storage.ts"
import Conf from 'conf';
import { homedir } from 'os';
import { join } from 'path';

export interface Account {
  name: string;
  address: string;
  mnemonic: string;
}

export interface Config {
  rpc: string;
  network: string;
}

const config = new Conf({
  projectName: 'glin-cli',
  defaults: {
    rpc: 'wss://testnet.glin.ai',
    network: 'testnet',
    accounts: []
  }
});

export async function getConfig(): Promise<Config> {
  return {
    rpc: config.get('rpc') as string,
    network: config.get('network') as string
  };
}

export async function setConfigValue(key: keyof Config, value: string) {
  config.set(key, value);
}

export async function saveAccount(account: Account) {
  const accounts = config.get('accounts') as Account[];

  // Check if account name already exists
  if (accounts.some(a => a.name === account.name)) {
    throw new Error(`Account "${account.name}" already exists`);
  }

  accounts.push(account);
  config.set('accounts', accounts);
}

export async function loadAccounts(): Promise<Account[]> {
  return config.get('accounts') as Account[];
}
```

### 6. Main Entry Point

```typescript title="src/index.ts"
#!/usr/bin/env node
import './cli';
```

### 7. Package Configuration

```json title="package.json"
{
  "name": "glin-cli",
  "version": "1.0.0",
  "description": "GLIN Network CLI",
  "main": "dist/index.js",
  "bin": {
    "glin": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js"
  },
  "keywords": ["glin", "cli", "blockchain"],
  "author": "",
  "license": "MIT"
}
```

## Rust Implementation

### 1. CLI Structure

```rust title="src/main.rs"
use clap::{Parser, Subcommand};
use anyhow::Result;

mod commands;
mod config;

#[derive(Parser)]
#[command(name = "glin")]
#[command(about = "GLIN Network CLI - Manage accounts, transfers, and more")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Manage accounts
    #[command(subcommand)]
    Account(AccountCommands),

    /// Check account balance
    Balance {
        /// Account address
        address: String,
    },

    /// Send GLIN tokens
    Transfer {
        /// Recipient address
        to: String,

        /// Amount to send
        amount: String,

        /// From account name
        #[arg(short, long)]
        from: Option<String>,

        /// Skip confirmation
        #[arg(short, long)]
        yes: bool,
    },

    /// Manage configuration
    #[command(subcommand)]
    Config(ConfigCommands),
}

#[derive(Subcommand)]
enum AccountCommands {
    /// Create a new account
    Create {
        /// Account name
        #[arg(short, long)]
        name: Option<String>,
    },

    /// Import account from mnemonic
    Import {
        /// Mnemonic phrase
        #[arg(short, long)]
        mnemonic: Option<String>,

        /// Account name
        #[arg(short, long)]
        name: Option<String>,
    },

    /// List all accounts
    List,

    /// Export account mnemonic
    Export {
        /// Account name
        name: String,
    },
}

#[derive(Subcommand)]
enum ConfigCommands {
    /// Set configuration value
    Set {
        /// Configuration key
        key: String,

        /// Configuration value
        value: String,
    },

    /// Get configuration value
    Get {
        /// Configuration key
        key: String,
    },

    /// List all configuration
    List,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Account(cmd) => match cmd {
            AccountCommands::Create { name } => {
                commands::account::create(name).await?;
            }
            AccountCommands::Import { mnemonic, name } => {
                commands::account::import(mnemonic, name).await?;
            }
            AccountCommands::List => {
                commands::account::list().await?;
            }
            AccountCommands::Export { name } => {
                commands::account::export(&name).await?;
            }
        },
        Commands::Balance { address } => {
            commands::balance::check(&address).await?;
        }
        Commands::Transfer { to, amount, from, yes } => {
            commands::transfer::send(&to, &amount, from, yes).await?;
        }
        Commands::Config(cmd) => match cmd {
            ConfigCommands::Set { key, value } => {
                commands::config::set(&key, &value).await?;
            }
            ConfigCommands::Get { key } => {
                commands::config::get(&key).await?;
            }
            ConfigCommands::List => {
                commands::config::list().await?;
            }
        },
    }

    Ok(())
}
```

### 2. Account Management

```rust title="src/commands/account.rs"
use anyhow::{Result, Context};
use colored::*;
use dialoguer::{Input, Password, Confirm};
use bip39::{Mnemonic, Language};
use crate::config::{Account, save_account, load_accounts};

pub async fn create(name: Option<String>) -> Result<()> {
    // Generate mnemonic
    let mnemonic = Mnemonic::generate_in(Language::English, 12)?;
    let mnemonic_str = mnemonic.to_string();

    // Get account name
    let name = match name {
        Some(n) => n,
        None => Input::new()
            .with_prompt("Account name")
            .interact_text()?
    };

    // Create account
    let account = glin_client::account_from_seed(&mnemonic_str)?;
    let address = glin_client::get_address(&account);

    // Save account
    save_account(Account {
        name: name.clone(),
        address: address.clone(),
        mnemonic: mnemonic_str.clone(),
    })?;

    println!("\n{}\n", "✅ Account created successfully!".green());
    println!("{} {}", "Name:".bold(), name);
    println!("{} {}", "Address:".bold(), address);
    println!("\n{}", "Mnemonic (SAVE THIS SECURELY):".bold());
    println!("{}", mnemonic_str.yellow());
    println!("\n{}\n", "⚠️  Never share your mnemonic phrase!".red());

    Ok(())
}

pub async fn import(mnemonic: Option<String>, name: Option<String>) -> Result<()> {
    // Get mnemonic
    let mnemonic_str = match mnemonic {
        Some(m) => m,
        None => Password::new()
            .with_prompt("Enter mnemonic phrase")
            .interact()?
    };

    // Validate mnemonic
    let words: Vec<&str> = mnemonic_str.split_whitespace().collect();
    if ![12, 24].contains(&words.len()) {
        anyhow::bail!("Mnemonic must be 12 or 24 words");
    }

    // Get account name
    let name = match name {
        Some(n) => n,
        None => Input::new()
            .with_prompt("Account name")
            .interact_text()?
    };

    // Import account
    let account = glin_client::account_from_seed(&mnemonic_str)?;
    let address = glin_client::get_address(&account);

    // Save account
    save_account(Account {
        name: name.clone(),
        address: address.clone(),
        mnemonic: mnemonic_str,
    })?;

    println!("\n{}\n", "✅ Account imported successfully!".green());
    println!("{} {}", "Name:".bold(), name);
    println!("{} {}", "Address:".bold(), address);

    Ok(())
}

pub async fn list() -> Result<()> {
    let accounts = load_accounts()?;

    if accounts.is_empty() {
        println!("{}", "No accounts found. Create one with: glin account create".yellow());
        return Ok(());
    }

    println!("\n{}\n", "📋 Accounts:".bold());

    for (index, account) in accounts.iter().enumerate() {
        println!("{}. {}", (index + 1).to_string().cyan(), account.name.cyan());
        println!("   {}\n", account.address.bright_black());
    }

    Ok(())
}

pub async fn export(name: &str) -> Result<()> {
    let accounts = load_accounts()?;
    let account = accounts.iter()
        .find(|a| a.name == name)
        .context(format!("Account \"{}\" not found", name))?;

    // Confirm export
    let confirm = Confirm::new()
        .with_prompt("Are you sure you want to export the mnemonic?")
        .default(false)
        .interact()?;

    if !confirm {
        println!("{}", "Export cancelled".yellow());
        return Ok(());
    }

    println!("\n{} {}", "Mnemonic for".bold(), name.cyan());
    println!("{}", account.mnemonic.yellow());
    println!("\n{}\n", "⚠️  Never share your mnemonic phrase!".red());

    Ok(())
}
```

### 3. Balance & Transfer

```rust title="src/commands/balance.rs"
use anyhow::Result;
use colored::*;
use glin_client::create_client;
use crate::config::load_config;

pub async fn check(address: &str) -> Result<()> {
    print!("Fetching balance... ");
    std::io::Write::flush(&mut std::io::stdout())?;

    let config = load_config()?;
    let client = create_client(&config.rpc).await?;

    let balance = client.get_balance(address).await?;

    println!("{}", "Done!".green());

    let free = balance / 10u128.pow(18);

    println!("\n{} {}", "💰 Balance for".bold(), address.cyan());
    println!("\n{} {}\n", "Free:".bold(), format!("{} GLIN", free).green());

    Ok(())
}
```

```rust title="src/commands/transfer.rs"
use anyhow::{Result, Context};
use colored::*;
use dialoguer::{Select, Confirm};
use glin_client::{create_client, account_from_seed};
use subxt::tx::PairSigner;
use crate::config::{load_config, load_accounts};

pub async fn send(to: &str, amount: &str, from: Option<String>, skip_confirm: bool) -> Result<()> {
    // Load accounts
    let accounts = load_accounts()?;
    if accounts.is_empty() {
        anyhow::bail!("No accounts found. Create one first.");
    }

    // Select account
    let from_account = match from {
        Some(name) => accounts.iter()
            .find(|a| a.name == name)
            .context(format!("Account \"{}\" not found", name))?
            .clone(),
        None => {
            let choices: Vec<String> = accounts.iter()
                .map(|a| format!("{} ({})", a.name, a.address))
                .collect();

            let selection = Select::new()
                .with_prompt("Select account to send from")
                .items(&choices)
                .interact()?;

            accounts[selection].clone()
        }
    };

    // Parse amount
    let amount_value: u128 = amount.parse()?;
    let amount_bn = amount_value * 10u128.pow(18);

    // Show transfer details
    println!("\n{}\n", "📤 Transfer Details:".bold());
    println!("{} {}", "From:  ".bold(), from_account.name);
    println!("{} {}", "To:    ".bold(), to);
    println!("{} {}\n", "Amount:".bold(), format!("{} GLIN", amount).green());

    // Confirm transfer
    if !skip_confirm {
        let confirm = Confirm::new()
            .with_prompt("Confirm transfer?")
            .default(false)
            .interact()?;

        if !confirm {
            println!("{}", "Transfer cancelled".yellow());
            return Ok(());
        }
    }

    print!("Sending transaction... ");
    std::io::Write::flush(&mut std::io::stdout())?;

    // Connect to network
    let config = load_config()?;
    let client = create_client(&config.rpc).await?;

    // Create signer
    let account = account_from_seed(&from_account.mnemonic)?;
    let signer = PairSigner::new(account);

    // Create and send transfer
    let transfer_tx = subxt::dynamic::tx(
        "Balances",
        "transfer",
        vec![
            subxt::dynamic::Value::from_bytes(to.as_bytes()),
            subxt::dynamic::Value::u128(amount_bn),
        ],
    );

    let hash = client
        .tx()
        .sign_and_submit_default(&transfer_tx, &signer)
        .await?;

    println!("{}", "Done!".green());
    println!("\n{}\n", "✅ Transfer successful!".green());
    println!("{} {:?}", "Transaction hash:".bold(), hash);

    Ok(())
}
```

### 4. Configuration

```rust title="src/config.rs"
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub rpc: String,
    pub network: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub name: String,
    pub address: String,
    pub mnemonic: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Storage {
    config: Config,
    accounts: Vec<Account>,
}

impl Default for Storage {
    fn default() -> Self {
        Self {
            config: Config {
                rpc: "wss://testnet.glin.ai".to_string(),
                network: "testnet".to_string(),
            },
            accounts: Vec::new(),
        }
    }
}

fn get_config_path() -> Result<PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Could not find home directory"))?;
    let config_dir = home.join(".glin-cli");

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)?;
    }

    Ok(config_dir.join("config.json"))
}

fn load_storage() -> Result<Storage> {
    let path = get_config_path()?;

    if !path.exists() {
        let storage = Storage::default();
        let json = serde_json::to_string_pretty(&storage)?;
        fs::write(&path, json)?;
        return Ok(storage);
    }

    let data = fs::read_to_string(&path)?;
    let storage: Storage = serde_json::from_str(&data)?;
    Ok(storage)
}

fn save_storage(storage: &Storage) -> Result<()> {
    let path = get_config_path()?;
    let json = serde_json::to_string_pretty(storage)?;
    fs::write(&path, json)?;
    Ok(())
}

pub fn load_config() -> Result<Config> {
    let storage = load_storage()?;
    Ok(storage.config)
}

pub fn set_config_value(key: &str, value: &str) -> Result<()> {
    let mut storage = load_storage()?;

    match key {
        "rpc" => storage.config.rpc = value.to_string(),
        "network" => storage.config.network = value.to_string(),
        _ => anyhow::bail!("Unknown configuration key: {}", key),
    }

    save_storage(&storage)?;
    Ok(())
}

pub fn save_account(account: Account) -> Result<()> {
    let mut storage = load_storage()?;

    // Check if account name already exists
    if storage.accounts.iter().any(|a| a.name == account.name) {
        anyhow::bail!("Account \"{}\" already exists", account.name);
    }

    storage.accounts.push(account);
    save_storage(&storage)?;
    Ok(())
}

pub fn load_accounts() -> Result<Vec<Account>> {
    let storage = load_storage()?;
    Ok(storage.accounts)
}
```

```rust title="src/commands/config.rs"
use anyhow::Result;
use colored::*;
use crate::config::{load_config, set_config_value};

pub async fn set(key: &str, value: &str) -> Result<()> {
    set_config_value(key, value)?;
    println!("{}", "✅ Configuration updated".green());
    println!("{} {}", format!("{}:", key).bold(), value);
    Ok(())
}

pub async fn get(key: &str) -> Result<()> {
    let config = load_config()?;

    let value = match key {
        "rpc" => &config.rpc,
        "network" => &config.network,
        _ => anyhow::bail!("Unknown configuration key: {}", key),
    };

    println!("{} {}", format!("{}:", key).bold(), value);
    Ok(())
}

pub async fn list() -> Result<()> {
    let config = load_config()?;

    println!("\n{}\n", "⚙️  Configuration:".bold());
    println!("{} {}", "rpc:".cyan(), config.rpc);
    println!("{} {}\n", "network:".cyan(), config.network);

    Ok(())
}
```

### 5. Module Declaration

```rust title="src/commands/mod.rs"
pub mod account;
pub mod balance;
pub mod transfer;
pub mod config;
```

## Building and Installing

### TypeScript

```bash
# Build
npm run build

# Install globally
npm install -g .

# Or link for development
npm link

# Now you can use the CLI
glin --help
```

### Rust

```bash
# Build release version
cargo build --release

# Install to ~/.cargo/bin
cargo install --path .

# Now you can use the CLI
glin --help
```

## Usage Examples

### Create Account

```bash
$ glin account create --name my-account

✅ Account created successfully!

Name: my-account
Address: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

Mnemonic (SAVE THIS SECURELY):
word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12

⚠️  Never share your mnemonic phrase!
```

### Check Balance

```bash
$ glin balance 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

💰 Balance for 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

Free:      1000 GLIN
Reserved:  0 GLIN
Frozen:    0 GLIN
```

### Send Transfer

```bash
$ glin transfer 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty 100

📤 Transfer Details:

From:   my-account
To:     5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty
Amount: 100 GLIN

? Confirm transfer? Yes
✔ Transaction finalized!

✅ Transfer successful!
```

### Configuration

```bash
# Set RPC endpoint
$ glin config set rpc wss://mainnet.glin.ai
✅ Configuration updated
rpc: wss://mainnet.glin.ai

# List configuration
$ glin config list

⚙️  Configuration:

rpc: wss://mainnet.glin.ai
network: mainnet
```

## Advanced Features

### Add Transaction History

```typescript title="src/commands/history.ts"
import { GlinClient } from '@glin-ai/sdk';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig } from '../utils/storage';

export async function showHistory(address: string, options: any) {
  const spinner = ora('Fetching transaction history...').start();

  try {
    const config = await getConfig();
    const client = await GlinClient.connect(config.rpc);

    // This would require an indexer or archive node
    // For demonstration, we'll show how it would look

    spinner.stop();

    console.log(chalk.bold('\n📜 Transaction History for'), chalk.cyan(address));
    console.log(chalk.gray(`(Last ${options.limit} transactions)\n`));

    // Example output structure
    const transactions = [
      {
        hash: '0x1234...',
        block: 12345,
        type: 'transfer',
        from: address,
        to: '5FHne...',
        amount: '100 GLIN',
        timestamp: new Date()
      }
    ];

    transactions.forEach((tx, i) => {
      console.log(chalk.bold(`${i + 1}. ${tx.type}`));
      console.log(`   Hash: ${chalk.gray(tx.hash)}`);
      console.log(`   Block: ${tx.block}`);
      console.log(`   Amount: ${chalk.green(tx.amount)}`);
      console.log(`   Time: ${tx.timestamp.toLocaleString()}\n`);
    });

    await client.disconnect();

  } catch (error: any) {
    spinner.stop();
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}
```

### Add Interactive Mode

```typescript
import inquirer from 'inquirer';

async function interactiveMode() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        'Create account',
        'Check balance',
        'Send transfer',
        'View accounts',
        'Exit'
      ]
    }
  ]);

  switch (answers.action) {
    case 'Create account':
      await createAccount({});
      break;
    case 'Check balance':
      // ... implement
      break;
    // ... other cases
  }
}
```

## Next Steps

- 💡 [Sign in with GLIN](/docs/sdk/examples/sign-in-with-glin) - Wallet authentication
- 🚀 [Deploy Contract](/docs/sdk/examples/deploy-contract) - Contract deployment
- 📊 [Build Indexer](/docs/sdk/examples/build-indexer) - Index blockchain data

---

Need help? [Join our Discord](https://discord.gg/glin-ai)
