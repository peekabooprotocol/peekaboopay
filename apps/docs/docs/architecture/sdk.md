---
sidebar_position: 5
---

# PAS SDK

The universal interface — `npm install @pas/sdk`.

## APIs

### Transaction API
- `pay()` — Shielded payment to any address
- `receive()` — Generate stealth receive address
- `swap()` — Private token swap
- `bridge()` — Cross-chain bridge with privacy

### Identity API
- `prove()` — Generate ZK proof for a credential
- `credential()` — Store a new credential
- `disclose()` — Selective attribute disclosure

### Policy API
- `setPolicy()` — Configure human-defined rules (spend limits, disclosure scopes, time bounds)

## Package

`@pas/sdk` — provides `PASClient` which composes the Core Engine with settlement and privacy adapters.
