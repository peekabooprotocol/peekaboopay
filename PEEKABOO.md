# Peek-a-boo

> Private payments for web3. Shield. Send. Prove.

**Website:** [peekaboo.finance](https://peekaboo.finance)

---

## What is Peek-a-boo?

Peek-a-boo is privacy infrastructure for web3 payments and AI agents. It provides shielded payments, stealth addresses, and zero-knowledge proof withdrawals across multiple EVM chains.

**Two audiences:**
- **Web3 users** — Private token payments on Ethereum, BSC, Polygon, Arbitrum (via Railgun)
- **Bittensor users** — Shielded TAO, anonymous miner participation, private inference routing (via Bittensor EVM)

---

## Project Overview

| Field | Value |
|---|---|
| **Monorepo** | npm workspaces + Turborepo |
| **Build** | tsup (ESM + CJS + DTS) |
| **Test** | Vitest + Hardhat/Mocha |
| **Lint** | Biome |
| **Node** | v24.11.1 |
| **Package Manager** | npm@11.6.2 |
| **Package Scope** | `@peekaboopay/*` |
| **Versioning** | Changesets |

---

## Package Map

```
peek-a-boo/
├── packages/
│   ├── types/              @peekaboopay/types            — shared type definitions
│   ├── core/               @peekaboopay/core             — privacy engine, policy, sessions, treasury, stealth
│   ├── crypto/             @peekaboopay/crypto           — Poseidon hashing, Merkle trees, Groth16 proofs
│   ├── storage-sqlite/     @peekaboopay/storage-sqlite   — SQLite persistence for core modules
│   ├── contracts/          @peekaboopay/contracts        — Solidity smart contracts (Hardhat)
│   ├── sdk/                @peekaboopay/sdk              — universal privacy interface for agents
│   ├── settlement/         @peekaboopay/settlement       — L1/L2 providers and gasless relay
│   ├── mcp-server/         @peekaboopay/mcp-server       — MCP server exposing privacy tools
│   ├── x402/               @peekaboopay/x402             — x402 "shielded" payment scheme
│   ├── adapters/
│   │   ├── aztec/          @peekaboopay/adapter-aztec      — Aztec private smart contracts
│   │   ├── ethereum/       @peekaboopay/adapter-ethereum   — native Ethereum privacy
│   │   ├── railgun/        @peekaboopay/adapter-railgun    — shielded ERC-20 via ZK-SNARKs
│   │   └── bittensor/      @peekaboopay/adapter-bittensor  — Bittensor Subtensor EVM
│   └── agent-adapters/
│       ├── crewai/         @peekaboopay/agent-crewai       — CrewAI tool wrappers
│       └── langchain/      @peekaboopay/agent-langchain    — LangChain tool wrappers
├── apps/
│   ├── web/                Landing page + /bittensor/ + /docs/ (Vercel)
│   └── docs/               Docusaurus documentation site
└── packages/config/
    ├── biome-config/       @peekaboopay/biome-config     — shared Biome config
    └── tsconfig/           @peekaboopay/tsconfig         — shared TS config
```

**18 packages total** — 15 libraries, 2 config packages, 1 docs app.

---

## Deployed Contracts (Bittensor EVM Mainnet, Chain 964)

| Contract | Address |
|---|---|
| **PoseidonT3** | `0x389B7E7d332d83157a580ead27884aa0CAB14815` |
| **Groth16Verifier** | `0x0CD5A7D426ED71D8d1e216FEEADBC2F6574D053D` |
| **ShieldedPool** | `0xaf2443B3bFc7D4cbD0e58fA175876fF51f7097f59` |
| **StealthAnnouncer** | `0xF6b3223aC0107e2bd64A982e0212C0b0751c269B` |

Deployer: `0x14d119BEFf4A5dE286C3e4DC5F8C8fc8783f300f`
Tree depth: 20 (max 1,048,576 deposits)

---

## Test Coverage

| Package | Tests | Status |
|---|---|---|
| @peekaboopay/core | 65 | ✅ |
| @peekaboopay/storage-sqlite | 41 | ✅ |
| @peekaboopay/contracts | 41 | ✅ |
| @peekaboopay/adapter-railgun | 74 | ✅ |
| @peekaboopay/adapter-bittensor | 40 | ✅ |
| @peekaboopay/x402 | 21 | ✅ |
| **Total** | **282** | **All passing** |

---

## Chain Support

| Chain | Adapter | Status |
|---|---|---|
| **Bittensor EVM** (964) | @peekaboopay/adapter-bittensor | ✅ Wired to mainnet contracts |
| **Ethereum** (1) | @peekaboopay/adapter-railgun | ✅ Wired to Railgun SDK |
| **BSC** (56) | @peekaboopay/adapter-railgun | ✅ Wired to Railgun SDK |
| **Polygon** (137) | @peekaboopay/adapter-railgun | ✅ Wired to Railgun SDK |
| **Arbitrum** (42161) | @peekaboopay/adapter-railgun | ✅ Wired to Railgun SDK |
| **Ethereum L2** | @peekaboopay/adapter-ethereum | ⬜ Stub |
| **Aztec** | @peekaboopay/adapter-aztec | ⬜ Stub |

---

## Key Features

### Privacy Engine (@peekaboopay/core)
- **Policy Engine** — Spend limits (per-tx + cumulative), time bounds, whitelist/denylist, chain restrictions
- **Session Manager** — Scoped agent sessions with auto-expiry and lifecycle management
- **Shielded Treasury** — UTXO note management, nullifier-based double-spend prevention
- **Stealth Addresses** — ERC-5564 ECDH, viewTag fast-scan, one-time addresses

### Smart Contracts (@peekaboopay/contracts)
- **ShieldedPool** — Poseidon Merkle tree (20 levels), Groth16 ZK withdrawal verification
- **StealthAnnouncer** — ERC-5564 announcement registry for stealth address discovery
- **Groth16Verifier** — Auto-generated Solidity verifier from snarkjs

### ZK Circuits
- Circom withdraw circuit — proves knowledge of (nullifier, secret) for a Merkle leaf
- Poseidon hashing throughout (replaces keccak256 for ZK efficiency)
- Anti-front-running: recipient + amount bound to proof via square constraint

### x402 Integration (@peekaboopay/x402)
- **"shielded" x402 scheme** — private HTTP-native payments via ZK proofs + stealth addresses
- `createShieldedFetch()` — wraps fetch to auto-handle 402 → shielded payment → retry
- `shieldedPaymentMiddleware()` — gates Express/Hono routes behind shielded payments
- Verification via StealthAnnouncer event scanning + nullifier replay prevention

### Cryptographic Library (@peekaboopay/crypto)
- Poseidon hashing (circomlibjs)
- Incremental Merkle tree (matches on-chain tree exactly)
- Groth16 proof generation/verification (snarkjs)
- Pure JS — @noble/curves, @noble/hashes, no native bindings

---

## Quick Commands

```bash
npm run build              # Build all packages
npm run test               # Run all tests
npm run dev                # Watch mode
npm run lint               # Biome lint check

# Scoped
npx turbo run build --filter=@peekaboopay/core
npx turbo run test --filter=@peekaboopay/adapter-bittensor

# Contracts
cd packages/contracts && npx hardhat compile
cd packages/contracts && npx hardhat test

# Deploy to Bittensor mainnet
$env:DEPLOYER_PRIVATE_KEY = "0x..."
cd packages/contracts
npx hardhat run scripts/deploy-local.ts --network bittensor
```

---

## What's Next

1. **Note encryption** — encrypt deposit notes with recipient's viewing key for cross-session recovery
2. **ERC-5564 Announcement Indexer** — off-chain scanner for stealth address events
3. **SDK + MCP Server** — flesh out developer-facing API and MCP tools
4. **Relayer network** — meta-transaction relay for stealth addresses (gas abstraction)
5. **Security audit prep** — invariant docs, contract fuzzing, formal verification

---

*Last updated: 2026-04-04 — Package scope renamed to @peekaboopay/\*. Website live at peekaboo.finance. x402 shielded scheme built. Railgun SDK wired. Bittensor mainnet contracts deployed. 282 tests passing.*
