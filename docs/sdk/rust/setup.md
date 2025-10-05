# Rust SDK Setup

Complete setup guide for using GLIN SDK in Rust projects.

## Prerequisites

- Rust 1.70 or later
- Cargo package manager (included with Rust)
- Basic knowledge of Rust and async programming

## Installation

### Install Rust

If you don't have Rust installed:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Verify installation:
```bash
rustc --version
cargo --version
```

### Create New Project

```bash
cargo new my-glin-app
cd my-glin-app
```

### Add GLIN SDK Dependencies

Add to your `Cargo.toml`:

```toml title="Cargo.toml"
[package]
name = "my-glin-app"
version = "0.1.0"
edition = "2021"

[dependencies]
# GLIN SDK - Core crates
glin-client = "0.1"
glin-contracts = "0.1"
glin-types = "0.1"

# Async runtime
tokio = { version = "1", features = ["full"] }

# Error handling
anyhow = "1"

# Optional: CLI tools
clap = { version = "4", features = ["derive"] }
colored = "2"
indicatif = "0.17"
```

Or use `cargo add`:

```bash
cargo add glin-client glin-contracts glin-types
cargo add tokio --features full
cargo add anyhow
```

## Project Types

### CLI Application

Perfect for command-line tools like glin-forge:

```toml title="Cargo.toml"
[dependencies]
glin-client = "0.1"
tokio = { version = "1", features = ["full"] }
anyhow = "1"
clap = { version = "4", features = ["derive"] }
colored = "2"
```

```rust title="src/main.rs"
use clap::{Parser, Subcommand};
use glin_client::create_client;
use colored::Colorize;
use anyhow::Result;

#[derive(Parser)]
#[command(name = "glin-cli")]
#[command(about = "GLIN Network CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Balance {
        #[arg(short, long)]
        address: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Balance { address } => {
            println!("{} Connecting to GLIN...", "→".cyan());
            let client = create_client("wss://testnet.glin.ai").await?;

            let balance = client.get_balance(&address).await?;
            println!("{} Balance: {} GLIN", "✓".green(), balance);
        }
    }

    Ok(())
}
```

### Backend Service (Axum)

Perfect for REST APIs and backend services:

```toml title="Cargo.toml"
[dependencies]
glin-client = "0.1"
tokio = { version = "1", features = ["full"] }
axum = "0.7"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

```rust title="src/main.rs"
use axum::{
    routing::get,
    Json, Router,
    extract::Path,
};
use glin_client::create_client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    client: Arc<glin_client::GlinClient>,
}

#[derive(Serialize)]
struct BalanceResponse {
    address: String,
    balance: String,
}

async fn get_balance(
    Path(address): Path<String>,
    state: axum::extract::State<AppState>,
) -> Json<BalanceResponse> {
    let balance = state.client.get_balance(&address).await
        .unwrap_or_default();

    Json(BalanceResponse {
        address,
        balance: balance.to_string(),
    })
}

#[tokio::main]
async fn main() {
    let client = create_client("wss://testnet.glin.ai").await.unwrap();

    let state = AppState {
        client: Arc::new(client),
    };

    let app = Router::new()
        .route("/balance/:address", get(get_balance))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    println!("Server running on http://localhost:3000");

    axum::serve(listener, app).await.unwrap();
}
```

### Blockchain Indexer

Perfect for high-performance data indexing:

```toml title="Cargo.toml"
[dependencies]
glin-client = "0.1"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres"] }
anyhow = "1"
```

```rust title="src/main.rs"
use glin_client::create_client;
use sqlx::PgPool;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // Connect to GLIN network
    let client = create_client("wss://testnet.glin.ai").await?;

    // Connect to database
    let pool = PgPool::connect("postgres://localhost/glin_indexer").await?;

    // Subscribe to finalized blocks
    let mut blocks = client.blocks().subscribe_finalized().await?;

    println!("🔍 Indexing blocks...");

    while let Some(block) = blocks.next().await {
        let block = block?;

        // Index block data
        let block_number = block.number();
        let block_hash = block.hash();

        sqlx::query!(
            "INSERT INTO blocks (number, hash) VALUES ($1, $2)",
            block_number as i64,
            format!("{:?}", block_hash)
        )
        .execute(&pool)
        .await?;

        println!("Indexed block #{}", block_number);
    }

    Ok(())
}
```

## Basic Usage

### Connect to Network

```rust
use glin_client::create_client;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // Connect to testnet
    let client = create_client("wss://testnet.glin.ai").await?;

    // Or mainnet (when available)
    let client = create_client("wss://rpc.glin.ai").await?;

    // Or local development
    let client = create_client("ws://localhost:9944").await?;

    Ok(())
}
```

### Create Accounts

```rust
use glin_client::{get_dev_account, account_from_seed, get_address};
use anyhow::Result;

