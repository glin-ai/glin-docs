# Example: Build Blockchain Indexer

Complete working example of a production-ready blockchain indexer that processes events and stores them in a database.

## What You'll Build

A real-time blockchain indexer that:

- 📡 **Monitors blockchain** - Subscribes to new blocks and events
- 💾 **Stores data** - Persists events to PostgreSQL/SQLite
- 🔍 **Provides queries** - Fast lookups via indexed data
- 🔄 **Handles reorgs** - Manages chain reorganizations
- 📊 **Tracks progress** - Maintains sync state

## Prerequisites

- Node.js 18+ (for TypeScript version)
- Rust 1.70+ (for Rust version)
- PostgreSQL or SQLite
- GLIN Network access

## Architecture

```
Blockchain → Indexer → Database → Query API
    ↓          ↓          ↓          ↓
  Blocks   Processing  Storage   Clients
```

## Project Setup

### TypeScript Version

```bash
mkdir glin-indexer
cd glin-indexer
npm init -y
npm install @glin-ai/sdk @polkadot/api
npm install pg prisma @prisma/client
npm install -D @types/node @types/pg typescript tsx
```

### Rust Version

```bash
cargo new glin-indexer
cd glin-indexer
cargo add glin-client tokio sqlx --features sqlx/postgres,sqlx/runtime-tokio-rustls
cargo add serde serde_json anyhow tracing tracing-subscriber
```

## Database Schema

### Prisma Schema (TypeScript)

```prisma title="prisma/schema.prisma"
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Block {
  id          Int      @id @default(autoincrement())
  number      BigInt   @unique
  hash        String   @unique
  parentHash  String
  timestamp   DateTime
  createdAt   DateTime @default(now())

  events      Event[]
  transfers   Transfer[]

  @@index([number])
  @@index([timestamp])
}

model Event {
  id          Int      @id @default(autoincrement())
  blockId     Int
  block       Block    @relation(fields: [blockId], references: [id], onDelete: Cascade)

  blockNumber BigInt
  eventIndex  Int
  section     String
  method      String
  data        Json

  createdAt   DateTime @default(now())

  @@unique([blockNumber, eventIndex])
  @@index([section, method])
  @@index([blockNumber])
}

model Transfer {
  id          Int      @id @default(autoincrement())
  blockId     Int
  block       Block    @relation(fields: [blockId], references: [id], onDelete: Cascade)

  blockNumber BigInt
  from        String
  to          String
  amount      String

  createdAt   DateTime @default(now())

  @@index([from])
  @@index([to])
  @@index([blockNumber])
}

model SyncState {
  id              Int      @id @default(autoincrement())
  lastBlock       BigInt
  lastBlockHash   String
  updatedAt       DateTime @updatedAt
}
```

### SQL Schema (Rust)

```sql title="migrations/001_create_tables.sql"
CREATE TABLE IF NOT EXISTS blocks (
    id SERIAL PRIMARY KEY,
    number BIGINT UNIQUE NOT NULL,
    hash TEXT UNIQUE NOT NULL,
    parent_hash TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blocks_number ON blocks(number);
CREATE INDEX idx_blocks_timestamp ON blocks(timestamp);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,
    block_number BIGINT NOT NULL,
    event_index INTEGER NOT NULL,
    section TEXT NOT NULL,
    method TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(block_number, event_index)
);

CREATE INDEX idx_events_section_method ON events(section, method);
CREATE INDEX idx_events_block_number ON events(block_number);

CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,
    block_number BIGINT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transfers_from ON transfers(from_address);
CREATE INDEX idx_transfers_to ON transfers(to_address);
CREATE INDEX idx_transfers_block_number ON transfers(block_number);

CREATE TABLE IF NOT EXISTS sync_state (
    id SERIAL PRIMARY KEY,
    last_block BIGINT NOT NULL,
    last_block_hash TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## TypeScript Implementation

### 1. Database Client

```typescript title="src/db.ts"
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function initDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function getSyncState() {
  const state = await prisma.syncState.findFirst({
    orderBy: { id: 'desc' }
  });

  return state || null;
}

export async function updateSyncState(blockNumber: bigint, blockHash: string) {
  await prisma.syncState.create({
    data: {
      lastBlock: blockNumber,
      lastBlockHash: blockHash
    }
  });
}
```

### 2. Block Processor

```typescript title="src/processor.ts"
import { GlinClient } from '@glin-ai/sdk';
import { prisma } from './db';
import type { SignedBlock, EventRecord } from '@polkadot/types/interfaces';

export class BlockProcessor {
  constructor(private client: GlinClient) {}

