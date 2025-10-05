# Calling Contract Methods

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Learn how to call methods on deployed ink! smart contracts.

## Overview

After deploying a contract, you can interact with it by calling its methods. Contract methods fall into two categories:

- 🔵 **Queries** - Read-only operations (covered in [Querying State](/docs/sdk/contracts/querying))
- 🟢 **Transactions** - State-changing operations (this guide)

This guide focuses on **transactions** - methods that modify contract state.

## Prerequisites

- ✅ Contract deployed to GLIN Network ([Deploy Guide](/docs/sdk/contracts/deploying))
- ✅ Contract address and metadata
- ✅ Account with GLIN for gas fees

## Call a Contract Method

### Basic Example

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="call-contract.ts"
import { GlinClient, Keyring } from '@glin-ai/sdk';
import { ContractPromise } from '@polkadot/api-contract';
import fs from 'fs';

async function callContract() {
  // 1. Connect to network
  const client = await GlinClient.connect('wss://testnet.glin.ai');

  // 2. Load caller account
  const keyring = new Keyring({ type: 'sr25519' });
  const caller = keyring.addFromUri('//Alice');

  // 3. Load contract
  const contractAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const metadata = JSON.parse(
    fs.readFileSync('./target/ink/metadata.json', 'utf8')
  );

  const contract = new ContractPromise(client.api, metadata, contractAddress);

  // 4. Estimate gas
  const gasLimit = client.api.registry.createType('WeightV2', {
    refTime: 1_000_000_000,
    proofSize: 500_000,
  });

  // 5. Call method
  const tx = contract.tx.setMessage(
    { gasLimit, storageDepositLimit: null },
    'Hello from TypeScript!'
  );

  // 6. Sign and send
  const hash = await tx.signAndSend(caller);
  console.log('Transaction hash:', hash.toHex());

  // 7. Wait for finalization
  await client.waitForFinalization(hash);
  console.log('✅ Transaction finalized!');
}

callContract().catch(console.error);
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/call_contract.rs"
use glin_client::create_client;
use glin_contracts::call_contract;
use subxt::tx::PairSigner;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // 1. Connect to network
    let client = create_client("wss://testnet.glin.ai").await?;

    // 2. Load caller account
    let caller = glin_client::get_dev_account("alice")?;
    let signer = PairSigner::new(caller);

    // 3. Contract details
    let contract_address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    // 4. Call method
    println!("📤 Calling contract method...");

    let result = call_contract(
        &client,
        &signer,
        contract_address,
        "set_message",
        vec!["Hello from Rust!".into()],
        1_000_000_000, // Gas limit
        None, // Storage deposit limit
    ).await?;

    println!("✅ Transaction hash: {:?}", result.tx_hash);
    println!("✅ Call successful!");

    Ok(())
}
```

</TabItem>
</Tabs>

## Call with Return Values

Some methods return values after execution:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="call-with-return.ts"
import { GlinClient, Keyring } from '@glin-ai/sdk';
import { ContractPromise } from '@polkadot/api-contract';

async function incrementAndGet() {
  const client = await GlinClient.connect('wss://testnet.glin.ai');
  const keyring = new Keyring({ type: 'sr25519' });
  const caller = keyring.addFromUri('//Alice');

  const contract = new ContractPromise(
    client.api,
    metadata,
    contractAddress
  );

  // Call increment method
  const gasLimit = client.api.registry.createType('WeightV2', {
    refTime: 1_000_000_000,
    proofSize: 500_000,
  });

  const tx = contract.tx.increment({ gasLimit, storageDepositLimit: null });

  // Execute transaction
  await new Promise((resolve, reject) => {
    tx.signAndSend(caller, (result) => {
      if (result.status.isFinalized) {
        console.log('Transaction finalized');
        resolve(result);
      }
      if (result.isError) {
        reject(new Error('Transaction failed'));
      }
    });
  });

  // Query the new value
  const { output } = await contract.query.get(caller.address, {
    gasLimit: -1,
  });

  console.log('New value:', output?.toHuman());
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/increment.rs"
use glin_client::create_client;
use glin_contracts::{call_contract, query_contract};
use subxt::tx::PairSigner;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;
    let caller = glin_client::get_dev_account("alice")?;
    let signer = PairSigner::new(caller);

    let contract_address = "5GrwvaEF...";

    // Call increment method
    println!("📤 Incrementing counter...");

    call_contract(
        &client,
        &signer,
        contract_address,
        "increment",
        vec![],
        1_000_000_000,
        None,
    ).await?;

    // Query the new value
    let result = query_contract(
        &client,
        contract_address,
        "get",
        vec![],
    ).await?;

    println!("New value: {:?}", result);

    Ok(())
}
```