fn main() -> Result<()> {
    // Development accounts
    let alice = get_dev_account("alice")?;
    let bob = get_dev_account("bob")?;

    println!("Alice: {}", get_address(&alice));
    println!("Bob: {}", get_address(&bob));

    // From seed phrase
    let custom = account_from_seed("//CustomSeed")?;

    // From mnemonic
    let account = account_from_seed(
        "word1 word2 word3 ... word12"
    )?;

    Ok(())
}
```

### Query Balances

```rust
use glin_client::{create_client, get_dev_account, get_address};
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;
    let alice = get_dev_account("alice")?;
    let address = get_address(&alice);

    let balance = client.get_balance(&address).await?;
    println!("Balance: {} GLIN", balance);

    Ok(())
}
```

### Send Transactions

```rust
use glin_client::{create_client, get_dev_account};
use subxt::tx::PairSigner;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai").await?;

    let alice = get_dev_account("alice")?;
    let bob = get_dev_account("bob")?;

    // Create transfer
    let amount = 100u128 * 10u128.pow(18); // 100 GLIN

    let transfer_tx = subxt::dynamic::tx(
        "Balances",
        "transfer",
        vec![
            subxt::dynamic::Value::from_bytes(&bob.public_key()),
            subxt::dynamic::Value::u128(amount),
        ],
    );

    // Sign and send
    let signer = PairSigner::new(alice);
    let hash = client
        .tx()
        .sign_and_submit_default(&transfer_tx, &signer)
        .await?;

    println!("Transaction hash: {:?}", hash);

    Ok(())
}
```

## Environment Variables

Create a `.env` file:

```bash title=".env"
# Network
GLIN_RPC_URL=wss://testnet.glin.ai

# Development (NEVER use in production!)
DEV_SEED=//Alice

# Database (for indexers)
DATABASE_URL=postgres://localhost/glin_db
```

Load with `dotenvy`:

```toml title="Cargo.toml"
[dependencies]
dotenvy = "0.15"
```

```rust
use dotenvy::dotenv;
use std::env;

fn main() {
    dotenv().ok();

    let rpc_url = env::var("GLIN_RPC_URL")
        .unwrap_or_else(|_| "wss://testnet.glin.ai".to_string());

    println!("RPC: {}", rpc_url);
}
```

## Error Handling

The SDK uses `anyhow::Result` for errors:

```rust
use glin_client::create_client;
use anyhow::{Result, Context};

#[tokio::main]
async fn main() -> Result<()> {
    let client = create_client("wss://testnet.glin.ai")
        .await
        .context("Failed to connect to GLIN network")?;

    let balance = client.get_balance("5GrwvaEF...")
        .await
        .context("Failed to query balance")?;

    println!("Balance: {}", balance);

    Ok(())
}
```

Custom error handling:

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GlinError {
    #[error("Network connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Invalid address: {0}")]
    InvalidAddress(String),

    #[error("Transaction failed: {0}")]
    TransactionFailed(String),
}
```

## Async Runtime Configuration

### Tokio (Recommended)

```toml title="Cargo.toml"
[dependencies]
tokio = { version = "1", features = ["full"] }
```

```rust
#[tokio::main]
async fn main() {
    // Your async code here
}
```

### Tokio with Custom Configuration

```rust
#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() {
    // Multi-threaded runtime with 4 workers
}
```

### async-std (Alternative)

```toml title="Cargo.toml"
[dependencies]
async-std = { version = "1", features = ["attributes"] }
```

```rust
#[async_std::main]
async fn main() {
    // Your async code here
}
```

## Performance Optimization

