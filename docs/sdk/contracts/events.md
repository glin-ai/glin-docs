# Contract Events

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Learn how to listen to and handle events emitted by ink! smart contracts.

## Overview

Contract events allow contracts to communicate with the outside world:

- 📢 **Emit** events when important state changes occur
- 👂 **Listen** to events in real-time
- 📊 **Index** events for historical queries
- 🔔 **Trigger** actions based on events

## Prerequisites

- ✅ Contract deployed to GLIN Network
- ✅ Contract emits events (defined in ink! contract)
- ✅ Connection to GLIN Network

## Event Types

Contracts can emit different types of events:

```rust
// In your ink! contract
#[ink(event)]
pub struct Transfer {
    #[ink(topic)]
    from: Option<AccountId>,
    #[ink(topic)]
    to: Option<AccountId>,
    value: Balance,
}

#[ink(event)]
pub struct Approval {
    #[ink(topic)]
    owner: AccountId,
    #[ink(topic)]
    spender: AccountId,
    value: Balance,
}
```

## Listen to Events

### Real-Time Event Listening

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="listen-events.ts"
import { GlinClient } from '@glin-ai/sdk';
import { ContractPromise } from '@polkadot/api-contract';

async function listenToEvents() {
  const client = await GlinClient.connect('wss://testnet.glin.ai');

  // Load contract
  const contract = new ContractPromise(
    client.api,
    metadata,
    contractAddress
  );

  console.log('👂 Listening for contract events...');

  // Subscribe to all events from this contract
  const unsub = await client.api.query.system.events((events) => {
    events.forEach((record) => {
      const { event } = record;

      // Filter for contract events
      if (client.api.events.contracts.ContractEmitted.is(event)) {
        const [contractAddr, data] = event.data;

        // Check if event is from our contract
        if (contractAddr.toString() === contractAddress) {
          // Decode event data
          const decodedEvent = contract.abi.decodeEvent(data);

          console.log('📊 Contract event:', decodedEvent);
          console.log('  Event name:', decodedEvent.event.identifier);
          console.log('  Data:', decodedEvent.args);
        }
      }
    });
  });

  // Keep listening...
  // To stop: unsub();
}

listenToEvents().catch(console.error);
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="src/listen_events.rs"
use glin_client::create_client;
use subxt::events::Events;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;

    println!("👂 Listening for contract events...");

    // Subscribe to finalized blocks
    let mut blocks = client.blocks().subscribe_finalized().await?;

    while let Some(block) = blocks.next().await {
        let block = block?;

        // Get events for this block
        let events = block.events().await?;

        // Filter for contract events
        for event in events.iter() {
            let event = event?;

            if let Some(contract_event) = event.as_event::<ContractEmitted>()? {
                let contract_addr = contract_event.contract;
                let data = contract_event.data;

                // Check if event is from our contract
                if contract_addr.to_string() == contract_address {
                    println!("📊 Contract event from block #{}", block.number());
                    println!("  Contract: {}", contract_addr);
                    println!("  Data: {:?}", data);
                }
            }
        }
    }

    Ok(())
}

#[derive(Debug, Clone, subxt::Event)]
#[event(module = "Contracts")]
struct ContractEmitted {
    contract: subxt::utils::AccountId32,
    data: Vec<u8>,
}
```

</TabItem>
</Tabs>

### Listen to Specific Events

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="listen-transfer-events.ts"
async function listenToTransfers() {
  const client = await GlinClient.connect('wss://testnet.glin.ai');
  const contract = new ContractPromise(client.api, metadata, contractAddress);

  const unsub = await client.api.query.system.events((events) => {
    events.forEach((record) => {
      const { event } = record;

      if (client.api.events.contracts.ContractEmitted.is(event)) {
        const [contractAddr, data] = event.data;

        if (contractAddr.toString() === contractAddress) {
          const decodedEvent = contract.abi.decodeEvent(data);

          // Filter for Transfer events only
          if (decodedEvent.event.identifier === 'Transfer') {
            const { from, to, value } = decodedEvent.args;

            console.log('💸 Transfer Event:');
            console.log(`  From: ${from}`);
            console.log(`  To: ${to}`);
            console.log(`  Amount: ${value.toString()}`);
          }
        }
      }
    });
  });

  // Cleanup
  // unsub();
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
struct TransferEvent {
    from: Option<String>,
    to: Option<String>,
    value: u128,
}

async fn listen_to_transfers() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;

    let mut blocks = client.blocks().subscribe_finalized().await?;

    while let Some(block) = blocks.next().await {
        let block = block?;
        let events = block.events().await?;

        for event in events.iter() {
            let event = event?;

            if let Some(contract_event) = event.as_event::<ContractEmitted>()? {
                if contract_event.contract.to_string() == contract_address {
                    // Decode event data
                    if let Ok(transfer) = decode_transfer_event(&contract_event.data) {
                        println!("💸 Transfer Event:");
                        println!("  From: {:?}", transfer.from);
                        println!("  To: {:?}", transfer.to);
                        println!("  Amount: {}", transfer.value);
                    }
                }
            }
        }
    }

    Ok(())
}

fn decode_transfer_event(data: &[u8]) -> Result<TransferEvent> {
    // Decode event data using contract ABI
    // Implementation depends on your contract's event structure
    todo!()
}
```