</TabItem>
</Tabs>

## Call with Multiple Arguments

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
// ERC20 transfer example
const tx = contract.tx.transfer(
  { gasLimit, storageDepositLimit: null },
  recipientAddress,      // arg 1: to
  1000n * 10n ** 18n    // arg 2: amount (1000 tokens)
);

await tx.signAndSend(caller);
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// ERC20 transfer example
call_contract(
    &client,
    &signer,
    contract_address,
    "transfer",
    vec![
        recipient_address.into(),
        (1000u128 * 10u128.pow(18)).into(),
    ],
    2_000_000_000,
    None,
).await?;
```

</TabItem>
</Tabs>

## Gas Estimation

Always estimate gas before calling contracts:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="estimate-gas.ts"
async function estimateGas() {
  const contract = new ContractPromise(client.api, metadata, contractAddress);

  // Dry run to estimate gas
  const { gasRequired, result } = await contract.query.setMessage(
    caller.address,
    { gasLimit: -1 }, // -1 = estimate
    'New message'
  );

  if (result.isOk) {
    console.log('Gas required:', gasRequired.toHuman());

    // Add 10% buffer
    const gasLimit = client.api.registry.createType('WeightV2', {
      refTime: gasRequired.refTime.muln(1.1),
      proofSize: gasRequired.proofSize.muln(1.1),
    });

    // Use estimated gas for actual call
    const tx = contract.tx.setMessage({ gasLimit, storageDepositLimit: null }, 'New message');
    await tx.signAndSend(caller);
  }
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/estimate_gas.rs"
use glin_contracts::estimate_call_gas;

async fn estimate_and_call() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;

    // Estimate gas
    let gas_estimate = estimate_call_gas(
        &client,
        caller_address,
        contract_address,
        "set_message",
        vec!["New message".into()],
    ).await?;

    println!("Estimated gas: {} ref_time, {} proof_size",
        gas_estimate.ref_time,
        gas_estimate.proof_size
    );

    // Add 10% buffer
    let gas_limit = (gas_estimate.ref_time as f64 * 1.1) as u64;

    // Call with estimated gas
    call_contract(
        &client,
        &signer,
        contract_address,
        "set_message",
        vec!["New message".into()],
        gas_limit,
        None,
    ).await?;

    Ok(())
}
```

</TabItem>
</Tabs>

## Handle Transaction Results

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="handle-results.ts"
async function callWithHandling() {
  const tx = contract.tx.transfer(
    { gasLimit, storageDepositLimit: null },
    recipient,
    amount
  );

  await new Promise((resolve, reject) => {
    tx.signAndSend(caller, ({ status, events, dispatchError }) => {
      // Transaction is in a block
      if (status.isInBlock) {
        console.log(`In block: ${status.asInBlock.toHex()}`);
      }

      // Transaction is finalized
      if (status.isFinalized) {
        console.log(`Finalized: ${status.asFinalized.toHex()}`);

        // Check for errors
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = client.api.registry.findMetaError(
              dispatchError.asModule
            );
            const { docs, name, section } = decoded;

            reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        } else {
          // Success - process events
          events.forEach(({ event }) => {
            if (client.api.events.system.ExtrinsicSuccess.is(event)) {
              console.log('✅ Transaction succeeded');
            }

            if (client.api.events.contracts.ContractEmitted.is(event)) {
              console.log('📊 Contract event:', event.data);
            }
          });

          resolve(status.asFinalized);
        }
      }
    });
  });
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/handle_results.rs"
use glin_contracts::{call_contract, CallResult};