### Connection Pooling

```rust
use std::sync::Arc;
use glin_client::GlinClient;

pub struct GlinPool {
    client: Arc<GlinClient>,
}

impl GlinPool {
    pub async fn new(url: &str) -> Result<Self> {
        let client = create_client(url).await?;
        Ok(Self {
            client: Arc::new(client),
        })
    }

    pub fn client(&self) -> Arc<GlinClient> {
        Arc::clone(&self.client)
    }
}
```

### Batch Queries

```rust
use futures::future::join_all;

async fn batch_get_balances(addresses: Vec<String>) -> Result<Vec<u128>> {
    let client = create_client("wss://testnet.glin.ai").await?;

    let futures = addresses.iter().map(|addr| {
        let client = &client;
        async move {
            client.get_balance(addr).await
        }
    });

    let results = join_all(futures).await;

    results.into_iter().collect()
}
```

## Development Tools

### Logging

```toml title="Cargo.toml"
[dependencies]
tracing = "0.1"
tracing-subscriber = "0.3"
```

```rust
use tracing::{info, error};
use tracing_subscriber;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    info!("Connecting to GLIN network...");

    match create_client("wss://testnet.glin.ai").await {
        Ok(client) => info!("Connected successfully"),
        Err(e) => error!("Connection failed: {}", e),
    }
}
```

### Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use glin_client::create_client;

    #[tokio::test]
    async fn test_connection() {
        let client = create_client("wss://testnet.glin.ai").await;
        assert!(client.is_ok());
    }

    #[tokio::test]
    async fn test_balance_query() {
        let client = create_client("wss://testnet.glin.ai")
            .await
            .unwrap();

        let balance = client.get_balance("5GrwvaEF...").await;
        assert!(balance.is_ok());
    }
}
```

Run tests:
```bash
cargo test
```

### Benchmarking

```toml title="Cargo.toml"
[dev-dependencies]
criterion = "0.5"

[[bench]]
name = "glin_bench"
harness = false
```

```rust title="benches/glin_bench.rs"
use criterion::{criterion_group, criterion_main, Criterion};
use glin_client::create_client;

fn bench_connection(c: &mut Criterion) {
    c.bench_function("connect", |b| {
        b.to_async(tokio::runtime::Runtime::new().unwrap())
            .iter(|| async {
                create_client("wss://testnet.glin.ai").await.unwrap()
            })
    });
}

criterion_group!(benches, bench_connection);
criterion_main!(benches);
```

## Troubleshooting

### Compilation Errors

Update Rust toolchain:
```bash
rustup update
cargo clean
cargo build
```

### OpenSSL Errors (Linux)

Install OpenSSL development files:
```bash
# Ubuntu/Debian
sudo apt-get install libssl-dev pkg-config

# Fedora
sudo dnf install openssl-devel

# Arch
sudo pacman -S openssl pkg-config
```

### WebSocket Connection Failed

Check firewall settings:
```bash
# Test connection
curl -I https://testnet.glin.ai

# Check if port is open
nc -zv testnet.glin.ai 443
```

### Async Runtime Errors

Make sure you're using `#[tokio::main]`:
```rust
// Correct
#[tokio::main]
async fn main() { }

// Wrong
fn main() {
    // Cannot use await here!
}
```

## Cross-Compilation

### Build for Different Targets

```bash
# Add target
rustup target add x86_64-unknown-linux-musl

# Build
cargo build --target x86_64-unknown-linux-musl --release
```

### Docker Build

```dockerfile title="Dockerfile"
FROM rust:1.70 as builder

WORKDIR /app
COPY . .

RUN cargo build --release

FROM debian:bookworm-slim

COPY --from=builder /app/target/release/my-glin-app /usr/local/bin/

CMD ["my-glin-app"]
```

## Next Steps

- 🛠️ [CLI Tools Guide](/docs/sdk/rust/cli-tools)
- ⚡ [Async Patterns](/docs/sdk/rust/async-patterns)
- 📚 [API Reference](/docs/sdk/rust/api-reference)
- 💡 [Examples](/docs/sdk/rust/examples)

---

Need help? [Join our Discord](https://discord.gg/glin-ai) or check the [API docs](https://docs.rs/glin-client).
