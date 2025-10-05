# Querying Contract State

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Learn how to query (read) state from deployed ink! smart contracts without paying gas fees.

## Overview

Contract queries are **read-only** operations that:
- ✅ Don't modify contract state
- ✅ Don't require gas fees
- ✅ Return results immediately
- ✅ Don't create transactions

Use queries to read contract data before making state-changing calls.

## Prerequisites

- ✅ Contract deployed to GLIN Network
- ✅ Contract address and metadata
- ✅ Connection to GLIN Network

## Basic Query

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="query-contract.ts"
import { GlinClient } from '@glin-ai/sdk';
import { ContractPromise } from '@polkadot/api-contract';
import fs from 'fs';

async function queryContract() {
  // 1. Connect to network
  const client = await GlinClient.connect('wss://testnet.glin.ai');

  // 2. Load contract
  const contractAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const metadata = JSON.parse(
    fs.readFileSync('./target/ink/metadata.json', 'utf8')
  );

  const contract = new ContractPromise(client.api, metadata, contractAddress);

  // 3. Query contract state
  const { output, result } = await contract.query.getMessage(
    contractAddress, // caller address (any address works for queries)
    { gasLimit: -1 } // -1 = unlimited for queries
  );

  // 4. Process result
  if (result.isOk && output) {
    console.log('Message:', output.toHuman());
  } else {
    console.error('Query failed:', result.asErr);
  }
}

queryContract().catch(console.error);
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/query_contract.rs"
use glin_client::create_client;
use glin_contracts::query_contract;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // 1. Connect to network
    let client = create_client("wss://testnet.glin.ai").await?;

    // 2. Contract details
    let contract_address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    // 3. Query contract state
    let result = query_contract(
        &client,
        contract_address,
        "get_message",
        vec![], // No arguments
    ).await?;

    // 4. Process result
    if let Some(message) = result {
        println!("Message: {:?}", message);
    } else {
        println!("Query returned no data");
    }

    Ok(())
}
```

</TabItem>
</Tabs>

## Query with Arguments

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="query-with-args.ts"
// Query ERC20 balance
const { output } = await contract.query.balanceOf(
  queryAddress,
  { gasLimit: -1 },
  accountAddress // argument: which account's balance?
);

const balance = output?.toHuman();
console.log(`Balance: ${balance}`);

// Query ERC20 allowance
const { output: allowanceOutput } = await contract.query.allowance(
  queryAddress,
  { gasLimit: -1 },
  ownerAddress,   // arg 1: owner
  spenderAddress  // arg 2: spender
);

const allowance = allowanceOutput?.toHuman();
console.log(`Allowance: ${allowance}`);
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// Query ERC20 balance
let balance = query_contract(
    &client,
    contract_address,
    "balance_of",
    vec![account_address.into()],
).await?;

println!("Balance: {:?}", balance);

// Query ERC20 allowance
let allowance = query_contract(
    &client,
    contract_address,
    "allowance",
    vec![
        owner_address.into(),
        spender_address.into(),
    ],
).await?;

println!("Allowance: {:?}", allowance);
```

</TabItem>
</Tabs>

## Multiple Queries

