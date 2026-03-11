# PAS — Private Agent Shell

> Privacy infrastructure for autonomous AI agents on EVM chains.

---

## Project Overview

| Field | Value |
|---|---|
| **Monorepo** | npm workspaces + Turborepo |
| **Build** | tsup (ESM + CJS + DTS) |
| **Test** | Vitest |
| **Lint** | Biome |
| **Node** | v24.11.1 |
| **Package Manager** | npm@11.6.2 |
| **Versioning** | Changesets |

---

## Package Map

```
pas/
├── packages/
│   ├── types/              @pas/types          — shared type definitions
│   ├── core/               @pas/core           — privacy engine, policy, sessions, treasury, stealth addresses
│   ├── storage-sqlite/     @pas/storage-sqlite — SQLite persistence for core modules
│   ├── contracts/          @pas/contracts      — Solidity smart contracts (Hardhat)
│   ├── sdk/                @pas/sdk            — universal privacy interface for agents
│   ├── settlement/         @pas/settlement     — L1/L2 providers and gasless relay
│   ├── mcp-server/         @pas/mcp-server     — MCP server exposing privacy tools
│   ├── adapters/
│   │   ├── aztec/          @pas/adapter-aztec     — Aztec private smart contracts
│   │   ├── ethereum/       @pas/adapter-ethereum  — native Ethereum privacy
│   │   └── railgun/        @pas/adapter-railgun   — shielded ERC-20 via ZK-SNARKs
│   └── agent-adapters/
│       ├── crewai/         @pas/agent-crewai      — CrewAI tool wrappers
│       └── langchain/      @pas/agent-langchain   — LangChain tool wrappers
├── apps/
│   └── docs/               @pas/docs           — Docusaurus documentation site
└── packages/config/
    ├── biome-config/       @pas/biome-config   — shared Biome config
    └── tsconfig/           @pas/tsconfig       — shared TS config
```

**15 packages total** — 12 libraries, 2 config packages, 1 docs app.

---

## Dependency Graph

```
@pas/types
 ├─▶ @pas/core (+@noble/curves, @noble/hashes)
 │    └─▶ @pas/sdk
 │         ├─▶ @pas/mcp-server (+@modelcontextprotocol/sdk, zod)
 │         ├─▶ @pas/agent-crewai
 │         └─▶ @pas/agent-langchain (+@langchain/core peer)
 ├─▶ @pas/storage-sqlite (+better-sqlite3)
 ├─▶ @pas/contracts (+hardhat, @openzeppelin/contracts, snarkjs, circomlib, poseidon-solidity) — Hardhat + Circom
 ├─▶ @pas/settlement
 ├─▶ @pas/adapter-aztec
 ├─▶ @pas/adapter-ethereum
 └─▶ @pas/adapter-railgun
```

---

## What's Been Built

### ✅ Phase 0 — Scaffolding (Complete)
- [x] Monorepo structure with npm workspaces + Turborepo
- [x] All 13 packages scaffolded with tsup builds
- [x] Shared config (biome, tsconfig)
- [x] Full type system across 9 modules (@pas/types)
- [x] Docusaurus docs site (has broken link issue on `/` homepage)
- [x] All 10 library packages build clean (ESM + CJS + DTS)
- [x] Pitch deck (PAS-Overview.pptx) — 9-slide dark-themed deck

### ✅ Phase 1 — Core Infrastructure (Complete)

Four foundational modules implemented with full test coverage:

| Module | File | Tests | Description |
|---|---|---|---|
| **Policy Engine** | `core/src/policy/policy-engine.ts` | 20 | Spend limits (per-tx + cumulative with time windows), time-bound rules with timezone support, whitelist/denylist, chain restrictions, priority-ordered evaluation |
| **Session Manager** | `core/src/session/session-manager.ts` | 13 | Session lifecycle (create → active → expired/terminated), auto-expiry on access, cleanup of stale sessions |
| **Shielded Treasury** | `core/src/treasury/shielded-treasury.ts` | 19 | UTXO note management, nullifier-based double-spend prevention, greedy UTXO selection, multi-token balances, filtered history with timestamps |
| **Stealth Addresses** | `core/src/identity/address-derivation.ts` | 13 | ERC-5564 ECDH stealth address generation, viewTag fast-scan filter, round-trip generate→scan verification, secp256k1 point arithmetic |

**Test results:** 4 suites, 65 tests, all passing.

