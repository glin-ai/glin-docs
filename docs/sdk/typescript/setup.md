# TypeScript SDK Setup

Complete setup guide for using GLIN SDK in TypeScript/JavaScript projects.

## Prerequisites

- Node.js 18 or later
- npm, yarn, or pnpm package manager
- Basic knowledge of TypeScript/JavaScript

## Installation

Install the SDK via your preferred package manager:

```bash
# npm
npm install @glin-ai/sdk

# yarn
yarn add @glin-ai/sdk

# pnpm
pnpm add @glin-ai/sdk
```

## Framework-Specific Setup

### Next.js (App Router)

```bash
npx create-next-app@latest my-glin-app
cd my-glin-app
npm install @glin-ai/sdk
```

Create an API route for backend operations:

```typescript title="app/api/glin/route.ts"
import { GlinClient } from '@glin-ai/sdk';
import { NextResponse } from 'next/server';

export async function GET() {
  const client = await GlinClient.connect('wss://testnet.glin.ai');
  const chain = await client.getChain();

  return NextResponse.json({ chain });
}
```

Use in client components:

```typescript title="app/components/Balance.tsx"
'use client';

import { useEffect, useState } from 'react';
import { GlinClient } from '@glin-ai/sdk';

export default function Balance({ address }: { address: string }) {
  const [balance, setBalance] = useState<string>('');

  useEffect(() => {
    async function fetchBalance() {
      const client = await GlinClient.connect('wss://testnet.glin.ai');
      const bal = await client.getBalance(address);
      setBalance(bal.free.toString());
    }
    fetchBalance();
  }, [address]);

  return <div>Balance: {balance} GLIN</div>;
}
```

### React (Vite)

```bash
npm create vite@latest my-glin-app -- --template react-ts
cd my-glin-app
npm install @glin-ai/sdk
```

Update `vite.config.ts`:

```typescript title="vite.config.ts"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@glin-ai/sdk']
  }
});
```

### Vue 3

```bash
npm create vue@latest my-glin-app
cd my-glin-app
npm install @glin-ai/sdk
```

Use in components:

```vue title="src/components/Balance.vue"
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { GlinClient } from '@glin-ai/sdk';

const props = defineProps<{ address: string }>();
const balance = ref('');

onMounted(async () => {
  const client = await GlinClient.connect('wss://testnet.glin.ai');
  const bal = await client.getBalance(props.address);
  balance.value = bal.free.toString();
});
</script>

<template>
  <div>Balance: {{ balance }} GLIN</div>
</template>
```

### Node.js / Express

```bash
mkdir my-glin-backend
cd my-glin-backend
npm init -y
npm install express @glin-ai/sdk
npm install -D @types/express tsx
```

```typescript title="server.ts"
import express from 'express';
import { GlinClient } from '@glin-ai/sdk';

const app = express();
const client = await GlinClient.connect('wss://testnet.glin.ai');

app.get('/balance/:address', async (req, res) => {
  const balance = await client.getBalance(req.params.address);
  res.json({ balance: balance.free.toString() });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

Run with:
```bash
npx tsx server.ts
```

## TypeScript Configuration

### tsconfig.json

Recommended TypeScript configuration:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Type Definitions

The SDK includes full TypeScript types. Import types as needed:

```typescript
import type {
  GlinClient,
  Balance,
  TransactionResult,
  ContractMetadata
} from '@glin-ai/sdk';
```

## Basic Usage

### Connect to Network

```typescript
import { GlinClient } from '@glin-ai/sdk';

// Connect to testnet
const client = await GlinClient.connect('wss://testnet.glin.ai');

// Or mainnet (when available)
const client = await GlinClient.connect('wss://rpc.glin.ai');

// Local development
const client = await GlinClient.connect('ws://localhost:9944');
```

### Create Accounts

```typescript
import { Keyring } from '@glin-ai/sdk';

const keyring = new Keyring({ type: 'sr25519' });

// Development accounts
const alice = keyring.addFromUri('//Alice');
const bob = keyring.addFromUri('//Bob');

// From mnemonic
const account = keyring.addFromMnemonic(
  'word1 word2 word3 ... word12'
);

// From seed
const custom = keyring.addFromUri('//CustomSeed');
```

### Query Balances

```typescript
const balance = await client.getBalance(alice.address);
console.log('Free:', balance.free.toString());
console.log('Reserved:', balance.reserved.toString());
console.log('Frozen:', balance.frozen.toString());
```

### Send Transactions

```typescript
const transfer = client.api.tx.balances.transfer(
  bob.address,
  100n * 10n**18n // 100 GLIN
);