</TabItem>
</Tabs>

## Event Filtering

### Filter by Topics

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript
// Listen to events involving a specific address
async function listenToUserTransfers(userAddress: string) {
  const contract = new ContractPromise(client.api, metadata, contractAddress);

  const unsub = await client.api.query.system.events((events) => {
    events.forEach((record) => {
      const { event } = record;

      if (client.api.events.contracts.ContractEmitted.is(event)) {
        const [contractAddr, data] = event.data;

        if (contractAddr.toString() === contractAddress) {
          const decodedEvent = contract.abi.decodeEvent(data);

          if (decodedEvent.event.identifier === 'Transfer') {
            const { from, to } = decodedEvent.args;

            // Filter for transfers involving our user
            if (from?.toString() === userAddress || to?.toString() === userAddress) {
              console.log('📬 Transfer involving user:', decodedEvent.args);
            }
          }
        }
      }
    });
  });
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
async fn listen_to_user_transfers(user_address: &str) -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;

    let mut blocks = client.blocks().subscribe_finalized().await?;

    while let Some(block) = blocks.next().await {
        let block = block?;
        let events = block.events().await?;

        for event in events.iter() {
            let event = event?;

            if let Some(contract_event) = event.as_event::<ContractEmitted>()? {
                if contract_event.contract.to_string() == contract_address {
                    if let Ok(transfer) = decode_transfer_event(&contract_event.data) {
                        // Filter for transfers involving our user
                        if transfer.from.as_deref() == Some(user_address)
                            || transfer.to.as_deref() == Some(user_address)
                        {
                            println!("📬 Transfer involving user: {:?}", transfer);
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
```

</TabItem>
</Tabs>

## Historical Events

Query past events from the blockchain:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="query-historical-events.ts"
async function getHistoricalEvents(fromBlock: number, toBlock: number) {
  const client = await GlinClient.connect('wss://testnet.glin.ai');
  const contract = new ContractPromise(client.api, metadata, contractAddress);

  const events = [];

  // Iterate through blocks
  for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
    const blockHash = await client.api.rpc.chain.getBlockHash(blockNum);
    const apiAt = await client.api.at(blockHash);
    const allEvents = await apiAt.query.system.events();

    allEvents.forEach((record) => {
      const { event } = record;

      if (client.api.events.contracts.ContractEmitted.is(event)) {
        const [contractAddr, data] = event.data;

        if (contractAddr.toString() === contractAddress) {
          const decodedEvent = contract.abi.decodeEvent(data);

          events.push({
            block: blockNum,
            event: decodedEvent.event.identifier,
            data: decodedEvent.args,
          });
        }
      }
    });
  }

  return events;
}

// Usage
const events = await getHistoricalEvents(1000, 2000);
console.log('Historical events:', events);
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
async fn get_historical_events(from_block: u32, to_block: u32) -> Result<Vec<ContractEvent>> {
    let client = create_client("wss://testnet.glin.ai").await?;

    let mut all_events = Vec::new();

    for block_num in from_block..=to_block {
        // Get block hash
        let block_hash = client
            .rpc()
            .block_hash(Some(block_num.into()))
            .await?
            .expect("Block should exist");

        // Get block
        let block = client
            .blocks()
            .at(block_hash)
            .await?;

        // Get events
        let events = block.events().await?;

        for event in events.iter() {
            let event = event?;

            if let Some(contract_event) = event.as_event::<ContractEmitted>()? {
                if contract_event.contract.to_string() == contract_address {
                    all_events.push(ContractEvent {
                        block: block_num,
                        data: contract_event.data.clone(),
                    });
                }
            }
        }
    }

    Ok(all_events)
}

#[derive(Debug)]
struct ContractEvent {
    block: u32,
    data: Vec<u8>,
}
```

</TabItem>
</Tabs>

## Event-Driven Actions

Trigger actions based on events:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="event-driven.ts"
async function eventDrivenBot() {
  const client = await GlinClient.connect('wss://testnet.glin.ai');
  const contract = new ContractPromise(client.api, metadata, contractAddress);

  const unsub = await client.api.query.system.events((events) => {
    events.forEach(async (record) => {
      const { event } = record;

      if (client.api.events.contracts.ContractEmitted.is(event)) {
        const [contractAddr, data] = event.data;

        if (contractAddr.toString() === contractAddress) {
          const decodedEvent = contract.abi.decodeEvent(data);

          // React to specific events
          if (decodedEvent.event.identifier === 'LargeTransfer') {
            const { from, to, value } = decodedEvent.args;

            console.log('🚨 Large transfer detected!');
            console.log(`  Amount: ${value.toString()}`);

            // Send notification
            await sendAlert({
              type: 'large_transfer',
              from: from.toString(),
              to: to.toString(),
              amount: value.toString(),
            });
          }

          if (decodedEvent.event.identifier === 'TokenMinted') {
            console.log('🎉 New tokens minted!');
            // Update database, send webhook, etc.
          }
        }
      }
    });
  });
}

async function sendAlert(alert: any) {
  // Send to webhook, database, notification service, etc.
  console.log('Sending alert:', alert);
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
async fn event_driven_bot() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;

    let mut blocks = client.blocks().subscribe_finalized().await?;

    while let Some(block) = blocks.next().await {
        let block = block?;
        let events = block.events().await?;

        for event in events.iter() {
            let event = event?;

            if let Some(contract_event) = event.as_event::<ContractEmitted>()? {
                if contract_event.contract.to_string() == contract_address {
                    // Decode and react to events
                    if let Ok(transfer) = decode_transfer_event(&contract_event.data) {
                        if transfer.value > 1_000_000 {
                            println!("🚨 Large transfer detected!");
                            send_alert(Alert {
                                alert_type: "large_transfer".to_string(),
                                data: serde_json::to_value(&transfer)?,
                            }).await?;
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

#[derive(Serialize)]
struct Alert {
    alert_type: String,
    data: serde_json::Value,
}

async fn send_alert(alert: Alert) -> Result<()> {
    // Send to webhook, database, notification service, etc.
    println!("Sending alert: {:?}", alert);
    Ok(())
}
```

</TabItem>
</Tabs>

## Event Indexing

Build an indexer to store and query events:

<Tabs groupId="language">
<TabItem value="ts" label="TypeScript">

```typescript title="indexer.ts"
import { GlinClient } from '@glin-ai/sdk';
import Database from 'better-sqlite3';

async function indexEvents() {
  const client = await GlinClient.connect('wss://testnet.glin.ai');
  const contract = new ContractPromise(client.api, metadata, contractAddress);

  // Setup database
  const db = new Database('events.db');
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_number INTEGER,
      event_name TEXT,
      from_address TEXT,
      to_address TEXT,
      value TEXT,
      timestamp INTEGER
    )
  `);

  const insert = db.prepare(`
    INSERT INTO events (block_number, event_name, from_address, to_address, value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Subscribe to events
  let currentBlock = await client.api.rpc.chain.getHeader();

  const unsub = await client.api.query.system.events((events) => {
    events.forEach((record) => {
      const { event } = record;

      if (client.api.events.contracts.ContractEmitted.is(event)) {
        const [contractAddr, data] = event.data;

        if (contractAddr.toString() === contractAddress) {
          const decodedEvent = contract.abi.decodeEvent(data);

          if (decodedEvent.event.identifier === 'Transfer') {
            const { from, to, value } = decodedEvent.args;

            insert.run(
              currentBlock.number.toNumber(),
              'Transfer',
              from?.toString() || null,
              to?.toString() || null,
              value.toString(),
              Date.now()
            );

            console.log('📝 Indexed Transfer event');
          }
        }
      }
    });
  });
}

// Query indexed events
function queryEvents(db: Database, userAddress: string) {
  const stmt = db.prepare(`
    SELECT * FROM events
    WHERE from_address = ? OR to_address = ?
    ORDER BY block_number DESC
    LIMIT 100
  `);

  return stmt.all(userAddress, userAddress);
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use sqlx::SqlitePool;

async fn index_events() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;

    // Setup database
    let pool = SqlitePool::connect("sqlite:events.db").await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            block_number INTEGER,
            event_name TEXT,
            from_address TEXT,
            to_address TEXT,
            value TEXT,
            timestamp INTEGER
        )
        "#
    )
    .execute(&pool)
    .await?;

    // Subscribe to events
    let mut blocks = client.blocks().subscribe_finalized().await?;

    while let Some(block) = blocks.next().await {
        let block = block?;
        let block_number = block.number();
        let events = block.events().await?;

        for event in events.iter() {
            let event = event?;

            if let Some(contract_event) = event.as_event::<ContractEmitted>()? {
                if contract_event.contract.to_string() == contract_address {
                    if let Ok(transfer) = decode_transfer_event(&contract_event.data) {
                        sqlx::query(
                            "INSERT INTO events (block_number, event_name, from_address, to_address, value, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
                        )
                        .bind(block_number as i64)
                        .bind("Transfer")
                        .bind(transfer.from)
                        .bind(transfer.to)
                        .bind(transfer.value.to_string())
                        .bind(chrono::Utc::now().timestamp())
                        .execute(&pool)
                        .await?;

                        println!("📝 Indexed Transfer event at block {}", block_number);
                    }
                }
            }
        }
    }

    Ok(())
}

// Query indexed events
async fn query_events(pool: &SqlitePool, user_address: &str) -> Result<Vec<Event>> {
    let events = sqlx::query_as::<_, Event>(
        "SELECT * FROM events WHERE from_address = ? OR to_address = ? ORDER BY block_number DESC LIMIT 100"
    )
    .bind(user_address)
    .bind(user_address)
    .fetch_all(pool)
    .await?;

    Ok(events)
}

#[derive(sqlx::FromRow)]
struct Event {
    id: i64,
    block_number: i64,
    event_name: String,
    from_address: Option<String>,
    to_address: Option<String>,
    value: String,
    timestamp: i64,
}
```

</TabItem>
</Tabs>

## Best Practices

### 1. Handle Connection Drops

```typescript
async function resilientEventListener() {
  async function subscribe() {
    try {
      const client = await GlinClient.connect('wss://testnet.glin.ai');

      const unsub = await client.api.query.system.events((events) => {
        // Process events...
      });

      // Handle disconnect
      client.api.on('disconnected', () => {
        console.log('⚠️ Disconnected, reconnecting...');
        unsub();
        setTimeout(subscribe, 5000); // Reconnect after 5s
      });
    } catch (error) {
      console.error('Connection error:', error);
      setTimeout(subscribe, 5000); // Retry after 5s
    }
  }

  subscribe();
}
```

### 2. Batch Event Processing

```typescript
// Process events in batches for efficiency
const eventBatch = [];
const BATCH_SIZE = 100;

const unsub = await client.api.query.system.events((events) => {
  events.forEach((record) => {
    // ... decode event ...
    eventBatch.push(decodedEvent);

    if (eventBatch.length >= BATCH_SIZE) {
      processBatch(eventBatch.splice(0, BATCH_SIZE));
    }
  });
});

async function processBatch(events: any[]) {
  // Bulk insert to database, send webhook, etc.
  await db.insert(events);
}
```

### 3. Filter Early

```typescript
// ❌ Bad - decode all events first
const unsub = await client.api.query.system.events((events) => {
  events.forEach((record) => {
    const decodedEvent = contract.abi.decodeEvent(data);
    if (decodedEvent.event.identifier === 'Transfer') {
      // Process transfer
    }
  });
});

// ✅ Good - filter before decoding
const unsub = await client.api.query.system.events((events) => {
  events.forEach((record) => {
    const { event } = record;

    if (client.api.events.contracts.ContractEmitted.is(event)) {
      const [contractAddr] = event.data;

      if (contractAddr.toString() === contractAddress) {
        const decodedEvent = contract.abi.decodeEvent(data);
        // Now process
      }
    }
  });
});
```

## Next Steps

- 📦 [Deploy Contracts](/sdk/contracts/deploying) - Deploy your first contract
- 📞 [Call Contract Methods](/sdk/contracts/calling) - Interact with contracts
- 💡 [Build an Indexer](/sdk/examples/build-indexer) - Complete indexer example

---

Need help? [Join our Discord](https://discord.gg/glin-ai) or check the [ink! documentation](https://use.ink).