**Key design decisions:**
- Constructor-injected storage adapters: in-memory by default, SQLite opt-in
- Custom UUID generator to avoid node:crypto dependency (keeps library platform-agnostic)
- @noble/curves + @noble/hashes for pure-JS cryptography (no native bindings)
- Case-insensitive address matching throughout
- PASResult<T> pattern for all fallible operations

### ✅ Phase 2 — Persistence Layer (Complete)

Storage abstraction with constructor injection — zero breaking changes to existing code.

| Component | Description |
|---|---|
| **Storage interfaces** | `TreasuryStore`, `PolicyStore`, `SessionStore` added to @pas/types |
| **InMemory stores** | `InMemoryTreasuryStore`, `InMemoryPolicyStore`, `InMemorySessionStore` in @pas/core — extracted from original Map/Set logic |
| **SQLite stores** | `SqliteTreasuryStore`, `SqlitePolicyStore`, `SqliteSessionStore` in @pas/storage-sqlite (new package) |
| **Factory** | `createSqliteStores(dbPath)` — WAL mode, single DB file, returns all 3 stores |
| **Engine wiring** | `PASEngineConfig.stores?` passes adapters through to module constructors |

**Architecture:** Interfaces in @pas/types → InMemory impl in @pas/core (default) → SQLite impl in @pas/storage-sqlite (opt-in). Core has no SQLite dependency.

**SQLite details:**
- 8 tables across 3 stores (5 treasury, 2 policy, 1 sessions)
- bigint stored as decimal TEXT for lossless round-tripping
- PolicyRule union serialized as JSON with `{ $bigint: "..." }` tagged encoding
- Transactional `markSpent()` for atomic nullifier + commitment marking
- `:memory:` databases for test isolation

**Test results:** 41 new SQLite tests (4 suites) + 65 existing core tests unchanged = **106 total tests, all passing.**

### ✅ Phase 3 — Smart Contracts (Complete)

Solidity contracts for on-chain privacy operations, running on local Hardhat Network.

| Contract | File | Description |
|---|---|---|
| **ShieldedPool** | `contracts/contracts/ShieldedPool.sol` | Privacy pool with Poseidon Merkle tree (20 levels, ~1M deposits), ETH + ERC-20 deposits, Groth16 ZK proof verification for withdrawals |
| **StealthAnnouncer** | `contracts/contracts/StealthAnnouncer.sol` | ERC-5564 compliant announcement registry — pure event emission for off-chain scanning |
| **IncrementalMerkleTree** | `contracts/contracts/libraries/IncrementalMerkleTree.sol` | Gas-efficient Merkle tree library with Poseidon hashing, 30-root history buffer |
| **PoseidonHasher** | `contracts/contracts/libraries/PoseidonHasher.sol` | Thin wrapper around PoseidonT3 for 2-input Poseidon hashing |
| **Groth16Verifier** | `contracts/contracts/Groth16Verifier.sol` | Auto-generated Groth16 proof verifier (snarkjs) |
| **MockERC20** | `contracts/contracts/test/MockERC20.sol` | Test ERC-20 with public mint |

**Key features:**
- Deposit: insert commitment into Poseidon Merkle tree, emit `Deposit` event
- Withdraw: check nullifier not spent → verify Groth16 ZK proof → verify Merkle root → send funds
- Double-spend prevention via nullifier registry
- Root history buffer (30 roots) prevents race conditions between deposit and withdrawal
- Separate ETH (`deposit()`) and ERC-20 (`depositERC20()`) paths
- StealthAnnouncer matches ERC-5564 spec with schemeId indexing (1 = secp256k1 ECDH)
- ReentrancyGuard on all state-changing functions
- PoseidonT3 external library linking for gas-efficient on-chain hashing

### ✅ Phase 4 — ZK Circuits (Complete)

Circom circuits + Groth16 proving system for cryptographic withdrawal verification.

| Component | File | Description |
|---|---|---|
| **Withdraw Circuit** | `circuits/withdraw.circom` | Main depth-20 circuit: proves knowledge of (nullifier, secret) for a commitment in the Merkle tree |
| **Test Circuit** | `circuits/withdraw_test.circom` | Depth-5 variant for fast CI tests (~1,670 constraints) |
| **PoseidonMerkleTreeChecker** | in `withdraw.circom` | Custom Poseidon-based Merkle proof verifier template |
| **Groth16Verifier** | `contracts/Groth16Verifier.sol` | Auto-generated Solidity verifier from snarkjs |
| **PoseidonHasher** | `contracts/libraries/PoseidonHasher.sol` | Solidity Poseidon wrapper (matches circomlib exactly) |
| **Build Pipeline** | `scripts/build-circuits.ts` | Compiles circuits → R1CS → Groth16 setup → Solidity verifier |