  async processBlock(block: SignedBlock, events: EventRecord[]) {
    const blockNumber = block.block.header.number.toBigInt();
    const blockHash = block.block.header.hash.toHex();
    const parentHash = block.block.header.parentHash.toHex();

    // Extract timestamp from block
    const timestamp = await this.getBlockTimestamp(blockHash);

    console.log(`Processing block #${blockNumber} (${blockHash})`);

    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Insert block
      const dbBlock = await tx.block.create({
        data: {
          number: blockNumber,
          hash: blockHash,
          parentHash: parentHash,
          timestamp: new Date(timestamp)
        }
      });

      // 2. Process events
      for (let i = 0; i < events.length; i++) {
        const event = events[i];

        // Store all events
        await tx.event.create({
          data: {
            blockId: dbBlock.id,
            blockNumber: blockNumber,
            eventIndex: i,
            section: event.event.section,
            method: event.event.method,
            data: event.event.data.toJSON()
          }
        });

        // Extract transfers
        if (
          event.event.section === 'balances' &&
          event.event.method === 'Transfer'
        ) {
          const [from, to, amount] = event.event.data;

          await tx.transfer.create({
            data: {
              blockId: dbBlock.id,
              blockNumber: blockNumber,
              from: from.toString(),
              to: to.toString(),
              amount: amount.toString()
            }
          });
        }
      }
    });

    console.log(`✅ Block #${blockNumber}: ${events.length} events processed`);
  }

  private async getBlockTimestamp(blockHash: string): Promise<number> {
    const apiAt = await this.client.api.at(blockHash);
    const timestamp = await apiAt.query.timestamp.now();
    return timestamp.toNumber();
  }
}
```

### 3. Indexer Service

```typescript title="src/indexer.ts"
import { GlinClient } from '@glin-ai/sdk';
import { BlockProcessor } from './processor';
import { getSyncState, updateSyncState } from './db';

export class Indexer {
  private processor: BlockProcessor;
  private isRunning = false;

  constructor(private client: GlinClient) {
    this.processor = new BlockProcessor(client);
  }

  async start() {
    this.isRunning = true;
    console.log('🚀 Starting indexer...');

    // Get last synced block
    const syncState = await getSyncState();
    const startBlock = syncState ? syncState.lastBlock + 1n : 0n;

    console.log(`📍 Starting from block #${startBlock}`);

    // Subscribe to new blocks
    const unsubscribe = await this.client.api.rpc.chain.subscribeNewHeads(
      async (header) => {
        if (!this.isRunning) {
          unsubscribe();
          return;
        }

        const currentBlock = header.number.toBigInt();

        // Catch up if behind
        if (currentBlock > startBlock) {
          await this.catchUp(startBlock, currentBlock);
        }

        // Process new block
        await this.processNewBlock(header.hash.toHex());
      }
    );

    console.log('✅ Indexer started and listening for blocks');
  }

  private async catchUp(from: bigint, to: bigint) {
    console.log(`⏩ Catching up from #${from} to #${to}`);

    for (let i = from; i < to; i++) {
      if (!this.isRunning) break;

      const blockHash = await this.client.api.rpc.chain.getBlockHash(i);
      await this.processNewBlock(blockHash.toHex());

      // Log progress every 100 blocks
      if (i % 100n === 0n) {
        console.log(`   Progress: ${i}/${to}`);
      }
    }
  }

  private async processNewBlock(blockHash: string) {
    try {
      // Get block and events
      const [block, events] = await Promise.all([
        this.client.api.rpc.chain.getBlock(blockHash),
        this.client.api.query.system.events.at(blockHash)
      ]);

      // Process block
      await this.processor.processBlock(block, events);

      // Update sync state
      const blockNumber = block.block.header.number.toBigInt();
      await updateSyncState(blockNumber, blockHash);

    } catch (error) {
      console.error(`❌ Error processing block ${blockHash}:`, error);
      throw error;
    }
  }

  stop() {
    console.log('🛑 Stopping indexer...');
    this.isRunning = false;
  }
}
```

### 4. Main Entry Point

```typescript title="src/index.ts"
import { GlinClient } from '@glin-ai/sdk';
import { Indexer } from './indexer';
import { initDatabase } from './db';

