# GLIN Documentation Architecture Plan

**Created:** October 2025
**Status:** ✅ Structure Implemented | 🚧 Content Placeholder

---

## Overview

This document outlines the comprehensive documentation architecture for GLIN Network, following a unified docs approach where all technical documentation lives under `docs.glin.ai`.

## Design Philosophy

### Why Unified Docs?

1. **GLIN is an AI Blockchain** - Users need to understand blockchain + AI together
2. **Seamless Cross-References** - Easy linking between SDK, Network, and AI docs
3. **Single Search Experience** - One search bar for all GLIN documentation
4. **Better SEO** - Unified domain authority
5. **Easier Maintenance** - One docs site, one deployment pipeline

### Architecture Decision: Unified vs Separate

| Component | Location | Reasoning |
|-----------|----------|-----------|
| **Network Docs** | docs.glin.ai/network | Core infrastructure - part of main docs |
| **SDK Docs** | docs.glin.ai/sdk | Developer tools for building on GLIN |
| **Federated Learning** | docs.glin.ai/federated-learning | **Main product** - AI marketplace is GLIN's core value |
| **Tools (Forge)** | glinforge.com | Separate product - dev framework (like Hardhat) |
| **Blockchain Deep Dive** | docs.glin.ai/blockchain | Technical blockchain details for validators |

---

## Directory Structure

```
docs.glin.ai/
├── network/                      ✅ CREATED (Placeholder)
│   ├── intro.md                 "GLIN Network overview"
│   ├── getting-started.md       "Run a node, connect to testnet"
│   ├── validators.md            "Become a validator"
│   └── tokenomics.md            "Token economics, staking"
│
├── sdk/                         ✅ COMPLETED
│   ├── intro.md
│   ├── getting-started/
│   ├── core-concepts/
│   │   ├── architecture.md
│   │   ├── authentication.mdx
│   │   ├── accounts.mdx
│   │   ├── transactions.mdx
│   │   └── events.md
│   ├── contracts/
│   │   ├── deploying.md
│   │   ├── calling-methods.md
│   │   ├── querying-state.md
│   │   └── metadata.md
│   ├── typescript/
│   │   ├── setup.md
│   │   ├── browser-extensions.md
│   │   ├── react-integration.md
│   │   ├── api-reference.md
│   │   └── examples.md
│   ├── rust/
│   │   ├── setup.md
│   │   ├── cli-tools.md
│   │   ├── async-patterns.md
│   │   ├── api-reference.md
│   │   └── examples.md
│   └── examples/
│       ├── sign-in-with-glin.md     ✅ Complete
│       ├── deploy-contract.md       ✅ Complete
│       ├── build-indexer.md         ✅ Complete
│       └── create-cli-tool.md       ✅ Complete
│
├── federated-learning/          ✅ CREATED (Placeholder)
│   ├── intro.md                 "What is federated learning on GLIN"
│   ├── getting-started/
│   │   ├── create-task.md       "Create training tasks"
│   │   ├── train-model.md       "Join tasks as provider"
│   │   └── deploy-model.md      "Deploy trained models"
│   ├── concepts/
│   │   ├── tasks.md             "Task lifecycle and management"
│   │   ├── gradients.md         "Computing and submitting gradients"
│   │   ├── aggregation.md       "How gradients are combined"
│   │   └── rewards.md           "Token rewards and incentives"
│   ├── api-reference.md         "Complete API docs"
│   └── examples/
│       ├── image-classification.md
│       ├── nlp-training.md
│       └── federated-analytics.md
│
├── tools/                       ✅ CREATED
│   └── intro.md                 "Link to GLIN Forge + other tools"
│
└── blockchain/                  ✅ EXISTS (Legacy structure)
    ├── intro.md
    ├── node/
    ├── validators/
    └── architecture/
```

---

## Package Naming Strategy

### Current Packages

```
@glin-ai/sdk          ← TypeScript SDK (published)
glin-client           ← Rust SDK (published)
```

### Proposed Packages

```
# Federated Learning
@glin-ai/federated    ← NEW: Federated learning client (TypeScript)
@glin-ai/training     ← Alternative name option
glin-federated        ← Rust federated learning client

# Development Tools
@glin-forge/cli       ← GLIN Forge CLI (separate ecosystem)
@glin-forge/core      ← Forge core library
@glin-forge/plugins   ← Plugin system
```

**Rationale:** Keep AI marketplace under `@glin-ai/*` scope to maintain brand consistency. Forge gets its own scope as a separate product.

