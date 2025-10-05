# Getting Started

Welcome! This guide will help you get started with GLIN SDK in just a few minutes.

## Prerequisites

Before you begin, make sure you have:

- **For TypeScript SDK**:
  - Node.js 18+ installed
  - npm, yarn, or pnpm package manager
  - Basic knowledge of JavaScript/TypeScript

- **For Rust SDK**:
  - Rust 1.70+ installed (`rustup` recommended)
  - Cargo package manager
  - Basic knowledge of Rust and async programming

## Choose Your SDK

GLIN provides SDKs for multiple languages. Choose the one that fits your use case:

### TypeScript/JavaScript

**Best for**:
- 🌐 Web applications (React, Vue, Svelte)
- 🖥️ Node.js backend services
- 📱 Browser extensions
- 🔗 Full-stack applications

```bash
npm install @glin-ai/sdk
```

[TypeScript Setup Guide →](/sdk/typescript/setup)

### Rust

**Best for**:
- 🛠️ CLI tools and utilities
- ⚡ High-performance indexers
- 🔒 Backend services
- 📊 Data processing pipelines

```bash
cargo add glin-client glin-contracts
```

[Rust Setup Guide →](/sdk/rust/setup)

## Next Steps

1. **[Installation →](/sdk/getting-started/installation)** - Detailed installation instructions
2. **[Quick Start →](/sdk/getting-started/quickstart)** - Build your first app
3. **[Core Concepts →](/sdk/core-concepts/architecture)** - Understand GLIN architecture

## What You'll Build

By the end of this guide, you'll be able to:

- ✅ Connect to GLIN Network
- ✅ Create and manage accounts
- ✅ Send transactions
- ✅ Deploy smart contracts
- ✅ Interact with deployed contracts
- ✅ Subscribe to blockchain events

## Example Application

Here's what a simple GLIN app looks like:

**TypeScript**:
```typescript
import { GlinClient } from '@glin-ai/sdk';

const client = await GlinClient.connect('wss://testnet.glin.ai');
const balance = await client.getBalance('5GrwvaEF...');
console.log(`Balance: ${balance.free} GLIN`);
```

**Rust**:
```rust
use glin_client::create_client;

let client = create_client("wss://testnet.glin.ai").await?;
let balance = client.get_balance("5GrwvaEF...").await?;
println!("Balance: {} GLIN", balance.free);
```

## Need Help?

- 💬 Join our [Discord community](https://discord.gg/glin-ai)
- 📧 Email us at [dev@glin.ai](mailto:dev@glin.ai)
- 🐛 Report issues on [GitHub](https://github.com/glin-ai)

Let's get started! →
