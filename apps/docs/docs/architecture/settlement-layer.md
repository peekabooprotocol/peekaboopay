---
sidebar_position: 2
---

# Settlement Layer

The bottom layer where proofs land and value moves.

## Components

- **Ethereum L1** — Final settlement, shielded pool contracts, proof verification
- **L2 / Rollups** — Base, Arbitrum, Optimism for cheaper agent-to-agent payments
- **Relay Network** — Gasless submission so agents don't need ETH for gas

## Package

`@peekaboopay/settlement` — provides `EthereumL1Provider`, `RelayClient`, and chain registry.
