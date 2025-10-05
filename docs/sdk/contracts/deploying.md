# Deploying Contracts

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Learn how to deploy ink! smart contracts to GLIN Network.

## Prerequisites

Before deploying contracts, you need:

- ✅ GLIN SDK installed ([TypeScript](/sdk/typescript/setup) or [Rust](/sdk/rust/setup))
- ✅ An ink! contract compiled to `.contract` file
- ✅ Account with sufficient balance for gas fees
- ✅ Connection to GLIN Network

:::tip New to ink! contracts?

If you're new to ink! smart contracts, check out the [ink! documentation](https://use.ink) to learn how to write and compile contracts.

:::

## What You'll Learn

- 📦 How to deploy contracts to GLIN Network
- ⛽ Gas estimation and optimization
- 🔍 Verifying deployment success
- 🐛 Troubleshooting common issues

## Deploy Your First Contract

### Step 1: Compile Your Contract

First, compile your ink! contract:

```bash
# Navigate to your contract directory
cd my-contract

# Build the contract
cargo contract build --release
```

This generates three files in `target/ink/`:
- `my_contract.contract` - Contract bundle (use this for deployment)
- `my_contract.wasm` - Raw WebAssembly
- `metadata.json` - Contract metadata

### Step 2: Deploy the Contract

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="deploy.ts"
import { GlinClient, Keyring } from '@glin-ai/sdk';
import { ContractPromise } from '@polkadot/api-contract';
import fs from 'fs';

async function deployContract() {
  // 1. Connect to network
  const client = await GlinClient.connect('wss://testnet.glin.ai');

  // 2. Load deployer account
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri('//Alice'); // Use your seed phrase

  // 3. Load contract files
  const wasm = fs.readFileSync('./target/ink/my_contract.wasm');
  const metadata = JSON.parse(
    fs.readFileSync('./target/ink/metadata.json', 'utf8')
  );

  // 4. Estimate gas
  const gasLimit = client.api.registry.createType('WeightV2', {
    refTime: 3_000_000_000,
    proofSize: 1_000_000,
  });

  // 5. Deploy contract
  console.log('📤 Deploying contract...');

  const contract = new ContractPromise(client.api, metadata, null);

  const tx = contract.tx.new(
    { gasLimit, storageDepositLimit: null },
    // Constructor arguments
    'Hello from GLIN!'
  );

  // 6. Sign and send
  const result = await new Promise((resolve, reject) => {
    tx.signAndSend(deployer, (result) => {
      if (result.status.isInBlock) {
        console.log(`✅ In block: ${result.status.asInBlock.toHex()}`);
      }

      if (result.status.isFinalized) {
        console.log(`✅ Finalized: ${result.status.asFinalized.toHex()}`);

        // Find contract address
        const contractAddress = result.contract?.address.toString();

        if (contractAddress) {
          console.log(`📍 Contract deployed at: ${contractAddress}`);
          resolve(contractAddress);
        } else {
          reject(new Error('Contract address not found'));
        }
      }

      if (result.isError) {
        reject(new Error('Deployment failed'));
      }
    });
  });

  return result;
}

