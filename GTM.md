# Peek-a-boo — Go-to-Market Checklist

## Phase 1: Build Credibility Assets (Week 1)

- [ ] **Demo MCP agent** — Build a working Claude agent that uses `pas_pay` to buy compute privately. Record a 60-second video showing: install → connect → shield → pay → prove
- [ ] **GitHub README polish** — Add demo gif, badges (npm version, tests passing, license), architecture diagram, quick-start code block
- [ ] **Demo video/gif** for the website hero — show the full agent flow in action
- [ ] **Blog section** on peekaboo.finance — `/blog/` with launch article

## Phase 2: Content & Messaging (Week 1-2)

- [ ] **Launch article** — "Introducing Peek-a-boo: Agent-First Privacy for Web3" — what it is, why agents need privacy, how it works, deployed contracts, npm install
- [ ] **Technical tutorial** — "How to Give Your AI Agent Private Payments in 5 Minutes" — step-by-step with code, publish on Medium + peekaboo.finance/blog
- [ ] **Bittensor-specific article** — "Why Your TAO Payments Are Public and How to Fix It" — target miners/validators who don't realize their inference payments are visible
- [ ] **Twitter/X thread** — launch announcement with: problem → solution → demo → npm install → links
- [ ] **Comparison thread** — "Peek-a-boo vs Railgun vs Aztec vs Tornado Cash" — position as agent-first

## Phase 3: Community Outreach (Week 2-3)

### AI Agent Communities
- [ ] **Submit to Claude MCP marketplace** — get `@peekaboopay/mcp-server` listed
- [ ] **Post in LangChain Discord** — #showcase channel, show integration example
- [ ] **Post in CrewAI Discord** — same approach
- [ ] **Post in Anthropic Discord** — MCP tools channel
- [ ] **Post on r/LocalLLaMA** — "I built a privacy layer for AI agents"
- [ ] **Submit to Hacker News** — "Show HN: Privacy payments for AI agents via ZK-SNARKs"
- [ ] **Agent framework PRs** — contribute integration examples to LangChain/CrewAI repos

### Bittensor Community
- [ ] **Bittensor Discord** — introduce protocol in #general and #development channels
- [ ] **DM subnet operators** — identify top 10 subnets, reach out about stealth address integration
- [ ] **Taostats listing** — get listed in ecosystem/tools section
- [ ] **Bittensor Twitter/X** — engage with $TAO community, tag @opentensor
- [ ] **Propose subnet integration** — write a proposal for miners to opt into stealth payments
- [ ] **r/bittensor post** — "We deployed a privacy protocol on Bittensor EVM"

### Web3/DeFi Communities
- [ ] **DeFi Twitter/X** — engage with privacy-focused accounts, ZK community
- [ ] **x402 community** — post about the "shielded" scheme in x402 Discord/forums
- [ ] **Coinbase ecosystem** — x402 is theirs, reach out about listing the shielded scheme

## Phase 4: Partnerships & Integrations (Week 3-4)

- [ ] **Agent hosting platforms** — reach out to platforms that host autonomous agents (could pre-install peekaboopay)
- [ ] **Inference marketplaces** — any marketplace where agents buy compute (natural fit for private payments)
- [ ] **Wallet integrations** — reach out to Rabby, MetaMask Snaps for Bittensor EVM support
- [ ] **DEX/DeFi protocols on Bittensor** — partner with any DeFi building on chain 964
- [ ] **AI companies using agents** — companies that deploy agents at scale need payment privacy

## Phase 5: Metrics & Iteration (Ongoing)

- [ ] **Track** — npm downloads, GitHub stars, unique wallets connected, API keys generated, shield/unshield volume
- [ ] **Feedback loop** — Discord/Telegram for early users, collect pain points
- [ ] **Iterate** — based on what users actually need vs what we assumed

---

## Key Channels

| Channel | URL | Purpose |
|---|---|---|
| Website | peekaboo.finance | Marketing + docs |
| Dashboard | app.peekaboo.finance | Product |
| GitHub | github.com/peekabooprotocol/peekaboopay | Source + credibility |
| npm | npmjs.com/org/peekaboopay | Distribution |
| Twitter/X | TBD — create @peekaboopay | Announcements + community |
| Discord | TBD — create server | Support + community |

## Key Metrics to Track

| Metric | Source | Goal (30 days) |
|---|---|---|
| npm installs | npmjs.com | 500+ |
| GitHub stars | GitHub | 100+ |
| Wallets connected | Dashboard DB | 50+ |
| API keys generated | Dashboard DB | 25+ |
| Shield transactions | On-chain events | 10+ |
| Twitter followers | X | 500+ |
| Discord members | Discord | 100+ |

---

*Created: 2026-04-07*