const hash = await transfer.signAndSend(alice);
console.log('Transaction hash:', hash.toHex());

// Wait for finalization
await client.waitForFinalization(hash);
console.log('Transaction finalized!');
```

## Environment Variables

Create a `.env.local` file:

```bash title=".env.local"
# Network
NEXT_PUBLIC_GLIN_RPC=wss://testnet.glin.ai

# Development accounts (NEVER use in production!)
GLIN_PRIVATE_KEY=0x...

# API keys
GLIN_API_KEY=your_api_key_here
```

Use in your app:

```typescript
const client = await GlinClient.connect(
  process.env.NEXT_PUBLIC_GLIN_RPC || 'wss://testnet.glin.ai'
);
```

## Error Handling

```typescript
import { GlinClient } from '@glin-ai/sdk';

try {
  const client = await GlinClient.connect('wss://testnet.glin.ai');
  const balance = await client.getBalance(address);
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);

    // Handle specific errors
    if (error.message.includes('connection')) {
      console.error('Network connection failed');
    } else if (error.message.includes('account')) {
      console.error('Invalid account address');
    }
  }
}
```

## Browser Wallet Integration

Install wallet extension types:

```bash
npm install @polkadot/extension-dapp
```

Detect and connect to wallet:

```typescript
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';

async function connectWallet() {
  // Request access to wallet
  const extensions = await web3Enable('Your App Name');

  if (extensions.length === 0) {
    throw new Error('No wallet extension found');
  }

  // Get accounts
  const accounts = await web3Accounts();
  console.log('Available accounts:', accounts);

  return accounts[0]; // Use first account
}
```

Full wallet integration guide: [Browser Extensions →](/docs/sdk/typescript/browser-extensions)

## Performance Optimization

### Tree Shaking

The SDK supports tree shaking. Import only what you need:

```typescript
// Good - only imports used functions
import { GlinClient } from '@glin-ai/sdk';

// Avoid - imports everything
import * as GlinSDK from '@glin-ai/sdk';
```

### Code Splitting

For large apps, use dynamic imports:

```typescript
// Lazy load SDK
const { GlinClient } = await import('@glin-ai/sdk');

const client = await GlinClient.connect('wss://testnet.glin.ai');
```

### Connection Pooling

Reuse client connections:

```typescript
// utils/glin.ts
let client: GlinClient | null = null;

export async function getClient() {
  if (!client) {
    client = await GlinClient.connect('wss://testnet.glin.ai');
  }
  return client;
}

// Usage
import { getClient } from './utils/glin';

const client = await getClient();
```

## Development Tools

### VS Code Extensions

Recommended extensions:
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Built-in TS support
- **Error Lens** - Inline error display

### Debug Configuration

```json title=".vscode/launch.json"
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug GLIN App",
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## Testing

### Unit Tests (Vitest)

```bash
npm install -D vitest
```

```typescript title="tests/glin.test.ts"
import { describe, it, expect } from 'vitest';
import { GlinClient } from '@glin-ai/sdk';

describe('GLIN SDK', () => {
  it('should connect to network', async () => {
    const client = await GlinClient.connect('wss://testnet.glin.ai');
    expect(client).toBeDefined();

    const chain = await client.getChain();
    expect(chain).toContain('GLIN');
  });

  it('should query balance', async () => {
    const client = await GlinClient.connect('wss://testnet.glin.ai');
    const balance = await client.getBalance('5GrwvaEF...');
    expect(balance.free).toBeGreaterThanOrEqual(0);
  });
});
```

## Troubleshooting

### "Module not found" Error

Make sure the SDK is installed:
```bash
npm install @glin-ai/sdk
rm -rf node_modules package-lock.json
npm install
```

### WebSocket Connection Failed

1. Check network endpoint is correct
2. Verify firewall allows WebSocket connections
3. Try different RPC endpoint

### Type Errors

Update TypeScript and SDK to latest versions:
```bash
npm install -D typescript@latest
npm install @glin-ai/sdk@latest
```

## Next Steps

- 📖 [Browser Extension Integration](/docs/sdk/typescript/browser-extensions)
- ⚛️ [React Integration Guide](/docs/sdk/typescript/react-integration)
- 📚 [API Reference](/docs/sdk/typescript/api-reference)
- 💡 [Examples](/docs/sdk/typescript/examples)

---

Need help? [Join our Discord](https://discord.gg/glin-ai) or [check examples](/docs/sdk/typescript/examples).
