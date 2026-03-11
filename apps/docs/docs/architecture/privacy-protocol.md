---
sidebar_position: 3
---

# Privacy Protocol Layer

Pluggable ZK backends — swap as infrastructure matures.

## Adapters

- **Railgun** (`@pas/adapter-railgun`) — Live today. Shielded ERC-20 via ZK-SNARKs on mainnet.
- **Aztec** (`@pas/adapter-aztec`) — Coming soon. Full programmable privacy with private smart contracts.
- **Ethereum Native** (`@pas/adapter-ethereum`) — Future. Native shielded ETH.

## Interface

All adapters implement the `PrivacyBackend` interface from `@pas/types`. The agent and SDK never know which backend is used.