---

## Navigation Structure

### Top-Level Navigation

```
docs.glin.ai

Navbar (Left):
┌─────────┬─────┬──────────────────────┬───────┬────────────┐
│ Network │ SDK │ Federated Learning   │ Tools │ Blockchain │
└─────────┴─────┴──────────────────────┴───────┴────────────┘

Navbar (Right):
┌─────────┬────────┐
│ Website │ GitHub │
└─────────┴────────┘
```

### User Journeys

**1. App Developer** (wants to integrate GLIN)
```
1. Land on: docs.glin.ai/sdk/intro
2. Follow: SDK → TypeScript/Rust → Examples
3. Reference: Core Concepts as needed
```

**2. ML Engineer** (wants to train models)
```
1. Land on: docs.glin.ai/federated-learning/intro
2. Follow: Getting Started → Create Task
3. Cross-ref: SDK docs for on-chain integration
```

**3. Node Operator** (wants to run validator)
```
1. Land on: docs.glin.ai/network/intro
2. Follow: Getting Started → Validators
3. Reference: Tokenomics for rewards
```

**4. Smart Contract Developer** (wants to use Forge)
```
1. External site: glinforge.com
2. Links back to: docs.glin.ai/sdk for on-chain APIs
```

---

## Content Status & Priorities

### ✅ Completed (Ready for Production)

| Section | Files | Status |
|---------|-------|--------|
| SDK Core | 9 files | Production-ready docs |
| SDK Examples | 4 files | Complete working examples |
| Contract Guides | 4 files | Full TypeScript/Rust examples |

### 🚧 Created (Placeholder)

| Section | Files | Next Action |
|---------|-------|-------------|
| Network | 4 files | Fill when network launches |
| Federated Learning | 11 files | Fill when AI package is ready |
| Tools | 1 file | Update when Forge launches |

### 📋 To Do (Future)

| Priority | Section | Description |
|----------|---------|-------------|
| P1 | Network Docs | When mainnet/testnet ready |
| P1 | FL Getting Started | When `@glin-ai/federated` published |
| P2 | FL Examples | After core FL docs complete |
| P3 | Advanced Guides | Based on user feedback |

---

## Cross-Referencing Strategy

### Internal Links (Within docs.glin.ai)

**From Federated Learning → SDK:**
```markdown
Tasks are stored on-chain. Learn more about
[on-chain storage](/docs/sdk/core-concepts/architecture).
```

**From SDK → Federated Learning:**
```markdown
Build AI applications with GLIN. See
[Federated Learning docs](/docs/federated-learning/intro).
```

**From Network → SDK:**
```markdown
Integrate with GLIN Network using our
[TypeScript SDK](/docs/sdk/typescript/setup).
```

### External Links (To glinforge.com)

**From docs.glin.ai/tools:**
```markdown
🔗 **[Visit GLIN Forge Documentation →](https://glinforge.com)**

Smart contract development framework for GLIN Network.
```

**From glinforge.com → docs.glin.ai:**
```markdown
Forge uses the [GLIN SDK](https://docs.glin.ai/sdk)
under the hood for on-chain interactions.
```

---

## Deployment Strategy

### Current Setup

- **Repository:** github.com/glin-ai/glin-docs
- **Platform:** Vercel
- **Auto-deploy:** ✅ Enabled on `main` branch
- **Domain:** docs.glin.ai

### Build Process

```bash
npm run build           # Docusaurus build
vercel --prod          # Deploy to production
```

### CI/CD Pipeline

```yaml
# Automatic on push to main
1. GitHub push → main
2. Vercel detects change
3. npm run build
4. Deploy to docs.glin.ai
5. Purge CDN cache
```

---

## SEO & Discovery

### Domain Strategy

| Domain | Purpose | Status |
|--------|---------|--------|
| `glin.ai` | Marketing site | Live |
| `docs.glin.ai` | All technical docs | Live |
| `app.glin.ai` | AI marketplace UI | Future |
| `train.glin.ai` | Training dashboard | Future |
| `glinforge.com` | Dev framework | Planned |
| `explorer.glin.ai` | Block explorer | Planned |

### Search Optimization

**Algolia DocSearch** (Future):
```json
{
  "index_name": "glin",
  "start_urls": [
    "https://docs.glin.ai/network",
    "https://docs.glin.ai/sdk",
    "https://docs.glin.ai/federated-learning",
    "https://docs.glin.ai/tools"
  ]
}
```