**Circuit design (Tornado Cash pattern with Poseidon):**
- `commitment = Poseidon(nullifier, secret)` — hiding commitment
- `nullifierHash = Poseidon(nullifier)` — double-spend prevention
- Merkle proof via Poseidon-based tree checker
- Public inputs: `root`, `nullifierHash`, `recipient`, `amount`
- Anti-front-running: recipient + amount bound to proof (square constraint trick)

**Key migrations:**
- keccak256 → Poseidon throughout (contracts + off-chain helpers)
- Stubbed `_verifyProof()` → real Groth16 verification via deployed verifier contract
- `ShieldedPool` constructor now takes `IVerifier` address
- PoseidonT3 deployed as external library with Hardhat linking

**Tooling:**
- Circom 2.1.9 compiler (Windows binary)
- snarkjs for Groth16 prove/verify + Solidity verifier export
- circomlibjs for off-chain Poseidon matching circuit Poseidon
- poseidon-solidity for on-chain Poseidon matching circomlib constants
- Powers of Tau ceremony file (powersOfTau28_hez_final_14.ptau)

**Test infrastructure:**
- Off-chain `MerkleTree` class mirrors on-chain Poseidon tree exactly
- `generateWithdrawProof()` wraps snarkjs.groth16.fullProve()
- ABI-encoded proof bytes for contract interaction
- Root matching verified: off-chain tree roots === on-chain roots

**Test results:** 4 suites, 41 tests, all passing on local Hardhat Network.

**Total project tests: 147** (65 core + 41 SQLite + 41 contracts).

---

## What Still Needs to Be Built

### 🟡 Priority 1 — Core Functionality

#### 3. Railgun Adapter (real implementation)
- **Status:** Stub exists, no implementation
- **What:** Connect ShieldedTreasury to Railgun's on-chain shielded pool
- **Why:** Fastest path to real privacy — Railgun's UTXO model matches our treasury design
- **Scope:** @pas/adapter-railgun — implement PrivacyBackend interface with Railgun SDK calls

#### 4. ERC-5564 Announcement Indexer
- **Status:** Contract done (StealthAnnouncer.sol), indexer not started
- **What:** Off-chain event listener/indexer to scan StealthAnnouncer events
- **Why:** The contract emits events — need a scanner to match them against viewing keys
- **Scope:** Event listener in @pas/core or @pas/settlement that calls AddressDerivation.scanForPayments()

#### 5. Relayer Network
- **Status:** Not started
- **What:** Meta-transaction relay for stealth addresses
- **Why:** Stealth addresses can't pay gas without linking back to the sender
- **Approach:** ERC-2771 forwarder or custom relayer with fee deduction from shielded balance
- **Scope:** @pas/settlement — gasless relay provider

#### 6. Key Management
- **Status:** Raw hex strings passed directly
- **What:** Wallet provider integration (MetaMask Snaps, WalletConnect, hardware wallets)
- **Why:** Production agents can't hold raw private keys in memory
- **Scope:** @pas/sdk — wallet adapter interface

### 🟢 Priority 2 — Chain Adapters & Integration

#### 7. Ethereum L2 Adapter (real implementation)
- **Status:** Stub exists
- **What:** Target Arbitrum or Base — cheapest gas, most agent activity
- **Scope:** @pas/adapter-ethereum

#### 8. Aztec Adapter (real implementation)
- **Status:** Stub exists
- **What:** Aztec native private state execution
- **Why:** Deepest privacy guarantees but most complex integration
- **Scope:** @pas/adapter-aztec

#### 9. SDK Implementation
- **Status:** Stub exists
- **What:** Flesh out @pas/sdk as the universal developer-facing API
- **Why:** Agents interact through the SDK, not the core directly
- **Scope:** @pas/sdk — compose core modules into clean high-level operations

#### 10. MCP Server Implementation
- **Status:** Stub exists with @modelcontextprotocol/sdk dependency
- **What:** Expose privacy tools as MCP resources/tools for any MCP-compatible agent
- **Scope:** @pas/mcp-server