async fn call_with_handling() -> Result<()> {
    let result = call_contract(
        &client,
        &signer,
        contract_address,
        "transfer",
        vec![recipient.into(), amount.into()],
        2_000_000_000,
        None,
    ).await?;

    match result {
        CallResult::Success { tx_hash, events } => {
            println!("✅ Transaction successful");
            println!("Hash: {:?}", tx_hash);

            // Process events
            for event in events {
                if event.is_contract_emitted() {
                    println!("📊 Contract event: {:?}", event.data);
                }
            }
        }
        CallResult::Failed { error } => {
            eprintln!("❌ Transaction failed: {}", error);
        }
    }

    Ok(())
}
```

</TabItem>
</Tabs>

## Batch Calls

Execute multiple contract calls in a single transaction:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="batch-calls.ts"
import { GlinClient } from '@glin-ai/sdk';

async function batchCalls() {
  const client = await GlinClient.connect('wss://testnet.glin.ai');

  // Prepare multiple calls
  const call1 = contract.tx.setMessage(
    { gasLimit, storageDepositLimit: null },
    'First message'
  );
  const call2 = contract.tx.setMessage(
    { gasLimit, storageDepositLimit: null },
    'Second message'
  );

  // Batch them
  const batchTx = client.api.tx.utility.batch([
    call1.toJSON(),
    call2.toJSON()
  ]);

  const hash = await batchTx.signAndSend(caller);
  console.log('Batch transaction hash:', hash.toHex());
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/batch_calls.rs"
use subxt::dynamic::tx;

async fn batch_calls() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;

    // Create batch transaction
    let batch_tx = tx(
        "Utility",
        "batch",
        vec![
            // Call 1
            tx("Contracts", "call", vec![
                contract_address.into(),
                0u128.into(),
                gas_limit.into(),
                None::<()>.into(),
                encode_call("set_message", vec!["First".into()]),
            ]),
            // Call 2
            tx("Contracts", "call", vec![
                contract_address.into(),
                0u128.into(),
                gas_limit.into(),
                None::<()>.into(),
                encode_call("set_message", vec!["Second".into()]),
            ]),
        ],
    );

    let hash = client
        .tx()
        .sign_and_submit_default(&batch_tx, &signer)
        .await?;

    println!("Batch transaction: {:?}", hash);

    Ok(())
}
```

</TabItem>
</Tabs>