---

## Content Guidelines

### Writing Style

- **Concise:** Get to the point quickly
- **Practical:** Show working code examples
- **Both languages:** TypeScript AND Rust examples
- **Cross-link:** Reference related concepts
- **Production-ready:** Copy-paste code that works

### Code Examples

```typescript
// ✅ Good: Complete, runnable example
import { GlinClient } from '@glin-ai/sdk';

const client = await GlinClient.connect('wss://testnet.glin.ai');
const balance = await client.getBalance(address);
console.log(`Balance: ${balance.free} GLIN`);
```

```typescript
// ❌ Bad: Incomplete, missing context
const balance = await getBalance();
```

### Example Structure Template

```markdown
# Example: [Feature Name]

Brief description of what you'll build.

## What You'll Build
- Feature 1
- Feature 2

## Prerequisites
- Requirement 1
- Requirement 2

## Implementation

### TypeScript
[Complete code]

### Rust
[Complete code]

## Usage
[How to run it]

## Next Steps
- Link to related docs
```

---

## Future Enhancements

### Phase 1: Current (✅ Done)
- ✅ SDK documentation
- ✅ Core examples
- ✅ Structure for Network/FL/Tools

### Phase 2: Network Launch
- [ ] Network getting-started guide
- [ ] Validator setup tutorial
- [ ] Tokenomics deep-dive

### Phase 3: FL Package Launch
- [ ] Getting Started: Create Task
- [ ] Getting Started: Train Model
- [ ] Getting Started: Deploy Model
- [ ] Example: Image Classification
- [ ] API Reference (auto-generated)

### Phase 4: Community Driven
- [ ] FAQ based on Discord questions
- [ ] Troubleshooting guides
- [ ] Video tutorials
- [ ] Interactive playground (if feasible)

---

## Reference Comparisons

### Similar Projects

| Project | Architecture | Reasoning |
|---------|--------------|-----------|
| **The Graph** | thegraph.com + docs.thegraph.com | Unified - indexing is the product |
| **Akash** | akash.network + docs.akash.network | Unified - cloud is the product |
| **Hardhat** | hardhat.org | Separate - it's a dev tool |
| **Foundry** | getfoundry.sh | Separate - it's a dev tool |

**GLIN follows:** The Graph/Akash model (unified) because **federated learning IS GLIN**, not a side tool.

**GLIN Forge follows:** Hardhat/Foundry model (separate) because it's **developer tooling**, not the core product.

---

## Maintenance Plan

### Regular Updates

- **Weekly:** Check for broken links
- **Monthly:** Review user feedback from Discord
- **Quarterly:** Major version updates
- **As needed:** New features, examples

### Version Management

```
docs.glin.ai/v1.0/...   ← Versioned docs (future)
docs.glin.ai/latest/... ← Always current
```

Currently using **single version** (latest). Add versioning when breaking changes occur.

---

## Questions to Answer Before Filling Placeholders

### Network Docs
1. What's the mainnet/testnet launch timeline?
2. What are the hardware requirements for nodes?
3. What's the minimum stake for validators?
4. What's the tokenomics model?

### Federated Learning Docs
1. What's the package name? (`@glin-ai/federated`?)
2. What ML frameworks are supported? (TensorFlow, PyTorch?)
3. How is gradient encryption handled?
4. What's the reward calculation formula?
5. When is the AI marketplace launching?

### Tools
1. When is GLIN Forge launching?
2. What features will it have at launch?
3. Will there be other dev tools?

---

## Contact & Collaboration

**Documentation Team:**
- Technical Lead: TBD
- Contributors: Community-driven

**How to Contribute:**
```bash
git clone https://github.com/glin-ai/glin-docs
cd glin-docs
npm install
npm run start       # Local dev server
# Make changes
# Submit PR
```

**Reporting Issues:**
- GitHub Issues: github.com/glin-ai/glin-docs/issues
- Discord: discord.gg/glin-ai
- Email: docs@glin.ai

---

## Success Metrics

### Goals
- [ ] 90% of user questions answered by docs
- [ ] < 5% bounce rate on getting-started pages
- [ ] Average time-to-first-transaction < 10 minutes
- [ ] Community contributions: 5+ PRs per quarter

### Tracking
- Google Analytics on docs.glin.ai
- Discord feedback channel
- GitHub issue labels for docs improvements

---

**Last Updated:** October 2025
**Next Review:** When AI marketplace launches