deployContract()
  .then((address) => {
    console.log('🎉 Deployment successful!');
    console.log(`Contract address: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
```

Run it:
```bash
npx tsx deploy.ts
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/deploy.rs"
use glin_client::{create_client, get_dev_account};
use glin_contracts::{deploy_contract, DeploymentResult};
use subxt::tx::PairSigner;
use anyhow::Result;
use std::fs;

#[tokio::main]
async fn main() -> Result<()> {
    // 1. Connect to network
    println!("🔗 Connecting to GLIN Network...");
    let client = create_client("wss://testnet.glin.ai").await?;

    // 2. Load deployer account
    let deployer = get_dev_account("alice")?; // Use your seed phrase
    let signer = PairSigner::new(deployer);

    // 3. Load contract files
    let wasm = fs::read("./target/ink/my_contract.wasm")?;
    let metadata = fs::read_to_string("./target/ink/metadata.json")?;

    // 4. Deploy contract
    println!("📤 Deploying contract...");

    let deployment = deploy_contract(
        &client,
        &signer,
        wasm,
        metadata,
        vec!["Hello from GLIN!".into()], // Constructor args
        1_000_000_000_000, // Gas limit
        None, // Storage deposit limit
    ).await?;

    match deployment {
        DeploymentResult::Success { address, hash } => {
            println!("✅ Contract deployed successfully!");
            println!("📍 Contract address: {}", address);
            println!("🔗 Transaction hash: {:?}", hash);
        }
        DeploymentResult::Failed { error } => {
            eprintln!("❌ Deployment failed: {}", error);
        }
    }

    Ok(())
}
```

Run it:
```bash
cargo run --bin deploy
```

</TabItem>
</Tabs>

Expected output:
```
🔗 Connecting to GLIN Network...
📤 Deploying contract...
✅ In block: 0x1234...
✅ Finalized: 0x5678...
📍 Contract deployed at: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
🎉 Deployment successful!
```

## Gas Estimation

Proper gas estimation prevents failed transactions and saves fees.

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="estimate-gas.ts"
import { GlinClient } from '@glin-ai/sdk';
import { ContractPromise } from '@polkadot/api-contract';

async function estimateDeploymentGas() {
  const client = await GlinClient.connect('wss://testnet.glin.ai');

  // Load contract metadata
  const metadata = require('./target/ink/metadata.json');
  const contract = new ContractPromise(client.api, metadata, null);

  // Dry run to estimate gas
  const dryRun = await client.api.call.contractsApi.instantiate(
    deployer.address,
    0, // value
    null, // gasLimit (null = estimate)
    null, // storageDepositLimit
    contract.abi.constructors[0].toU8a([]), // Constructor with args
    wasm
  );

  if (dryRun.result.isOk) {
    const gasRequired = dryRun.gasRequired;

    console.log('Gas estimation:');
    console.log('- Reference time:', gasRequired.refTime.toString());
    console.log('- Proof size:', gasRequired.proofSize.toString());

    // Add 10% buffer
    const gasLimit = client.api.registry.createType('WeightV2', {
      refTime: gasRequired.refTime.muln(1.1),
      proofSize: gasRequired.proofSize.muln(1.1),
    });

    return gasLimit;
  } else {
    throw new Error('Gas estimation failed: ' + dryRun.result.asErr);
  }
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/estimate_gas.rs"
use glin_client::GlinClient;
use glin_contracts::estimate_deployment_gas;
use anyhow::Result;
use std::fs;

pub async fn estimate_gas(
    client: &GlinClient,
    deployer_address: &str,
) -> Result<(u64, u64)> {
    // Load contract files
    let wasm = fs::read("./target/ink/my_contract.wasm")?;
    let metadata = fs::read_to_string("./target/ink/my_contract.json")?;

    // Estimate gas
    let gas_estimate = estimate_deployment_gas(
        client,
        deployer_address,
        wasm,
        metadata,
        vec!["Hello from GLIN!".into()],
    ).await?;

    println!("Gas estimation:");
    println!("- Reference time: {}", gas_estimate.ref_time);
    println!("- Proof size: {}", gas_estimate.proof_size);

    // Add 10% buffer
    let ref_time = (gas_estimate.ref_time as f64 * 1.1) as u64;
    let proof_size = (gas_estimate.proof_size as f64 * 1.1) as u64;

    Ok((ref_time, proof_size))
}
```

</TabItem>
</Tabs>

:::tip Gas Optimization Tips

1. **Always add a buffer** - Add 10-20% to estimated gas to account for state changes
2. **Use dry-run first** - Test deployment without committing to chain
3. **Optimize contract code** - Smaller contracts use less gas
4. **Minimize storage** - Storage operations are expensive

:::

## Deploy with Constructor Arguments

Most contracts require constructor arguments:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="deploy-with-args.ts"
import { GlinClient, Keyring } from '@glin-ai/sdk';
import { ContractPromise } from '@polkadot/api-contract';

async function deployTokenContract() {
  const client = await GlinClient.connect('wss://testnet.glin.ai');
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri('//Alice');

  // Load contract
  const metadata = require('./target/ink/erc20.json');
  const contract = new ContractPromise(client.api, metadata, null);

  // Deploy with constructor arguments
  const initialSupply = 1_000_000;
  const tokenName = 'MyToken';
  const tokenSymbol = 'MTK';

  const gasLimit = client.api.registry.createType('WeightV2', {
    refTime: 3_000_000_000,
    proofSize: 1_000_000,
  });

  const tx = contract.tx.new(
    { gasLimit, storageDepositLimit: null },
    initialSupply,
    tokenName,
    tokenSymbol
  );

  console.log(`📤 Deploying ERC20 token: ${tokenName} (${tokenSymbol})`);
  console.log(`   Initial supply: ${initialSupply}`);

  const address = await new Promise((resolve, reject) => {
    tx.signAndSend(deployer, (result) => {
      if (result.status.isFinalized) {
        const contractAddress = result.contract?.address.toString();
        if (contractAddress) {
          resolve(contractAddress);
        } else {
          reject(new Error('Contract address not found'));
        }
      }
      if (result.isError) {
        reject(new Error('Deployment failed'));
      }
    });
  });

  console.log(`✅ Token deployed at: ${address}`);
  return address;
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/deploy_token.rs"
use glin_client::{create_client, get_dev_account};
use glin_contracts::deploy_contract;
use subxt::tx::PairSigner;
use anyhow::Result;
use std::fs;

#[tokio::main]
async fn main() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;
    let deployer = get_dev_account("alice")?;
    let signer = PairSigner::new(deployer);

    // Constructor arguments
    let initial_supply = 1_000_000u128;
    let token_name = "MyToken";
    let token_symbol = "MTK";

    println!("📤 Deploying ERC20 token: {} ({})", token_name, token_symbol);
    println!("   Initial supply: {}", initial_supply);

    // Load contract files
    let wasm = fs::read("./target/ink/erc20.wasm")?;
    let metadata = fs::read_to_string("./target/ink/erc20.json")?;

    // Deploy with constructor args
    let deployment = deploy_contract(
        &client,
        &signer,
        wasm,
        metadata,
        vec![
            initial_supply.into(),
            token_name.into(),
            token_symbol.into(),
        ],
        3_000_000_000,
        None,
    ).await?;

    if let Some(address) = deployment.address {
        println!("✅ Token deployed at: {}", address);
    }

    Ok(())
}
```

</TabItem>
</Tabs>

## Verify Deployment

After deploying, verify the contract is working:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="verify.ts"
import { GlinClient } from '@glin-ai/sdk';
import { ContractPromise } from '@polkadot/api-contract';

async function verifyContract(contractAddress: string) {
  const client = await GlinClient.connect('wss://testnet.glin.ai');

  // Load contract metadata
  const metadata = require('./target/ink/metadata.json');

  // Connect to deployed contract
  const contract = new ContractPromise(client.api, metadata, contractAddress);

  // Query contract state
  const { output } = await contract.query.getMessage(
    contractAddress,
    { gasLimit: -1 } // -1 = unlimited for queries
  );

  if (output?.toHuman()) {
    console.log('✅ Contract is working!');
    console.log('Message:', output.toHuman());
    return true;
  } else {
    console.log('❌ Contract verification failed');
    return false;
  }
}

// Usage
verifyContract('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
  .then((success) => process.exit(success ? 0 : 1));
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/verify.rs"
use glin_client::create_client;
use glin_contracts::query_contract;
use anyhow::Result;

pub async fn verify_contract(contract_address: &str) -> Result<bool> {
    let client = create_client("wss://testnet.glin.ai").await?;

    // Query contract
    let result = query_contract(
        &client,
        contract_address,
        "get_message", // Method name
        vec![], // No arguments
    ).await?;

    if let Some(message) = result {
        println!("✅ Contract is working!");
        println!("Message: {:?}", message);
        Ok(true)
    } else {
        println!("❌ Contract verification failed");
        Ok(false)
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let success = verify_contract(
        "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
    ).await?;

    std::process::exit(if success { 0 } else { 1 });
}
```

</TabItem>
</Tabs>

## Storage Deposit

Contracts on GLIN require a storage deposit to prevent spam:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
// Calculate required storage deposit
const storageDepositLimit = client.api.registry.createType(
  'Balance',
  1_000_000_000_000 // 1 GLIN
);

const tx = contract.tx.new(
  {
    gasLimit,
    storageDepositLimit // Explicitly set deposit limit
  },
  ...constructorArgs
);
```

**Storage deposit is refunded** when the contract is removed.

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// Calculate required storage deposit
let storage_deposit_limit = Some(1_000_000_000_000u128); // 1 GLIN

let deployment = deploy_contract(
    &client,
    &signer,
    wasm,
    metadata,
    constructor_args,
    gas_limit,
    storage_deposit_limit, // Explicitly set deposit limit
).await?;
```

**Storage deposit is refunded** when the contract is removed.

</TabItem>
</Tabs>

:::info Storage Deposit Calculation

The storage deposit is based on the contract's state size. For most contracts:
- Small contracts (< 1 KB): ~0.1 GLIN
- Medium contracts (1-10 KB): ~0.5 GLIN
- Large contracts (> 10 KB): ~1+ GLIN

Use `storageDepositLimit: null` to auto-calculate, or set explicit limit.

:::

## Error Handling

Handle deployment errors gracefully:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
async function deployWithErrorHandling() {
  try {
    const client = await GlinClient.connect('wss://testnet.glin.ai');
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri('//Alice');

    // Check balance first
    const balance = await client.getBalance(deployer.address);
    const minBalance = 10n ** 18n; // 1 GLIN

    if (balance.free < minBalance) {
      throw new Error(
        `Insufficient balance. Need at least 1 GLIN, have ${balance.free}`
      );
    }

    // Deploy contract
    // ... deployment code ...

  } catch (error) {
    if (error.message.includes('Module')) {
      console.error('❌ Contract execution error:', error.message);
    } else if (error.message.includes('balance')) {
      console.error('❌ Insufficient balance for deployment');
    } else if (error.message.includes('gas')) {
      console.error('❌ Gas estimation failed - contract too complex');
    } else {
      console.error('❌ Deployment failed:', error.message);
    }

    throw error;
  }
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use glin_contracts::DeploymentError;
use anyhow::{Result, Context};

pub async fn deploy_with_error_handling() -> Result<String> {
    let client = create_client("wss://testnet.glin.ai")
        .await
        .context("Failed to connect to network")?;

    let deployer = get_dev_account("alice")?;

    // Check balance first
    let address = get_address(&deployer);
    let balance = client.get_balance(&address).await?;
    let min_balance = 1_000_000_000_000_000_000u128; // 1 GLIN

    if balance < min_balance {
        anyhow::bail!(
            "Insufficient balance. Need at least 1 GLIN, have {}",
            balance
        );
    }

    // Deploy contract
    match deploy_contract(/* ... */).await {
        Ok(deployment) => {
            Ok(deployment.address.unwrap())
        }
        Err(e) => match e {
            DeploymentError::ContractExecution(msg) => {
                anyhow::bail!("Contract execution error: {}", msg)
            }
            DeploymentError::InsufficientGas => {
                anyhow::bail!("Gas estimation failed - contract too complex")
            }
            DeploymentError::InsufficientBalance => {
                anyhow::bail!("Insufficient balance for deployment")
            }
            _ => Err(e.into()),
        }
    }
}
```

</TabItem>
</Tabs>

## Deployment Checklist

Before deploying to production:

- [ ] ✅ Contract compiled with `--release` flag
- [ ] ✅ Contract tested thoroughly (unit + integration tests)
- [ ] ✅ Gas estimated and optimized
- [ ] ✅ Constructor arguments validated
- [ ] ✅ Storage deposit calculated
- [ ] ✅ Deployer account has sufficient balance
- [ ] ✅ Network endpoint is correct (testnet vs mainnet)
- [ ] ✅ Deployment script has error handling
- [ ] ✅ Contract address saved for future reference
- [ ] ✅ Deployment verified with test query

## Deployment Scripts

### Complete TypeScript Deployment Script

```typescript title="scripts/deploy.ts"
import { GlinClient, Keyring } from '@glin-ai/sdk';
import { ContractPromise } from '@polkadot/api-contract';
import fs from 'fs';
import path from 'path';

interface DeploymentConfig {
  network: 'local' | 'testnet' | 'mainnet';
  contractPath: string;
  constructorArgs: any[];
  deployerSeed: string;
}

async function deploy(config: DeploymentConfig) {
  // Network endpoints
  const endpoints = {
    local: 'ws://localhost:9944',
    testnet: 'wss://testnet.glin.ai',
    mainnet: 'wss://rpc.glin.ai',
  };

  console.log(`🚀 Deploying to ${config.network}...`);

  // 1. Connect
  const client = await GlinClient.connect(endpoints[config.network]);
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(config.deployerSeed);

  console.log(`👤 Deployer: ${deployer.address}`);

  // 2. Check balance
  const balance = await client.getBalance(deployer.address);
  console.log(`💰 Balance: ${balance.free.toString()} GLIN`);

  if (balance.free < 10n ** 18n) {
    throw new Error('Insufficient balance (need at least 1 GLIN)');
  }

  // 3. Load contract
  const wasm = fs.readFileSync(
    path.join(config.contractPath, 'my_contract.wasm')
  );
  const metadata = JSON.parse(
    fs.readFileSync(
      path.join(config.contractPath, 'metadata.json'),
      'utf8'
    )
  );

  console.log(`📦 Contract size: ${wasm.length} bytes`);

  // 4. Estimate gas
  console.log('⛽ Estimating gas...');
  const gasLimit = client.api.registry.createType('WeightV2', {
    refTime: 3_000_000_000,
    proofSize: 1_000_000,
  });

  // 5. Deploy
  const contract = new ContractPromise(client.api, metadata, null);
  const tx = contract.tx.new(
    { gasLimit, storageDepositLimit: null },
    ...config.constructorArgs
  );

  console.log('📤 Deploying contract...');

  const contractAddress = await new Promise<string>((resolve, reject) => {
    tx.signAndSend(deployer, (result) => {
      if (result.status.isInBlock) {
        console.log(`📦 In block: ${result.status.asInBlock.toHex()}`);
      }

      if (result.status.isFinalized) {
        console.log(`✅ Finalized: ${result.status.asFinalized.toHex()}`);

        const address = result.contract?.address.toString();
        if (address) {
          resolve(address);
        } else {
          reject(new Error('Contract address not found'));
        }
      }

      if (result.isError) {
        reject(new Error('Deployment failed'));
      }
    });
  });

  console.log(`\n🎉 Deployment successful!`);
  console.log(`📍 Contract address: ${contractAddress}`);

  // 6. Save deployment info
  const deploymentInfo = {
    network: config.network,
    address: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    constructorArgs: config.constructorArgs,
  };

  fs.writeFileSync(
    'deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('💾 Deployment info saved to deployment.json');

  return contractAddress;
}

// Usage
deploy({
  network: 'testnet',
  contractPath: './target/ink',
  constructorArgs: ['Hello from GLIN!'],
  deployerSeed: process.env.DEPLOYER_SEED || '//Alice',
})
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
```

## Troubleshooting

### Deployment Failed: Module Error

**Symptom**: `Module { index: 8, error: 5 }`

**Common causes**:
- Constructor panicked or returned an error
- Invalid constructor arguments
- Contract logic error

**Solution**: Check contract logs and ensure constructor succeeds

### Out of Gas

**Symptom**: `OutOfGas` error

**Solution**: Increase gas limit:
```typescript
const gasLimit = client.api.registry.createType('WeightV2', {
  refTime: 10_000_000_000, // Increase this
  proofSize: 2_000_000,    // And this
});
```

### Insufficient Balance

**Symptom**: `InsufficientBalance` error

**Solution**: Fund your account:
- **Testnet**: Use the faucet at `https://faucet.glin.ai`
- **Mainnet**: Transfer GLIN from another account

### Contract Already Exists

**Symptom**: Contract code hash collision

**Solution**: This is very rare. If it happens, modify your contract slightly and recompile.

## Next Steps

Now that you can deploy contracts:

- 📞 [Call Contract Methods](/sdk/contracts/calling) - Interact with deployed contracts
- 🔍 [Query Contract State](/sdk/contracts/querying) - Read contract data
- 📊 [Contract Events](/sdk/contracts/events) - Listen to contract events
- 💡 **Example: Deploy Contract** - Complete example (coming soon)

---

Need help? [Join our Discord](https://discord.gg/glin-ai) or check the [ink! documentation](https://use.ink).
