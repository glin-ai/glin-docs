# Example: Sign in with GLIN

Complete working example of wallet-based authentication - "Sign in with GLIN".

## What You'll Build

A full-stack authentication system where users sign in with their GLIN wallet instead of passwords:

- 🔐 Frontend: Request signature from wallet
- 🔒 Backend: Verify signature and create session
- 👤 User profile with wallet address
- 🚪 Sign out functionality

## Prerequisites

- Node.js 18+
- GLIN wallet extension installed
- Next.js 14+ (or any React framework)

## Project Setup

```bash
npx create-next-app@latest glin-auth-demo
cd glin-auth-demo
npm install @glin-ai/sdk
npm install @polkadot/extension-dapp
```

## Frontend Implementation

### 1. Authentication Hook

Create a custom hook to manage auth state:

```typescript title="hooks/useGlinAuth.ts"
import { useState, useEffect } from 'react';
import { web3Enable, web3Accounts } from '@polkadot/extension-dapp';

interface User {
  address: string;
  sessionId: string;
}

export function useGlinAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const sessionId = localStorage.getItem('glin_session');
    const address = localStorage.getItem('glin_address');

    if (sessionId && address) {
      setUser({ address, sessionId });
    }

    setLoading(false);
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);

      // 1. Enable wallet extension
      const extensions = await web3Enable('GLIN Auth Demo');
      if (extensions.length === 0) {
        throw new Error('No wallet extension found. Please install GLIN wallet.');
      }

      // 2. Get accounts
      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }

      const account = accounts[0];
      const address = account.address;

      // 3. Create message to sign
      const message = createAuthMessage(address);

      // 4. Request signature from wallet
      const { signature } = await account.signer.signRaw({
        address,
        data: stringToHex(message),
        type: 'bytes'
      });

      // 5. Send to backend for verification
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature })
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const { sessionId } = await response.json();

      // 6. Save session
      localStorage.setItem('glin_session', sessionId);
      localStorage.setItem('glin_address', address);

      setUser({ address, sessionId });

    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('glin_session');
    localStorage.removeItem('glin_address');
    setUser(null);
  };

  return { user, loading, signIn, signOut };
}

function createAuthMessage(address: string): string {
  const nonce = Math.random().toString(36).substring(7);
  const timestamp = new Date().toISOString();

  return `Sign in to GLIN Auth Demo

Address: ${address}
Nonce: ${nonce}
Issued At: ${timestamp}`;
}

function stringToHex(str: string): string {
  return '0x' + Buffer.from(str, 'utf8').toString('hex');
}
```

### 2. Login Page

```typescript title="app/login/page.tsx"
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGlinAuth } from '@/hooks/useGlinAuth';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useGlinAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      await signIn();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8">
          Sign in with GLIN
        </h1>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Connecting...' : '🔐 Sign in with Wallet'}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Don't have a wallet?</p>
          <a
            href="https://wallet.glin.ai"
            target="_blank"
            className="text-purple-600 hover:underline"
          >
            Install GLIN Wallet →
          </a>
        </div>
      </div>
    </div>
  );
}
```

### 3. Dashboard (Protected Page)

```typescript title="app/dashboard/page.tsx"
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlinAuth } from '@/hooks/useGlinAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useGlinAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <button
              onClick={signOut}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-gray-600">Wallet Address</h2>
              <p className="mt-1 text-lg font-mono">{user.address}</p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-600">Session ID</h2>
              <p className="mt-1 text-sm font-mono text-gray-500">{user.sessionId}</p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-green-600">✅ Successfully authenticated with GLIN wallet!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Backend Implementation

### 1. API Route - Sign In

```typescript title="app/api/auth/signin/route.ts"
import { NextRequest, NextResponse } from 'next/server';
import { signatureVerify } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';

interface SignInRequest {
  address: string;
  message: string;
  signature: string;
}

