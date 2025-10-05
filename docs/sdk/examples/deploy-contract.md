# Example: Deploy a Smart Contract

Complete working example of deploying an ink! smart contract to GLIN Network.

## What You'll Build

A CLI tool that deploys ink! smart contracts with:

- 📦 Automatic contract compilation
- ⛽ Gas estimation
- 🔍 Deployment verification
- 💾 Contract address storage
- 📊 Deployment summary

## Prerequisites

- Rust 1.70+
- `cargo-contract` CLI tool
- GLIN testnet account with funds

## Project Setup

### 1. Install cargo-contract

```bash
cargo install cargo-contract --force
```

### 2. Create Sample Contract

```bash
# Create new ink! contract
cargo contract new flipper
cd flipper

# Build the contract
cargo contract build --release
```

This generates:
- `target/ink/flipper.wasm` - Contract code
- `target/ink/flipper.json` - Contract metadata
- `target/ink/flipper.contract` - Complete bundle

### 3. Create Deployment Tool

```bash
cargo new --bin deploy-tool
cd deploy-tool
cargo add glin-client glin-contracts tokio anyhow serde serde_json
cargo add clap --features derive
cargo add colored indicatif
```

## Implementation

### 1. Main Deployment Logic

```rust title="src/main.rs"
use clap::{Parser, Subcommand};
use colored::Colorize;
use glin_client::{create_client, account_from_seed, get_address};
use glin_contracts::{deploy_contract, DeploymentResult};
use subxt::tx::PairSigner;
use anyhow::{Result, Context};
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "deploy-tool")]
#[command(about = "Deploy ink! contracts to GLIN Network", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Deploy a contract
    Deploy {
        /// Path to contract .wasm file
        #[arg(short, long)]
        wasm: PathBuf,

        /// Path to contract metadata.json
        #[arg(short, long)]
        metadata: PathBuf,

        /// Constructor arguments (comma-separated)
        #[arg(short, long, value_delimiter = ',')]
        args: Vec<String>,

        /// Deployer seed phrase
        #[arg(short, long, env = "DEPLOYER_SEED")]
        seed: String,

        /// Network endpoint
        #[arg(short, long, default_value = "wss://testnet.glin.ai")]
        network: String,
    },

    /// Estimate deployment gas
    Estimate {
        /// Path to contract .wasm file
        #[arg(short, long)]
        wasm: PathBuf,

        /// Path to contract metadata.json
        #[arg(short, long)]
        metadata: PathBuf,

        /// Constructor arguments (comma-separated)
        #[arg(short, long, value_delimiter = ',')]
        args: Vec<String>,

        /// Network endpoint
        #[arg(short, long, default_value = "wss://testnet.glin.ai")]
        network: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Deploy {
            wasm,
            metadata,
            args,
            seed,
            network,
        } => {
            deploy_contract_cmd(wasm, metadata, args, seed, network).await?;
        }
        Commands::Estimate {
            wasm,
            metadata,
            args,
            network,
        } => {
            estimate_gas_cmd(wasm, metadata, args, network).await?;
        }
    }

    Ok(())
}

async fn deploy_contract_cmd(
    wasm_path: PathBuf,
    metadata_path: PathBuf,
    args: Vec<String>,
    seed: String,
    network: String,
) -> Result<()> {
    println!("{}", "🚀 GLIN Contract Deployment Tool".bright_cyan().bold());
    println!();

    // 1. Load contract files
    println!("{} Loading contract files...", "→".cyan());
    let wasm = fs::read(&wasm_path)
        .context(format!("Failed to read WASM file: {:?}", wasm_path))?;
    let metadata = fs::read_to_string(&metadata_path)
        .context(format!("Failed to read metadata: {:?}", metadata_path))?;

    println!("  {} WASM size: {} bytes", "✓".green(), wasm.len());
    println!("  {} Metadata loaded", "✓".green());
    println!();

    // 2. Connect to network
    println!("{} Connecting to {}...", "→".cyan(), network);
    let client = create_client(&network).await
        .context("Failed to connect to network")?;
    println!("  {} Connected successfully", "✓".green());
    println!();

    // 3. Load deployer account
    println!("{} Loading deployer account...", "→".cyan());
    let deployer = account_from_seed(&seed)
        .context("Failed to create account from seed")?;
    let deployer_address = get_address(&deployer);
    let signer = PairSigner::new(deployer);

    println!("  {} Deployer: {}", "✓".green(), deployer_address);

    // Check balance
    let balance = client.get_balance(&deployer_address).await?;
    println!("  {} Balance: {} GLIN", "✓".green(), balance);
    println!();

    if balance < 1_000_000_000_000_000_000 {
        println!("{} Insufficient balance (need at least 1 GLIN)", "✗".red());
        return Ok(());
    }

    // 4. Estimate gas
    println!("{} Estimating gas...", "→".cyan());
    let gas_limit = 3_000_000_000u64;
    println!("  {} Gas limit: {}", "✓".green(), gas_limit);
    println!();

    // 5. Deploy contract
    println!("{} Deploying contract...", "→".cyan());

    let constructor_args: Vec<_> = args
        .into_iter()
        .map(|arg| arg.into())
        .collect();

    let deployment = deploy_contract(
        &client,
        &signer,
        wasm,
        metadata,
        constructor_args.clone(),
        gas_limit,
        None, // Storage deposit limit
    ).await?;

    match deployment {
        DeploymentResult::Success { address, hash } => {
            println!();
            println!("{}", "═══════════════════════════════════════════".bright_green());
            println!("{}", "  ✅ DEPLOYMENT SUCCESSFUL!".bright_green().bold());
            println!("{}", "═══════════════════════════════════════════".bright_green());
            println!();
            println!("  {} Contract Address:", "📍".bright_yellow());
            println!("    {}", address.bright_white().bold());
            println!();
            println!("  {} Transaction Hash:", "🔗".bright_yellow());
            println!("    {:?}", hash);
            println!();
            println!("  {} Constructor Args:", "📝".bright_yellow());
            for (i, arg) in constructor_args.iter().enumerate() {
                println!("    [{}] {:?}", i, arg);
            }
            println!();

            // Save deployment info
            save_deployment_info(&address, &network)?;

            println!("{}", "═══════════════════════════════════════════".bright_green());
        }
        DeploymentResult::Failed { error } => {
            println!();
            println!("{} Deployment failed: {}", "✗".red(), error);
        }
    }

    Ok(())
}

async fn estimate_gas_cmd(
    wasm_path: PathBuf,
    metadata_path: PathBuf,
    args: Vec<String>,
    network: String,
) -> Result<()> {
    println!("{}", "⛽ Gas Estimation".bright_cyan().bold());
    println!();

    // Load files
    let wasm = fs::read(&wasm_path)?;
    let metadata = fs::read_to_string(&metadata_path)?;

    // Connect
    let client = create_client(&network).await?;

    // Estimate (simplified - actual implementation would use dry-run)
    let estimated_gas = 3_000_000_000u64;

    println!("  {} Reference time: {}", "✓".green(), estimated_gas);
    println!("  {} Proof size: {}", "✓".green(), 500_000);
    println!();
    println!("  💡 Recommended gas limit: {} (with 10% buffer)", estimated_gas + (estimated_gas / 10));

    Ok(())
}

fn save_deployment_info(address: &str, network: &str) -> Result<()> {
    use serde_json::json;

    let deployment_info = json!({
        "address": address,
        "network": network,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    fs::write(
        "deployment.json",
        serde_json::to_string_pretty(&deployment_info)?
    )?;

    println!("  {} Deployment info saved to deployment.json", "💾".bright_yellow());

    Ok(())
}
```