#### 11. Agent Adapter Implementations
- **Status:** Stubs exist
- **What:** CrewAI and LangChain tool wrappers around the SDK
- **Scope:** @pas/agent-crewai, @pas/agent-langchain

### 🔵 Priority 3 — Verification & Launch Prep

#### 12. Statistical Unlinkability Tests
- **What:** Generate thousands of stealth addresses, run correlation analysis
- **Why:** Prove the crypto doesn't just work — prove it doesn't leak

#### 13. Integration Test Suite
- **What:** End-to-end on local Anvil fork: session → policy → stealth address → shield → transact → unshield
- **Why:** Prove the full stack works together, not just unit-level correctness

#### 14. Security Audit Prep
- **What:** Document invariants, fuzz contract edge cases, formal verification of circuits
- **Why:** Nothing goes to mainnet without third-party review

#### 15. Docs Site Fix & Expansion
- **What:** Fix the broken `/` homepage link in Docusaurus, write integration guides
- **Current issue:** `@pas/docs` build fails due to broken links on every page pointing to `/`

---

## Test Coverage

| Package | Suites | Tests | Status |
|---|---|---|---|
| @pas/core | 4 | 65 | ✅ All passing |
| @pas/storage-sqlite | 4 | 41 | ✅ All passing |
| @pas/contracts | 4 | 41 | ✅ All passing (Hardhat/Mocha + Groth16 proofs) |
| @pas/sdk | 0 | 0 | ⬜ No tests yet |
| @pas/settlement | 0 | 0 | ⬜ No tests yet |
| @pas/mcp-server | 0 | 0 | ⬜ No tests yet |
| @pas/adapter-* | 0 | 0 | ⬜ No tests yet |
| @pas/agent-* | 0 | 0 | ⬜ No tests yet |

---

## Build Status

| Package | Build | Notes |
|---|---|---|
| @pas/types | ✅ | |
| @pas/core | ✅ | ESM 19.5KB, CJS 20.0KB |
| @pas/storage-sqlite | ✅ | ESM 10.3KB, CJS 10.6KB |
| @pas/sdk | ✅ | Stub |
| @pas/settlement | ✅ | Stub |
| @pas/mcp-server | ✅ | Stub |
| @pas/adapter-aztec | ✅ | Stub |
| @pas/adapter-ethereum | ✅ | Stub |
| @pas/contracts | ✅ | Hardhat compile — 5 contracts + PoseidonT3 library, 0 warnings |
| @pas/adapter-railgun | ✅ | Stub |
| @pas/agent-crewai | ✅ | Stub |
| @pas/agent-langchain | ✅ | Stub |
| @pas/docs | ❌ | Broken links to `/` on all pages |

---

## Chain Strategy

| Chain | Adapter | Priority | Rationale |
|---|---|---|---|
| **Ethereum L2** (Arbitrum/Base) | @pas/adapter-ethereum | 1st | Cheapest gas, fastest iteration, most agent activity |
| **Railgun** (Ethereum overlay) | @pas/adapter-railgun | 2nd | UTXO model matches our treasury, existing privacy infra |
| **Aztec** (ZK-rollup) | @pas/adapter-aztec | 3rd | Native private execution, deeper guarantees, more complex |

---

## Environment Notes

- pnpm unavailable in Git Bash PATH — use npm workspaces
- `packageManager` field required by Turbo — set to `npm@11.6.2`
- npm doesn't support `workspace:*` — use `"*"` for workspace deps
- Shared devDeps (tsup, vitest, typescript) in root only — npm hoisting resolves them
- `composite: true` in tsconfig breaks tsup DTS — removed from library.json
- No `@types/node` — library stays platform-agnostic (custom UUID, no node:crypto)

---

## Quick Commands

```bash
npm run build              # Build all packages
npm run test               # Run all tests
npm run dev                # Watch mode
npm run lint               # Biome lint check
npm run format             # Biome format

# Scoped
npx turbo run build --filter=@pas/core
npx turbo run test --filter=@pas/core
cd packages/core && npx vitest run

# Contracts
cd packages/contracts && npx hardhat compile
cd packages/contracts && npx hardhat test
cd packages/contracts && npx hardhat run scripts/deploy-local.ts

# ZK Circuits
cd packages/contracts && npm run circuits:build
```

---

*Last updated: 2026-03-10 — Phase 4 (ZK Circuits) complete*
