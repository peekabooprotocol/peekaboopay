---
sidebar_position: 4
---

# Core Engine

Privacy orchestration and state management.

## Modules

- **Shielded Treasury** — UTXO-based private balance management with multi-token support
- **Address Derivation** — Stealth addresses per transaction via ECDH. No address reuse.
- **Credential Vault** — ZK-provable credentials for reputation, compliance, and capabilities
- **Session Manager** — Scoped privacy contexts per task with automatic cleanup

## Package

`@pas/core` — provides `PASEngine` which orchestrates all four modules.