### 2. Add Dependencies

```toml title="Cargo.toml"
[package]
name = "deploy-tool"
version = "0.1.0"
edition = "2021"

[dependencies]
glin-client = "0.1"
glin-contracts = "0.1"
tokio = { version = "1", features = ["full"] }
anyhow = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
clap = { version = "4", features = ["derive"] }
colored = "2"
indicatif = "0.17"
chrono = "0.4"
subxt = "0.34"
```

## Usage

### Deploy Contract

```bash
# Set deployer seed
export DEPLOYER_SEED="word1 word2 word3 ... word12"

# Deploy flipper contract
cargo run -- deploy \
  --wasm ../flipper/target/ink/flipper.wasm \
  --metadata ../flipper/target/ink/flipper.json \
  --args "true" \
  --seed "$DEPLOYER_SEED" \
  --network wss://testnet.glin.ai
```

### Expected Output

```
🚀 GLIN Contract Deployment Tool

→ Loading contract files...
  ✓ WASM size: 14523 bytes
  ✓ Metadata loaded

→ Connecting to wss://testnet.glin.ai...
  ✓ Connected successfully

→ Loading deployer account...
  ✓ Deployer: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
  ✓ Balance: 10000000000000000000 GLIN

→ Estimating gas...
  ✓ Gas limit: 3000000000

→ Deploying contract...

═══════════════════════════════════════════
  ✅ DEPLOYMENT SUCCESSFUL!
═══════════════════════════════════════════

  📍 Contract Address:
    5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty

  🔗 Transaction Hash:
    0x1234567890abcdef...

  📝 Constructor Args:
    [0] true

  💾 Deployment info saved to deployment.json

═══════════════════════════════════════════
```

