---
sidebar_position: 1
---

# Introduction

**PAS (Private Agent Shell)** is agent-agnostic privacy middleware for autonomous AI agents on Ethereum.

## What PAS Does

- **Shielded Transactions** — Agents pay, receive, swap, and bridge tokens without exposing balances, amounts, or counterparties on-chain.
- **ZK Credentials** — Agents prove reputation, compliance, and capabilities via zero-knowledge proofs without revealing underlying data.
- **Selective Disclosure** — Choose exactly what to reveal, to whom, and when.
- **Pluggable Backends** — Route through Railgun (now), Aztec (soon), or native Ethereum privacy (future).

## Quick Install

```bash
npm install @peekaboopay/sdk
```

```typescript
import { PASClient } from "@peekaboopay/sdk";

const pas = new PASClient(backend);
await pas.connect(config);
await pas.pay({ to: recipient, token: USDC, amount: 50n });
```

## Architecture

PAS is organized into 5 layers — see the [Architecture Overview](./architecture/overview) for the interactive diagram.