## Error Handling

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
try {
  await tx.signAndSend(caller);
} catch (error) {
  if (error.message.includes('Module')) {
    console.error('❌ Contract reverted:', error.message);
  } else if (error.message.includes('OutOfGas')) {
    console.error('❌ Out of gas - increase gas limit');
  } else if (error.message.includes('InsufficientBalance')) {
    console.error('❌ Insufficient balance');
  } else {
    console.error('❌ Transaction failed:', error.message);
  }
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use glin_contracts::ContractError;

match call_contract(/* ... */).await {
    Ok(result) => {
        println!("✅ Call successful: {:?}", result);
    }
    Err(e) => {
        match e.downcast_ref::<ContractError>() {
            Some(ContractError::ContractReverted(msg)) => {
                eprintln!("❌ Contract reverted: {}", msg);
            }
            Some(ContractError::OutOfGas) => {
                eprintln!("❌ Out of gas - increase gas limit");
            }
            Some(ContractError::InsufficientBalance) => {
                eprintln!("❌ Insufficient balance");
            }
            _ => {
                eprintln!("❌ Transaction failed: {}", e);
            }
        }
    }
}
```

</TabItem>
</Tabs>

## Common Patterns

### ERC20 Transfer

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
async function transferTokens(to: string, amount: bigint) {
  const contract = new ContractPromise(client.api, erc20Metadata, tokenAddress);

  const gasLimit = client.api.registry.createType('WeightV2', {
    refTime: 2_000_000_000,
    proofSize: 500_000,
  });

  const tx = contract.tx.transfer(
    { gasLimit, storageDepositLimit: null },
    to,
    amount
  );

  await tx.signAndSend(caller);
  console.log(`Transferred ${amount} tokens to ${to}`);
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
async fn transfer_tokens(to: &str, amount: u128) -> Result<()> {
    call_contract(
        &client,
        &signer,
        token_address,
        "transfer",
        vec![to.into(), amount.into()],
        2_000_000_000,
        None,
    ).await?;

    println!("Transferred {} tokens to {}", amount, to);
    Ok(())
}
```

</TabItem>
</Tabs>

### Approve & Transfer From

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
// 1. Approve spender
const approveTx = contract.tx.approve(
  { gasLimit, storageDepositLimit: null },
  spenderAddress,
  allowance
);
await approveTx.signAndSend(owner);

// 2. Spender transfers on behalf of owner
const transferFromTx = contract.tx.transferFrom(
  { gasLimit, storageDepositLimit: null },
  ownerAddress,
  recipientAddress,
  amount
);
await transferFromTx.signAndSend(spender);
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// 1. Approve spender
call_contract(
    &client,
    &owner_signer,
    token_address,
    "approve",
    vec![spender_address.into(), allowance.into()],
    2_000_000_000,
    None,
).await?;

// 2. Spender transfers on behalf of owner
call_contract(
    &client,
    &spender_signer,
    token_address,
    "transfer_from",
    vec![
        owner_address.into(),
        recipient_address.into(),
        amount.into(),
    ],
    2_000_000_000,
    None,
).await?;
```

</TabItem>
</Tabs>

## Best Practices

### 1. Always Estimate Gas

```typescript
// ❌ Bad - hardcoded gas
const gasLimit = 1_000_000_000;

// ✅ Good - estimated gas with buffer
const { gasRequired } = await contract.query.method(/* ... */);
const gasLimit = gasRequired.muln(1.1);
```

### 2. Handle Errors Gracefully

```typescript
// ❌ Bad - no error handling
await tx.signAndSend(caller);

// ✅ Good - comprehensive error handling
try {
  await tx.signAndSend(caller);
} catch (error) {
  // Handle specific error types
}
```

### 3. Wait for Finalization

```typescript
// ❌ Bad - don't wait
const hash = await tx.signAndSend(caller);

// ✅ Good - wait for finalization
await new Promise((resolve) => {
  tx.signAndSend(caller, ({ status }) => {
    if (status.isFinalized) resolve();
  });
});
```

### 4. Check Contract State After Calls

```typescript
// Call method
await contract.tx.increment({ gasLimit, storageDepositLimit: null }).signAndSend(caller);

// Verify state changed
const { output } = await contract.query.get(caller.address, { gasLimit: -1 });
console.log('New value:', output?.toNumber());
```

## Troubleshooting

### Transaction Reverted

**Symptom**: `Module { index: 8, error: 3 }`

**Common causes**:
- Contract logic rejected the call (e.g., insufficient balance in ERC20)
- Invalid arguments
- Precondition not met

**Solution**: Check contract logic and ensure all preconditions are met

### Out of Gas

**Symptom**: `OutOfGas` error

**Solution**: Increase gas limit or optimize contract code

### Insufficient Balance

**Symptom**: `InsufficientBalance` error

**Solution**: Fund the caller account with more GLIN

## Next Steps

- 🔍 [Query Contract State](/docs/sdk/contracts/querying) - Read contract data
- 📊 [Listen to Events](/docs/sdk/contracts/events) - Monitor contract events
- 💡 [Full Example](/docs/sdk/examples/deploy-contract) - Complete contract interaction

---

Need help? [Join our Discord](https://discord.gg/glin-ai) or check the [ink! documentation](https://use.ink).