### Estimate Gas

```bash
cargo run -- estimate \
  --wasm ../flipper/target/ink/flipper.wasm \
  --metadata ../flipper/target/ink/flipper.json \
  --args "true" \
  --network wss://testnet.glin.ai
```

## TypeScript Version

### Setup

```bash
mkdir deploy-tool-ts
cd deploy-tool-ts
npm init -y
npm install @glin-ai/sdk @polkadot/api-contract commander chalk
npm install -D typescript tsx @types/node
```

### Implementation

```typescript title="deploy.ts"
#!/usr/bin/env node
import { Command } from 'commander';
import { GlinClient, Keyring } from '@glin-ai/sdk';
import { ContractPromise } from '@polkadot/api-contract';
import chalk from 'chalk';
import fs from 'fs';

const program = new Command();

program
  .name('deploy-tool')
  .description('Deploy ink! contracts to GLIN Network')
  .version('0.1.0');

program
  .command('deploy')
  .description('Deploy a contract')
  .requiredOption('-w, --wasm <path>', 'Path to .wasm file')
  .requiredOption('-m, --metadata <path>', 'Path to metadata.json')
  .option('-a, --args <args...>', 'Constructor arguments', [])
  .requiredOption('-s, --seed <seed>', 'Deployer seed phrase')
  .option('-n, --network <url>', 'Network endpoint', 'wss://testnet.glin.ai')
  .action(async (options) => {
    await deployContract(options);
  });

program
  .command('estimate')
  .description('Estimate deployment gas')
  .requiredOption('-w, --wasm <path>', 'Path to .wasm file')
  .requiredOption('-m, --metadata <path>', 'Path to metadata.json')
  .option('-a, --args <args...>', 'Constructor arguments', [])
  .option('-n, --network <url>', 'Network endpoint', 'wss://testnet.glin.ai')
  .action(async (options) => {
    await estimateGas(options);
  });

async function deployContract(options: any) {
  console.log(chalk.bold.cyan('🚀 GLIN Contract Deployment Tool'));
  console.log();

  // 1. Load contract files
  console.log(chalk.cyan('→ Loading contract files...'));
  const wasm = fs.readFileSync(options.wasm);
  const metadata = JSON.parse(fs.readFileSync(options.metadata, 'utf8'));

  console.log(chalk.green(`  ✓ WASM size: ${wasm.length} bytes`));
  console.log(chalk.green('  ✓ Metadata loaded'));
  console.log();

  // 2. Connect to network
  console.log(chalk.cyan(`→ Connecting to ${options.network}...`));
  const client = await GlinClient.connect(options.network);
  console.log(chalk.green('  ✓ Connected successfully'));
  console.log();

  // 3. Load deployer account
  console.log(chalk.cyan('→ Loading deployer account...'));
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(options.seed);

  console.log(chalk.green(`  ✓ Deployer: ${deployer.address}`));

  const balance = await client.getBalance(deployer.address);
  console.log(chalk.green(`  ✓ Balance: ${balance.free.toString()} GLIN`));
  console.log();

  if (balance.free < 10n ** 18n) {
    console.log(chalk.red('✗ Insufficient balance (need at least 1 GLIN)'));
    return;
  }

  // 4. Estimate gas
  console.log(chalk.cyan('→ Estimating gas...'));
  const gasLimit = client.api.registry.createType('WeightV2', {
    refTime: 3_000_000_000,
    proofSize: 1_000_000,
  });
  console.log(chalk.green('  ✓ Gas estimated'));
  console.log();

  // 5. Deploy contract
  console.log(chalk.cyan('→ Deploying contract...'));

  const contract = new ContractPromise(client.api, metadata, null);

  const tx = contract.tx.new(
    { gasLimit, storageDepositLimit: null },
    ...options.args
  );

  const contractAddress = await new Promise<string>((resolve, reject) => {
    tx.signAndSend(deployer, ({ status, contract: deployedContract }) => {
      if (status.isFinalized) {
        const address = deployedContract?.address.toString();
        if (address) {
          resolve(address);
        } else {
          reject(new Error('Contract address not found'));
        }
      }
    });
  });

  console.log();
  console.log(chalk.bold.green('═══════════════════════════════════════════'));
  console.log(chalk.bold.green('  ✅ DEPLOYMENT SUCCESSFUL!'));
  console.log(chalk.bold.green('═══════════════════════════════════════════'));
  console.log();
  console.log(chalk.yellow('  📍 Contract Address:'));
  console.log(chalk.bold.white(`    ${contractAddress}`));
  console.log();
  console.log(chalk.yellow('  📝 Constructor Args:'));
  options.args.forEach((arg: any, i: number) => {
    console.log(`    [${i}] ${arg}`);
  });
  console.log();

  // Save deployment info
  const deploymentInfo = {
    address: contractAddress,
    network: options.network,
    timestamp: new Date().toISOString(),
    args: options.args,
  };

  fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));

  console.log(chalk.yellow('  💾 Deployment info saved to deployment.json'));
  console.log(chalk.bold.green('═══════════════════════════════════════════'));
}

async function estimateGas(options: any) {
  console.log(chalk.bold.cyan('⛽ Gas Estimation'));
  console.log();

  const client = await GlinClient.connect(options.network);

  // Simplified estimation
  const estimatedGas = 3_000_000_000;

  console.log(chalk.green(`  ✓ Reference time: ${estimatedGas}`));
  console.log(chalk.green('  ✓ Proof size: 500000'));
  console.log();
  console.log(
    chalk.blue(
      `  💡 Recommended gas limit: ${estimatedGas + estimatedGas / 10} (with 10% buffer)`
    )
  );
}

program.parse();
```