export async function POST(req: NextRequest) {
  try {
    const { address, message, signature }: SignInRequest = await req.json();

    // 1. Verify the signature
    const isValid = verifySignature(address, message, signature);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 2. Create session
    const sessionId = generateSessionId();

    // In production, store session in database:
    // await db.sessions.create({
    //   id: sessionId,
    //   address,
    //   createdAt: new Date(),
    //   expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    // });

    // For demo, we'll just return the session ID
    console.log(`✅ User authenticated: ${address}`);
    console.log(`   Session ID: ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId,
      address
    });

  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

function verifySignature(address: string, message: string, signature: string): boolean {
  try {
    const messageHex = '0x' + Buffer.from(message, 'utf8').toString('hex');
    const messageU8a = hexToU8a(messageHex);
    const signatureU8a = hexToU8a(signature);

    const result = signatureVerify(messageU8a, signatureU8a, address);

    return result.isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}
```

### 2. Session Validation Middleware

```typescript title="lib/auth.ts"
import { NextRequest } from 'next/server';

export async function validateSession(req: NextRequest): Promise<string | null> {
  const sessionId = req.headers.get('x-session-id');

  if (!sessionId) {
    return null;
  }

  // In production, validate session from database:
  // const session = await db.sessions.findUnique({
  //   where: { id: sessionId }
  // });
  //
  // if (!session || session.expiresAt < new Date()) {
  //   return null;
  // }
  //
  // return session.address;

  // For demo, just return a mock address
  return '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
}
```

### 3. Protected API Example

```typescript title="app/api/user/profile/route.ts"
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const address = await validateSession(req);

  if (!address) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Return user profile
  return NextResponse.json({
    address,
    // Add more user data from your database
  });
}
```

## Production Enhancements

### 1. Database Schema (Prisma)

```prisma title="prisma/schema.prisma"
model Session {
  id        String   @id @default(cuid())
  address   String
  createdAt DateTime @default(now())
  expiresAt DateTime

  @@index([address])
}

model User {
  address   String   @id
  createdAt DateTime @default(now())
  lastLogin DateTime @updatedAt

  // Optional: Add user profile fields
  username  String?
  email     String?
}
```

### 2. Session Storage

```typescript title="lib/session.ts"
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createSession(address: string) {
  const sessionId = generateSecureId();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.session.create({
    data: {
      id: sessionId,
      address,
      expiresAt
    }
  });

  return sessionId;
}

export async function validateSession(sessionId: string): Promise<string | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId }
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.address;
}

export async function deleteSession(sessionId: string) {
  await prisma.session.delete({
    where: { id: sessionId }
  });
}

function generateSecureId(): string {
  return require('crypto').randomBytes(32).toString('hex');
}
```

### 3. Environment Variables

```bash title=".env.local"
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/glin_auth"

# GLIN Network
NEXT_PUBLIC_GLIN_RPC="wss://testnet.glin.ai"

# Session
SESSION_SECRET="your-secret-key-here"
SESSION_MAX_AGE=86400 # 24 hours
```

## Security Checklist

- [ ] ✅ Verify signatures on backend (never trust frontend)
- [ ] ✅ Use nonces in messages (prevent replay attacks)
- [ ] ✅ Set session expiration (24 hours recommended)
- [ ] ✅ Store sessions securely (database with encryption)
- [ ] ✅ Use HTTPS in production
- [ ] ✅ Implement rate limiting
- [ ] ✅ Add CSRF protection
- [ ] ✅ Clear sessions on sign out

## Testing

```typescript title="__tests__/auth.test.ts"
import { signatureVerify } from '@polkadot/util-crypto';

describe('GLIN Auth', () => {
  it('should verify valid signature', () => {
    const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const message = 'Sign in to GLIN';
    const signature = '0x...'; // Valid signature

    const result = signatureVerify(message, signature, address);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid signature', () => {
    const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const message = 'Sign in to GLIN';
    const signature = '0xinvalid';

    const result = signatureVerify(message, signature, address);
    expect(result.isValid).toBe(false);
  });
});
```

## Run the Example

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
open http://localhost:3000/login
```

## What's Next?

- 🔐 [Authentication Guide](/docs/sdk/core-concepts/authentication) - Learn the concepts
- 💰 [Accounts](/docs/sdk/core-concepts/accounts) - Manage accounts
- 📝 [Transactions](/docs/sdk/core-concepts/transactions) - Send transactions

---

Need help? [Join our Discord](https://discord.gg/glin-ai)
