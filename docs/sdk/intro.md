# GLIN SDK Overview

Welcome to the GLIN SDK documentation! This guide will help you build applications on GLIN Network using TypeScript or Rust.

## 🎯 What is GLIN SDK?

GLIN SDK is a comprehensive set of tools for interacting with GLIN Network, a decentralized AI training platform built on Substrate. Whether you're building a frontend app, backend service, CLI tool, or blockchain indexer, we have an SDK for you.

## 📦 Available SDKs

### TypeScript/JavaScript SDK

Perfect for web applications and Node.js backends.

[![npm version](https://img.shields.io/npm/v/@glin-ai/sdk.svg)](https://www.npmjs.com/package/@glin-ai/sdk)

- **Frontend**: React, Vue, Svelte apps
- **Backend**: Node.js, Next.js API routes
- **Features**: Browser extension support, React hooks
- **Repository**: [glin-ai/glin-sdk](https://github.com/glin-ai/glin-sdk)

[Get Started with TypeScript →](/sdk/typescript/setup)

### Rust SDK

Ideal for high-performance tools and backend services.

[![Crates.io](https://img.shields.io/crates/v/glin-client.svg)](https://crates.io/crates/glin-client)

- **CLI Tools**: Command-line utilities like glin-forge
- **Indexers**: High-performance blockchain indexers
- **Backend**: Rust backend services
- **Features**: Type-safe, zero-cost abstractions
- **Repository**: [glin-ai/glin-sdk-rust](https://github.com/glin-ai/glin-sdk-rust)

[Get Started with Rust →](/sdk/rust/setup)

## ✨ Core Features

All GLIN SDKs provide these essential features:

| Feature | TypeScript | Rust |
|---------|-----------|------|
| Network Connection | ✅ | ✅ |
| Account Management | ✅ | ✅ |
| Contract Deployment | ✅ | ✅ |
| Contract Interaction | ✅ | ✅ |
| Transaction Handling | ✅ | ✅ |
| Event Subscriptions | ✅ | ✅ |
| Metadata Parsing | ✅ | ✅ |

Plus language-specific extensions:
- **TypeScript**: Browser extensions, React hooks
- **Rust**: CLI tools, high-performance indexing

## 🚀 Quick Start

Get started in 5 minutes:

1. **[Installation →](/sdk/getting-started/installation)** - Install the SDK for your language
2. **[Quick Start →](/sdk/getting-started/quickstart)** - Build your first app
3. **[Examples →](/sdk/examples/sign-in-with-glin)** - Learn from working examples

## 🎓 Learning Path

### For Frontend Developers
1. Install TypeScript SDK
2. Learn ["Sign in with GLIN"](/sdk/core-concepts/authentication)
3. Integrate with [React](/sdk/typescript/react-integration)
4. Build a [contract interaction UI](/sdk/examples/deploy-contract)

### For Backend Developers
1. Choose [TypeScript](/sdk/typescript/setup) or [Rust](/sdk/rust/setup)
2. Learn [account management](/sdk/core-concepts/accounts)
3. Build a [blockchain indexer](/sdk/examples/build-indexer)
4. Deploy and [interact with contracts](/sdk/contracts/deploying)

### For CLI Tool Developers
1. Install [Rust SDK](/sdk/rust/setup)
2. Learn [async patterns](/sdk/rust/async-patterns)
3. Build a [CLI tool](/sdk/examples/create-cli-tool)

## 🔗 Network Endpoints

Connect to GLIN Network:

```
Testnet:  wss://testnet.glin.ai
Mainnet:  wss://rpc.glin.ai (coming soon)
Local:    ws://localhost:9944
```

## 💬 Get Help

- 📚 [Documentation](https://docs.glin.ai)
- 💬 [Discord Community](https://discord.gg/glin-ai)
- 🐦 [Twitter](https://twitter.com/glin_ai)
- 📧 [Email Support](mailto:dev@glin.ai)
- 🐛 [Report Issues](https://github.com/glin-ai/glin-sdk/issues)

## 📄 License

All GLIN SDKs are open source under the Apache-2.0 license.