async function main() {
  try {
    // 1. Initialize database
    await initDatabase();

    // 2. Connect to blockchain
    const client = await GlinClient.connect(
      process.env.GLIN_RPC || 'wss://testnet.glin.ai'
    );

    console.log('✅ Connected to GLIN Network');

    // 3. Start indexer
    const indexer = new Indexer(client);
    await indexer.start();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down...');
      indexer.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
```

### 5. Query API

```typescript title="src/api.ts"
import express from 'express';
import { prisma } from './db';

const app = express();

// Get block by number
app.get('/blocks/:number', async (req, res) => {
  const block = await prisma.block.findUnique({
    where: { number: BigInt(req.params.number) },
    include: {
      events: true,
      transfers: true
    }
  });

  res.json(block);
});

// Get transfers for address
app.get('/transfers/:address', async (req, res) => {
  const { address } = req.params;
  const { limit = 100, offset = 0 } = req.query;

  const transfers = await prisma.transfer.findMany({
    where: {
      OR: [
        { from: address },
        { to: address }
      ]
    },
    orderBy: { blockNumber: 'desc' },
    take: Number(limit),
    skip: Number(offset),
    include: {
      block: true
    }
  });

  res.json(transfers);
});

// Get events by type
app.get('/events/:section/:method', async (req, res) => {
  const { section, method } = req.params;
  const { limit = 100, offset = 0 } = req.query;

  const events = await prisma.event.findMany({
    where: { section, method },
    orderBy: { blockNumber: 'desc' },
    take: Number(limit),
    skip: Number(offset),
    include: {
      block: true
    }
  });

  res.json(events);
});

// Get sync status
app.get('/status', async (req, res) => {
  const syncState = await prisma.syncState.findFirst({
    orderBy: { id: 'desc' }
  });

  res.json({
    lastBlock: syncState?.lastBlock.toString(),
    lastBlockHash: syncState?.lastBlockHash,
    updatedAt: syncState?.updatedAt
  });
});

app.listen(3000, () => {
  console.log('🌐 API server running on http://localhost:3000');
});
```

## Rust Implementation

### 1. Database Models

```rust title="src/db/models.rs"
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize)]
pub struct Block {
    pub id: i32,
    pub number: i64,
    pub hash: String,
    pub parent_hash: String,
    pub timestamp: chrono::NaiveDateTime,
}

#[derive(Debug, FromRow, Serialize)]
pub struct Event {
    pub id: i32,
    pub block_id: i32,
    pub block_number: i64,
    pub event_index: i32,
    pub section: String,
    pub method: String,
    pub data: serde_json::Value,
}

#[derive(Debug, FromRow, Serialize)]
pub struct Transfer {
    pub id: i32,
    pub block_id: i32,
    pub block_number: i64,
    pub from_address: String,
    pub to_address: String,
    pub amount: String,
}

#[derive(Debug, FromRow)]
pub struct SyncState {
    pub id: i32,
    pub last_block: i64,
    pub last_block_hash: String,
}
```

### 2. Database Operations

```rust title="src/db/mod.rs"
use sqlx::{PgPool, postgres::PgPoolOptions};
use anyhow::Result;

pub mod models;
use models::*;

pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn connect(url: &str) -> Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(url)
            .await?;

        tracing::info!("✅ Database connected");

        Ok(Self { pool })
    }

    pub async fn run_migrations(&self) -> Result<()> {
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn insert_block(
        &self,
        number: i64,
        hash: &str,
        parent_hash: &str,
        timestamp: chrono::NaiveDateTime,
    ) -> Result<i32> {
        let row = sqlx::query!(
            r#"
            INSERT INTO blocks (number, hash, parent_hash, timestamp)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
            number,
            hash,
            parent_hash,
            timestamp
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(row.id)
    }

    pub async fn insert_event(
        &self,
        block_id: i32,
        block_number: i64,
        event_index: i32,
        section: &str,
        method: &str,
        data: serde_json::Value,
    ) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO events (block_id, block_number, event_index, section, method, data)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
            block_id,
            block_number,
            event_index,
            section,
            method,
            data
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn insert_transfer(
        &self,
        block_id: i32,
        block_number: i64,
        from: &str,
        to: &str,
        amount: &str,
    ) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO transfers (block_id, block_number, from_address, to_address, amount)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            block_id,
            block_number,
            from,
            to,
            amount
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_sync_state(&self) -> Result<Option<SyncState>> {
        let state = sqlx::query_as!(
            SyncState,
            "SELECT * FROM sync_state ORDER BY id DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(state)
    }

    pub async fn update_sync_state(&self, block_number: i64, block_hash: &str) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO sync_state (last_block, last_block_hash, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            "#,
            block_number,
            block_hash
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
```

### 3. Block Processor

```rust title="src/processor.rs"
use anyhow::Result;
use subxt::OnlineClient;
use subxt::config::SubstrateConfig;
use crate::db::Database;

pub struct BlockProcessor {
    db: Database,
}

impl BlockProcessor {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    pub async fn process_block(
        &self,
        client: &OnlineClient<SubstrateConfig>,
        block_number: u64,
        block_hash: String,
    ) -> Result<()> {
        tracing::info!("Processing block #{}", block_number);

        // Get block details
        let block_hash_bytes = hex::decode(&block_hash[2..])?;
        let block = client.blocks().at(block_hash_bytes.try_into()?).await?;

        // Get parent hash
        let header = block.header();
        let parent_hash = format!("0x{}", hex::encode(header.parent_hash));

        // Get timestamp (simplified - you'd need to query timestamp pallet)
        let timestamp = chrono::Utc::now().naive_utc();

        // Insert block
        let block_id = self.db.insert_block(
            block_number as i64,
            &block_hash,
            &parent_hash,
            timestamp,
        ).await?;

        // Process events
        let events = block.events().await?;
        for (idx, event) in events.iter().enumerate() {
            let event = event?;

            // Store event
            self.db.insert_event(
                block_id,
                block_number as i64,
                idx as i32,
                event.pallet_name(),
                event.variant_name(),
                serde_json::json!({
                    "pallet": event.pallet_name(),
                    "event": event.variant_name(),
                }),
            ).await?;

            // Extract transfers
            if event.pallet_name() == "Balances" && event.variant_name() == "Transfer" {
                // Parse transfer data
                // This is simplified - you'd need proper event decoding
                tracing::info!("  📤 Transfer event found");
            }
        }

        tracing::info!("✅ Block #{} processed", block_number);
        Ok(())
    }
}
```

### 4. Indexer Service

```rust title="src/indexer.rs"
use anyhow::Result;
use glin_client::create_client;
use subxt::OnlineClient;
use subxt::config::SubstrateConfig;
use tokio::time::{sleep, Duration};
use crate::db::Database;
use crate::processor::BlockProcessor;

pub struct Indexer {
    client: OnlineClient<SubstrateConfig>,
    db: Database,
    processor: BlockProcessor,
}

impl Indexer {
    pub async fn new(rpc_url: &str, db_url: &str) -> Result<Self> {
        let client = create_client(rpc_url).await?;
        let db = Database::connect(db_url).await?;

        // Run migrations
        db.run_migrations().await?;

        let processor = BlockProcessor::new(db.clone());

        Ok(Self { client, db, processor })
    }

    pub async fn start(&self) -> Result<()> {
        tracing::info!("🚀 Starting indexer...");

        // Get last synced block
        let start_block = match self.db.get_sync_state().await? {
            Some(state) => (state.last_block + 1) as u64,
            None => 0,
        };

        tracing::info!("📍 Starting from block #{}", start_block);

        let mut current_block = start_block;

        loop {
            // Get latest block
            let latest_hash = self.client.rpc().finalized_head().await?;
            let latest_block = self.client.blocks().at(latest_hash).await?;
            let latest_number = latest_block.number() as u64;

            // Process blocks
            while current_block <= latest_number {
                let block_hash = self.get_block_hash(current_block).await?;

                self.processor.process_block(
                    &self.client,
                    current_block,
                    block_hash.clone(),
                ).await?;

                // Update sync state
                self.db.update_sync_state(current_block as i64, &block_hash).await?;

                current_block += 1;

                // Log progress
                if current_block % 100 == 0 {
                    tracing::info!("⏩ Progress: {}/{}", current_block, latest_number);
                }
            }

            // Wait for new blocks
            sleep(Duration::from_secs(6)).await;
        }
    }

    async fn get_block_hash(&self, block_number: u64) -> Result<String> {
        let hash = self.client.rpc().block_hash(Some(block_number.into())).await?;
        match hash {
            Some(h) => Ok(format!("0x{}", hex::encode(h))),
            None => anyhow::bail!("Block {} not found", block_number),
        }
    }
}
```

### 5. Main Entry Point

```rust title="src/main.rs"
mod db;
mod processor;
mod indexer;

use anyhow::Result;
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    // Load config from environment
    let rpc_url = std::env::var("GLIN_RPC")
        .unwrap_or_else(|_| "wss://testnet.glin.ai".to_string());

    let db_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    // Create and start indexer
    let indexer = indexer::Indexer::new(&rpc_url, &db_url).await?;

    tracing::info!("✅ Connected to GLIN Network");

    indexer.start().await?;

    Ok(())
}
```

## Running the Indexer

### TypeScript

```bash
# Setup database
npx prisma migrate dev

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/glin_indexer"
export GLIN_RPC="wss://testnet.glin.ai"

# Run indexer
tsx src/index.ts

# Run API (separate terminal)
tsx src/api.ts
```

### Rust

```bash
# Run migrations
sqlx migrate run

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/glin_indexer"
export GLIN_RPC="wss://testnet.glin.ai"

# Run indexer
cargo run --release
```

## Query Examples

### Get Block Information

```bash
curl http://localhost:3000/blocks/1000
```

Response:
```json
{
  "id": 1,
  "number": "1000",
  "hash": "0x...",
  "parentHash": "0x...",
  "timestamp": "2024-01-15T10:30:00Z",
  "events": [...],
  "transfers": [...]
}
```

### Get Transfers for Address

```bash
curl "http://localhost:3000/transfers/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY?limit=10"
```

### Get Events by Type

```bash
curl http://localhost:3000/events/balances/Transfer
```

### Check Sync Status

```bash
curl http://localhost:3000/status
```

Response:
```json
{
  "lastBlock": "12543",
  "lastBlockHash": "0x...",
  "updatedAt": "2024-01-15T10:35:22Z"
}
```

## Production Optimizations

### 1. Batch Processing

```typescript
// Process multiple blocks in parallel
async function processBatchParallel(blockNumbers: bigint[]) {
  const promises = blockNumbers.map(num => processBlock(num));
  await Promise.all(promises);
}
```

### 2. Database Indexing

```sql
-- Add composite indexes for common queries
CREATE INDEX idx_transfers_from_to ON transfers(from_address, to_address);
CREATE INDEX idx_events_section_method_block ON events(section, method, block_number DESC);

-- Add partial indexes for active data
CREATE INDEX idx_recent_transfers ON transfers(block_number DESC)
  WHERE block_number > (SELECT MAX(block_number) - 10000 FROM blocks);
```

### 3. Connection Pooling

```typescript
// Configure connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error'],
  // Connection pool settings
  __internal: {
    engine: {
      connection_limit: 10
    }
  }
});
```

### 4. Error Recovery

```typescript
async function processWithRetry(blockNumber: bigint, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await processBlock(blockNumber);
      return;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for block ${blockNumber}`);
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

### 5. Handle Chain Reorgs

```typescript
async function handleReorg(newHead: string) {
  // Find common ancestor
  const commonBlock = await findCommonAncestor(newHead);

  // Delete blocks after reorg point
  await prisma.block.deleteMany({
    where: {
      number: { gt: commonBlock.number }
    }
  });

  // Re-index from common ancestor
  await resumeFromBlock(commonBlock.number + 1n);
}
```

## Monitoring

### Health Check Endpoint

```typescript
app.get('/health', async (req, res) => {
  const syncState = await prisma.syncState.findFirst({
    orderBy: { id: 'desc' }
  });

  const latestBlock = await client.api.rpc.chain.getBlock();
  const chainHead = latestBlock.block.header.number.toBigInt();

  const lag = chainHead - (syncState?.lastBlock || 0n);

  res.json({
    status: lag < 10n ? 'healthy' : 'lagging',
    lastIndexedBlock: syncState?.lastBlock.toString(),
    chainHead: chainHead.toString(),
    lag: lag.toString(),
    uptime: process.uptime()
  });
});
```

### Prometheus Metrics

```typescript
import { register, Counter, Gauge } from 'prom-client';

const blocksProcessed = new Counter({
  name: 'indexer_blocks_processed_total',
  help: 'Total blocks processed'
});

const eventsProcessed = new Counter({
  name: 'indexer_events_processed_total',
  help: 'Total events processed'
});

const indexerLag = new Gauge({
  name: 'indexer_lag_blocks',
  help: 'Number of blocks behind chain head'
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Troubleshooting

### Indexer Falls Behind

**Problem**: Indexer can't keep up with block production

**Solutions**:
- Increase batch size for historical sync
- Use multiple indexer instances with partitioning
- Optimize database queries with proper indexes
- Use read replicas for API queries

### Database Disk Space

**Problem**: Database grows too large

**Solutions**:
- Implement data retention policies
- Archive old blocks to cold storage
- Use table partitioning by block number
- Compress historical data

### Missing Events

**Problem**: Some events are not being indexed

**Solutions**:
- Check event filters are not too restrictive
- Verify all event types are handled
- Check for transaction errors during indexing
- Review logs for processing errors

## Next Steps

- 💡 [Sign in with GLIN](/sdk/examples/sign-in-with-glin) - Wallet authentication
- 🚀 [Deploy Contract](/sdk/examples/deploy-contract) - Contract deployment
- 📝 [Transactions](/sdk/core-concepts/transactions) - Send and track transactions

---

Need help? [Join our Discord](https://discord.gg/glin-ai)