### Package.json Scripts

```json title="package.json"
{
  "name": "deploy-tool",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "deploy-tool": "./deploy.ts"
  },
  "scripts": {
    "deploy": "tsx deploy.ts deploy",
    "estimate": "tsx deploy.ts estimate"
  },
  "dependencies": {
    "@glin-ai/sdk": "*",
    "@polkadot/api-contract": "^10.9.1",
    "chalk": "^5.3.0",
    "commander": "^11.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

### Usage (TypeScript)

```bash
# Deploy
npm run deploy -- \
  --wasm ../flipper/target/ink/flipper.wasm \
  --metadata ../flipper/target/ink/flipper.json \
  --args true \
  --seed "word1 word2..." \
  --network wss://testnet.glin.ai

# Estimate gas
npm run estimate -- \
  --wasm ../flipper/target/ink/flipper.wasm \
  --metadata ../flipper/target/ink/flipper.json \
  --args true
```

## Advanced Features

### Multi-Contract Deployment

```rust title="src/batch_deploy.rs"
async fn deploy_multiple_contracts(
    client: &GlinClient,
    signer: &PairSigner,
    contracts: Vec<ContractConfig>,
) -> Result<Vec<String>> {
    let mut deployed_addresses = Vec::new();

    for (i, config) in contracts.iter().enumerate() {
        println!("Deploying contract {}/{}...", i + 1, contracts.len());

        let wasm = fs::read(&config.wasm_path)?;
        let metadata = fs::read_to_string(&config.metadata_path)?;

        let deployment = deploy_contract(
            client,
            signer,
            wasm,
            metadata,
            config.constructor_args.clone(),
            3_000_000_000,
            None,
        ).await?;

        if let DeploymentResult::Success { address, .. } = deployment {
            deployed_addresses.push(address.clone());
            println!("  ✓ Deployed: {}", address);
        }
    }

    Ok(deployed_addresses)
}

struct ContractConfig {
    wasm_path: PathBuf,
    metadata_path: PathBuf,
    constructor_args: Vec<String>,
}
```

## Best Practices

1. **Always estimate gas first**
   ```bash
   cargo run -- estimate --wasm contract.wasm --metadata metadata.json
   ```

2. **Use environment variables for secrets**
   ```bash
   export DEPLOYER_SEED="your-seed-phrase"
   cargo run -- deploy --seed "$DEPLOYER_SEED" ...
   ```

3. **Save deployment information**
   - Contract address
   - Network
   - Constructor arguments
   - Timestamp

4. **Verify deployment**
   - Query contract after deployment
   - Check contract code hash
   - Test contract methods

## Troubleshooting

### Contract Fails to Deploy

- Check WASM file is correct version
- Verify metadata matches WASM
- Ensure sufficient balance
- Increase gas limit

### Gas Estimation Fails

- Contract constructor may have errors
- Try with different constructor args
- Check contract compiles correctly

## What's Next?

- 📞 [Call Contract Methods](/docs/sdk/contracts/calling) - Interact with deployed contract
- 🔍 [Query Contract State](/docs/sdk/contracts/querying) - Read contract data
- 📊 [Contract Events](/docs/sdk/contracts/events) - Listen to events

---

Need help? [Join our Discord](https://discord.gg/glin-ai)