Query multiple values efficiently:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="batch-queries.ts"
async function batchQueries() {
  const addresses = [
    '5GrwvaEF...',
    '5FHneW4...',
    '5DAAnrj...'
  ];

  // Run queries in parallel
  const balances = await Promise.all(
    addresses.map(async (address) => {
      const { output } = await contract.query.balanceOf(
        address,
        { gasLimit: -1 },
        address
      );
      return {
        address,
        balance: output?.toString() || '0'
      };
    })
  );

  balances.forEach(({ address, balance }) => {
    console.log(`${address}: ${balance}`);
  });
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use futures::future::join_all;

async fn batch_queries() -> Result<()> {
    let addresses = vec![
        "5GrwvaEF...",
        "5FHneW4...",
        "5DAAnrj...",
    ];

    // Run queries in parallel
    let queries: Vec<_> = addresses.iter().map(|addr| {
        query_contract(
            &client,
            contract_address,
            "balance_of",
            vec![addr.to_string().into()],
        )
    }).collect();

    let results = join_all(queries).await;

    for (addr, result) in addresses.iter().zip(results) {
        if let Ok(Some(balance)) = result {
            println!("{}: {:?}", addr, balance);
        }
    }

    Ok(())
}
```

</TabItem>
</Tabs>

## Decode Query Results

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
// Query returns a complex type
const { output } = await contract.query.getUserInfo(
  queryAddress,
  { gasLimit: -1 },
  userId
);

// Decode to JSON
const userInfo = output?.toJSON();
console.log('User info:', userInfo);

// Decode to human-readable format
const userInfoHuman = output?.toHuman();
console.log('User info (human):', userInfoHuman);

// Access specific fields
if (output) {
  const decoded = output.toJSON();
  console.log('Username:', decoded.username);
  console.log('Score:', decoded.score);
  console.log('Active:', decoded.isActive);
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
struct UserInfo {
    username: String,
    score: u64,
    is_active: bool,
}

async fn decode_query_result() -> Result<()> {
    let result = query_contract(
        &client,
        contract_address,
        "get_user_info",
        vec![user_id.into()],
    ).await?;

    if let Some(data) = result {
        // Decode to struct
        let user_info: UserInfo = serde_json::from_value(data)?;

        println!("Username: {}", user_info.username);
        println!("Score: {}", user_info.score);
        println!("Active: {}", user_info.is_active);
    }

    Ok(())
}
```

</TabItem>
</Tabs>

## Query Before Transaction

Always query before making state changes:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
async function safeTransfer(to: string, amount: bigint) {
  // 1. Query current balance
  const { output } = await contract.query.balanceOf(
    caller.address,
    { gasLimit: -1 },
    caller.address
  );

  const balance = BigInt(output?.toString() || '0');

  // 2. Check if sufficient balance
  if (balance < amount) {
    throw new Error(
      `Insufficient balance. Have: ${balance}, Need: ${amount}`
    );
  }

  // 3. Query recipient's current balance
  const { output: recipientOutput } = await contract.query.balanceOf(
    to,
    { gasLimit: -1 },
    to
  );

  const recipientBefore = BigInt(recipientOutput?.toString() || '0');

  // 4. Execute transfer
  const tx = contract.tx.transfer(
    { gasLimit, storageDepositLimit: null },
    to,
    amount
  );

  await tx.signAndSend(caller);

  // 5. Verify transfer succeeded
  const { output: newBalance } = await contract.query.balanceOf(
    to,
    { gasLimit: -1 },
    to
  );

  const recipientAfter = BigInt(newBalance?.toString() || '0');

  console.log(`✅ Transfer successful!`);
  console.log(`Recipient balance: ${recipientBefore} → ${recipientAfter}`);
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
async fn safe_transfer(to: &str, amount: u128) -> Result<()> {
    // 1. Query current balance
    let balance_result = query_contract(
        &client,
        contract_address,
        "balance_of",
        vec![caller_address.into()],
    ).await?;

    let balance: u128 = balance_result
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u128;

    // 2. Check if sufficient balance
    if balance < amount {
        anyhow::bail!(
            "Insufficient balance. Have: {}, Need: {}",
            balance,
            amount
        );
    }

    // 3. Query recipient's current balance
    let recipient_before = query_contract(
        &client,
        contract_address,
        "balance_of",
        vec![to.into()],
    ).await?
    .and_then(|v| v.as_u64())
    .unwrap_or(0) as u128;

    // 4. Execute transfer
    call_contract(
        &client,
        &signer,
        contract_address,
        "transfer",
        vec![to.into(), amount.into()],
        2_000_000_000,
        None,
    ).await?;

    // 5. Verify transfer succeeded
    let recipient_after = query_contract(
        &client,
        contract_address,
        "balance_of",
        vec![to.into()],
    ).await?
    .and_then(|v| v.as_u64())
    .unwrap_or(0) as u128;

    println!("✅ Transfer successful!");
    println!("Recipient balance: {} → {}", recipient_before, recipient_after);

    Ok(())
}
```

</TabItem>
</Tabs>

## Real-Time Queries

Query contract state at specific block heights:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
// Query at latest block (default)
const { output: latest } = await contract.query.getValue(
  address,
  { gasLimit: -1 }
);

// Query at specific block
const blockHash = await client.api.rpc.chain.getBlockHash(12345);
const { output: historical } = await contract.query.getValue(
  address,
  { gasLimit: -1, at: blockHash }
);

console.log('Current value:', latest?.toHuman());
console.log('Value at block 12345:', historical?.toHuman());
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// Query at latest block (default)
let latest = query_contract(
    &client,
    contract_address,
    "get_value",
    vec![],
).await?;

// Query at specific block
let block_hash = client
    .rpc()
    .block_hash(Some(12345))
    .await?;

let historical = query_contract_at_block(
    &client,
    contract_address,
    "get_value",
    vec![],
    block_hash,
).await?;

println!("Current value: {:?}", latest);
println!("Value at block 12345: {:?}", historical);
```

</TabItem>
</Tabs>

## Common Query Patterns

### ERC20 Queries

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
// Get token info
const { output: name } = await contract.query.tokenName(address, { gasLimit: -1 });
const { output: symbol } = await contract.query.tokenSymbol(address, { gasLimit: -1 });
const { output: decimals } = await contract.query.tokenDecimals(address, { gasLimit: -1 });
const { output: totalSupply } = await contract.query.totalSupply(address, { gasLimit: -1 });

console.log(`Token: ${name?.toHuman()} (${symbol?.toHuman()})`);
console.log(`Decimals: ${decimals?.toNumber()}`);
console.log(`Total Supply: ${totalSupply?.toString()}`);

// Get user balance
const { output: balance } = await contract.query.balanceOf(
  userAddress,
  { gasLimit: -1 },
  userAddress
);

console.log(`Your balance: ${balance?.toString()}`);

// Check allowance
const { output: allowance } = await contract.query.allowance(
  ownerAddress,
  { gasLimit: -1 },
  ownerAddress,
  spenderAddress
);

console.log(`Allowance: ${allowance?.toString()}`);
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// Get token info
let name = query_contract(&client, contract_address, "token_name", vec![]).await?;
let symbol = query_contract(&client, contract_address, "token_symbol", vec![]).await?;
let decimals = query_contract(&client, contract_address, "token_decimals", vec![]).await?;
let total_supply = query_contract(&client, contract_address, "total_supply", vec![]).await?;

println!("Token: {:?} ({:?})", name, symbol);
println!("Decimals: {:?}", decimals);
println!("Total Supply: {:?}", total_supply);

// Get user balance
let balance = query_contract(
    &client,
    contract_address,
    "balance_of",
    vec![user_address.into()],
).await?;

println!("Your balance: {:?}", balance);

// Check allowance
let allowance = query_contract(
    &client,
    contract_address,
    "allowance",
    vec![owner_address.into(), spender_address.into()],
).await?;

println!("Allowance: {:?}", allowance);
```

</TabItem>
</Tabs>

### Check Contract Ownership

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
const { output } = await contract.query.owner(
  queryAddress,
  { gasLimit: -1 }
);

const owner = output?.toString();
const isOwner = owner === myAddress;

console.log(`Contract owner: ${owner}`);
console.log(`Am I owner? ${isOwner}`);
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
let owner = query_contract(
    &client,
    contract_address,
    "owner",
    vec![],
).await?;

let is_owner = owner.as_ref()
    .and_then(|o| o.as_str())
    .map(|o| o == my_address)
    .unwrap_or(false);

println!("Contract owner: {:?}", owner);
println!("Am I owner? {}", is_owner);
```

</TabItem>
</Tabs>

## Error Handling

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
try {
  const { output, result } = await contract.query.getValue(
    address,
    { gasLimit: -1 }
  );

  if (result.isErr) {
    const error = result.asErr;

    if (error.isModule) {
      console.error('Contract error:', error.asModule.toHuman());
    } else {
      console.error('Query error:', error.toString());
    }

    return null;
  }

  return output?.toHuman();
} catch (error) {
  console.error('Query failed:', error.message);
  return null;
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
match query_contract(&client, contract_address, "get_value", vec![]).await {
    Ok(Some(value)) => {
        println!("Value: {:?}", value);
    }
    Ok(None) => {
        println!("Query returned no data");
    }
    Err(e) => {
        eprintln!("Query failed: {}", e);
    }
}
```

</TabItem>
</Tabs>

## Best Practices

### 1. Use Queries for Read Operations

```typescript
// ❌ Bad - using transaction to read data (costs gas!)
const tx = contract.tx.getValue({ gasLimit, storageDepositLimit: null });
await tx.signAndSend(caller);

// ✅ Good - using query (free!)
const { output } = await contract.query.getValue(address, { gasLimit: -1 });
```

### 2. Always Check Query Results

```typescript
// ❌ Bad - assuming query succeeds
const value = output.toNumber();

// ✅ Good - checking result first
if (result.isOk && output) {
  const value = output.toNumber();
} else {
  console.error('Query failed');
}
```

### 3. Batch Independent Queries

```typescript
// ❌ Bad - sequential queries
const balance1 = await contract.query.balanceOf(/* ... */);
const balance2 = await contract.query.balanceOf(/* ... */);
const balance3 = await contract.query.balanceOf(/* ... */);

// ✅ Good - parallel queries
const [balance1, balance2, balance3] = await Promise.all([
  contract.query.balanceOf(/* ... */),
  contract.query.balanceOf(/* ... */),
  contract.query.balanceOf(/* ... */),
]);
```

### 4. Cache Query Results When Appropriate

```typescript
// Cache contract metadata (changes rarely)
const metadataCache = new Map();

async function getTokenInfo(contractAddress: string) {
  if (metadataCache.has(contractAddress)) {
    return metadataCache.get(contractAddress);
  }

  const info = {
    name: await contract.query.tokenName(/* ... */),
    symbol: await contract.query.tokenSymbol(/* ... */),
    decimals: await contract.query.tokenDecimals(/* ... */),
  };

  metadataCache.set(contractAddress, info);
  return info;
}
```

## Troubleshooting

### Query Returns Unexpected Data

**Issue**: Query returns `null` or wrong type

**Solutions**:
1. Verify contract address is correct
2. Check method name matches contract ABI
3. Ensure arguments match expected types
4. Verify contract is deployed and initialized

### Query Fails Silently

**Issue**: No error but no data returned

**Solutions**:
1. Check `result.isErr` before using `output`
2. Verify contract method is public (not private)
3. Ensure RPC connection is stable

## Next Steps

- 📞 [Call Contract Methods](/sdk/contracts/calling) - Modify contract state
- 📊 [Listen to Events](/sdk/contracts/events) - Monitor contract events
- 💡 [Full Example](/sdk/examples/deploy-contract) - Complete contract interaction

---

Need help? [Join our Discord](https://discord.gg/glin-ai) or check the [ink! documentation](https://use.ink).
