import { useState } from "react";

const LAYERS = [
  {
    id: "agents",
    label: "AGENT LAYER",
    subtitle: "Any framework, any model",
    color: "#22d3ee",
    bgColor: "rgba(34,211,238,0.06)",
    borderColor: "rgba(34,211,238,0.2)",
    components: [
      { name: "OpenClaw", desc: "Autonomous agents with browser, terminal, wallet access" },
      { name: "LangChain / CrewAI", desc: "Multi-agent orchestration frameworks" },
      { name: "AutoGen / Custom", desc: "Microsoft AutoGen, custom agent loops, any LLM" },
    ],
    detail: `The Agent Layer is fully decoupled from privacy logic. Agents interact with PAS through a standardized SDK — they never touch private keys, ZK circuits, or shielded pool mechanics directly. This means any agent framework can plug in with a single import. The SDK exposes simple methods like pas.pay(), pas.prove(), and pas.shield() that abstract all cryptographic complexity.`,
  },
  {
    id: "sdk",
    label: "PAS SDK",
    subtitle: "Universal interface — npm install @pas/sdk",
    color: "#a78bfa",
    bgColor: "rgba(167,139,250,0.06)",
    borderColor: "rgba(167,139,250,0.2)",
    components: [
      { name: "Transaction API", desc: "pay() · receive() · swap() · bridge() — all privacy-preserving" },
      { name: "Identity API", desc: "prove() · credential() · disclose() — selective ZK attestations" },
      { name: "Policy Engine", desc: "Human-defined rules: spend limits, disclosure scopes, time bounds" },
    ],
    detail: `The SDK is the single integration point. It's a TypeScript/JS package that wraps all PAS functionality into ergonomic async methods. Agents call pas.pay(recipient, amount, token) and the SDK handles shielding, proof generation, relay, and unshielding automatically. The Policy Engine enforces human-set constraints before any transaction executes — agents can request but never override policies.`,
  },
  {
    id: "core",
    label: "PAS CORE ENGINE",
    subtitle: "Privacy orchestration & state management",
    color: "#f472b6",
    bgColor: "rgba(244,114,182,0.06)",
    borderColor: "rgba(244,114,182,0.2)",
    components: [
      { name: "Shielded Treasury", desc: "UTXO-based private balance management, multi-token support" },
      { name: "Address Derivation", desc: "Stealth addresses per transaction — no address reuse ever" },
      { name: "Credential Vault", desc: "ZK-provable credentials: reputation, compliance, capability proofs" },
      { name: "Session Manager", desc: "Scoped privacy contexts per task with automatic cleanup" },
    ],
    detail: `The Core Engine is where privacy actually happens. The Shielded Treasury maintains encrypted UTXO state locally — the agent's true balance is never exposed on-chain. Address Derivation generates a fresh stealth address for every interaction using ECDH key exchange, making transaction graph analysis impossible. The Credential Vault stores ZK-provable attestations (e.g. "completed 500+ tasks", "verified by auditor X") that agents can selectively reveal without linking to their real identity. Session Manager creates isolated privacy contexts per task — an agent doing a DeFi trade gets different privacy guarantees than one paying for an API call.`,
  },
  {
    id: "privacy",
    label: "PRIVACY PROTOCOL LAYER",
    subtitle: "Pluggable ZK backends — swap as infra matures",
    color: "#fb923c",
    bgColor: "rgba(251,146,60,0.06)",
    borderColor: "rgba(251,146,60,0.2)",
    components: [
      { name: "Railgun Adapter", desc: "Live today — shielded ERC-20 transfers via ZK-SNARKs on mainnet" },
      { name: "Aztec Adapter", desc: "Coming Q1 2026 — full programmable privacy, private smart contracts" },
      { name: "Ethereum L1 Adapter", desc: "Future — native shielded ETH when Strawmap's \"Private L1\" ships" },
    ],
    detail: `This layer is intentionally pluggable. Today, PAS routes through Railgun for mainnet privacy — it's battle-tested and works now. When Aztec's Alpha launches (Q1 2026), PAS can route higher-value or contract-interaction-heavy tasks through Aztec for programmable privacy with full smart contract support. Long-term, when Ethereum's Strawmap delivers "Private L1" with native shielded transfers, PAS can route directly through L1. The agent and SDK never know or care which backend is used — the adapter interface is standardized.`,
  },
  {
    id: "settlement",
    label: "SETTLEMENT LAYER",
    subtitle: "Where proofs land and value moves",
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.06)",
    borderColor: "rgba(74,222,128,0.2)",
    components: [
      { name: "Ethereum L1", desc: "Final settlement, shielded pool contracts, proof verification" },
      { name: "L2 / Rollups", desc: "Base, Arbitrum, Optimism — for cheaper agent-to-agent payments" },
      { name: "Relay Network", desc: "Gasless submission — agents don't need ETH for gas" },
    ],
    detail: `Settlement happens on Ethereum L1 or L2s depending on the transaction type and cost tolerance. The Relay Network is critical for agent UX — agents shouldn't need to hold ETH for gas. Relayers submit shielded transactions on the agent's behalf and are compensated from the shielded amount (similar to how Railgun relayers work today). This means an agent can operate with only stablecoins in its shielded treasury and never touch ETH directly.`,
  },
];

const OPENCLAW_INTEGRATION = {
  title: "OpenClaw Integration",
  flows: [
    {
      name: "ClawHub Skill Marketplace",
      steps: [
        "Agent discovers skill on ClawHub",
        "PAS generates stealth payment address",
        "Payment routed through shielded pool",
        "Skill publisher receives funds — no link to buyer",
        "Agent proves purchase via ZK receipt (no amount/identity leaked)",
      ],
      color: "#22d3ee",
    },
    {
      name: "Agent-to-Agent Commerce",
      steps: [
        "Agent A needs data from Agent B",
        "PAS establishes encrypted payment channel",
        "x402/b402 request with shielded payment attached",
        "Agent B fulfills request, receives from privacy pool",
        "Neither agent's balance or history is exposed",
      ],
      color: "#a78bfa",
    },
    {
      name: "Reputation & Credentials",
      steps: [
        "Agent completes tasks over time",
        "PAS Credential Vault accumulates provable stats",
        "Agent applies for premium skill access on ClawHub",
        "ZK proof: \"completed 500+ tasks with 98%+ success\"",
        "No task details, client names, or earnings revealed",
      ],
      color: "#f472b6",
    },
    {
      name: "Curated Skill Packs (Your Distribution Play)",
      steps: [
        "You curate privacy-audited skill packs for personas",
        "\"Solo Founder Pack\" — invoicing, outreach, code review",
        "Each skill purchase routed privately through PAS",
        "Bundle discount verified via ZK proof of pack ownership",
        "Revenue split handled in shielded pool — publishers paid privately",
      ],
      color: "#fb923c",
    },
  ],
};

const DATA_FLOW = [
  { from: "Human Owner", action: "Sets policies", to: "PAS Policy Engine", color: "#a78bfa" },
  { from: "Agent", action: "Calls pas.pay()", to: "PAS SDK", color: "#22d3ee" },
  { from: "PAS SDK", action: "Validates policy", to: "Policy Engine", color: "#a78bfa" },
  { from: "Policy Engine", action: "Approved →", to: "Core Engine", color: "#f472b6" },
  { from: "Core Engine", action: "Derives stealth addr", to: "Address Derivation", color: "#f472b6" },
  { from: "Core Engine", action: "Shields funds", to: "Privacy Protocol", color: "#fb923c" },
  { from: "Privacy Protocol", action: "Generates ZK proof", to: "Railgun / Aztec", color: "#fb923c" },
  { from: "Relay Network", action: "Submits tx (gasless)", to: "Ethereum", color: "#4ade80" },
  { from: "Recipient", action: "Receives from pool", to: "No link to sender", color: "#4ade80" },
];

export default function ArchitectureDiagram() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("architecture");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e2e2e8",
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      padding: "32px 24px",
      overflowX: "hidden",
    }}>
      {/* Header */}
      <div style={{ maxWidth: 900, margin: "0 auto 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#4ade80", boxShadow: "0 0 12px #4ade8088",
          }} />
          <span style={{ fontSize: 11, color: "#4ade80", letterSpacing: 3, textTransform: "uppercase" }}>
            Architecture Spec v0.1
          </span>
        </div>
        <h1 style={{
          fontSize: 32, fontWeight: 700, margin: "0 0 6px",
          background: "linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -0.5,
        }}>
          Private Agent Shell (PAS)
        </h1>
        <p style={{ fontSize: 14, color: "#888", margin: 0, lineHeight: 1.6 }}>
          Agent-agnostic privacy middleware for autonomous AI agents on Ethereum.
          <br />
          Shielded transactions · ZK credentials · Selective disclosure · Pluggable backends
        </p>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: 900, margin: "0 auto 32px", display: "flex", gap: 2 }}>
        {[
          { id: "architecture", label: "Stack" },
          { id: "flow", label: "Data Flow" },
          { id: "openclaw", label: "OpenClaw Integration" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 20px", fontSize: 12, fontFamily: "inherit",
              letterSpacing: 1, textTransform: "uppercase",
              border: "1px solid", borderColor: activeTab === tab.id ? "#a78bfa" : "#222",
              background: activeTab === tab.id ? "rgba(167,139,250,0.1)" : "transparent",
              color: activeTab === tab.id ? "#a78bfa" : "#666", cursor: "pointer",
              borderRadius: tab.id === "architecture" ? "6px 0 0 6px" : tab.id === "openclaw" ? "0 6px 6px 0" : 0,
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Architecture Tab */}
      {activeTab === "architecture" && (
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {LAYERS.map((layer, i) => (
            <div key={layer.id} style={{ marginBottom: 3 }}>
              {i > 0 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                  <div style={{
                    width: 1, height: 16,
                    background: `linear-gradient(${LAYERS[i - 1].color}, ${layer.color})`,
                    opacity: 0.3,
                  }} />
                </div>
              )}
              <div
                onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
                style={{
                  border: `1px solid ${activeLayer === layer.id ? layer.borderColor : "#1a1a24"}`,
                  borderRadius: 8, background: activeLayer === layer.id ? layer.bgColor : "#0e0e16",
                  cursor: "pointer", transition: "all 0.25s ease", overflow: "hidden",
                }}
              >
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: 2,
                        background: layer.color, boxShadow: `0 0 8px ${layer.color}44`,
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: layer.color }}>
                        {layer.label}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>{layer.subtitle}</span>
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: layer.components.length === 4 ? "1fr 1fr" : `repeat(${layer.components.length}, 1fr)`,
                    gap: 8,
                  }}>
                    {layer.components.map(comp => (
                      <div key={comp.name} style={{
                        padding: "10px 12px", borderRadius: 5,
                        background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a24",
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#ccc", marginBottom: 3 }}>{comp.name}</div>
                        <div style={{ fontSize: 10, color: "#666", lineHeight: 1.5 }}>{comp.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {activeLayer === layer.id && (
                  <div style={{ padding: "0 20px 16px", borderTop: `1px solid ${layer.borderColor}`, marginTop: 0 }}>
                    <p style={{ fontSize: 12, lineHeight: 1.8, color: "#999", margin: "14px 0 0" }}>{layer.detail}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 20, fontStyle: "italic" }}>
            Click any layer to expand technical details
          </p>
        </div>
      )}

      {/* Data Flow Tab */}
      {activeTab === "flow" && (
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ padding: "20px", border: "1px solid #1a1a24", borderRadius: 8, background: "#0e0e16", marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#a78bfa", fontWeight: 700, marginBottom: 16, textTransform: "uppercase" }}>
              Transaction Lifecycle — pas.pay()
            </div>
            {DATA_FLOW.map((step, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                marginBottom: i < DATA_FLOW.length - 1 ? 6 : 0,
                padding: "8px 12px", borderRadius: 5,
                background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: `1px solid ${step.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: step.color, flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 12, color: "#888", minWidth: 120 }}>{step.from}</span>
                <span style={{
                  fontSize: 10, color: step.color,
                  background: `${step.color}11`, padding: "3px 8px", borderRadius: 3, whiteSpace: "nowrap",
                }}>
                  {step.action}
                </span>
                <span style={{ fontSize: 10, color: "#555" }}>→</span>
                <span style={{ fontSize: 12, color: "#ccc" }}>{step.to}</span>
              </div>
            ))}
          </div>

          <div style={{
            padding: "16px 20px", border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: 8, background: "rgba(74,222,128,0.04)",
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#4ade80", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
              Key Principle
            </div>
            <p style={{ fontSize: 12, color: "#999", lineHeight: 1.8, margin: 0 }}>
              The agent never handles raw cryptography. It calls{" "}
              <code style={{ color: "#22d3ee", background: "#22d3ee11", padding: "2px 5px", borderRadius: 3 }}>
                pas.pay(recipient, amount, "USDC")
              </code>{" "}
              and the entire shielding → proof generation → relay → unshielding pipeline happens under the hood.
              The human's Policy Engine validates every action before it reaches the Core Engine.
            </p>
          </div>

          <div style={{
            marginTop: 16, padding: "16px 20px",
            border: "1px solid rgba(244,114,182,0.2)", borderRadius: 8, background: "rgba(244,114,182,0.04)",
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#f472b6", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>
              What's Hidden vs. What's Provable
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#f472b6", marginBottom: 6, fontWeight: 600 }}>HIDDEN (always)</div>
                {["Agent's true balance", "Transaction amounts", "Sender ↔ Recipient link", "Transaction history / patterns", "Which skills or APIs purchased", "Agent's identity across sessions"].map(item => (
                  <div key={item} style={{ fontSize: 11, color: "#777", padding: "3px 0", display: "flex", gap: 6 }}>
                    <span style={{ color: "#f472b688" }}>■</span> {item}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 6, fontWeight: 600 }}>PROVABLE (on demand)</div>
                {[
                  "\"Balance ≥ X\" without revealing actual balance",
                  "\"Completed N+ tasks\" without task details",
                  "\"Audited by X\" without revealing audit scope",
                  "\"Compliant with policy Y\" for regulators",
                  "\"Owns skill pack Z\" for marketplace access",
                  "\"Active for N months\" without linking history",
                ].map(item => (
                  <div key={item} style={{ fontSize: 11, color: "#777", padding: "3px 0", display: "flex", gap: 6 }}>
                    <span style={{ color: "#4ade8088" }}>■</span> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OpenClaw Integration Tab */}
      {activeTab === "openclaw" && (
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {OPENCLAW_INTEGRATION.flows.map((flow) => (
            <div key={flow.name} style={{
              marginBottom: 16, border: "1px solid #1a1a24",
              borderRadius: 8, background: "#0e0e16", overflow: "hidden",
            }}>
              <div style={{
                padding: "14px 20px", borderBottom: "1px solid #1a1a24",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: flow.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: flow.color }}>{flow.name}</span>
              </div>
              <div style={{ padding: "14px 20px" }}>
                {flow.steps.map((step, si) => (
                  <div key={si} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    marginBottom: si < flow.steps.length - 1 ? 8 : 0,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `1px solid ${flow.color}33`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: flow.color, flexShrink: 0, marginTop: 1,
                    }}>
                      {si + 1}
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: si === flow.steps.length - 1 ? "#ccc" : "#888",
                      lineHeight: 1.5,
                      fontWeight: si === flow.steps.length - 1 ? 500 : 400,
                    }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{
            padding: "16px 20px", border: "1px solid rgba(34,211,238,0.2)",
            borderRadius: 8, background: "rgba(34,211,238,0.04)", marginTop: 8,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#22d3ee", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>
              MCP Integration — Agent Agnostic by Design
            </div>
            <p style={{ fontSize: 12, color: "#999", lineHeight: 1.8, margin: "0 0 12px" }}>
              PAS exposes itself as an <strong style={{ color: "#ccc" }}>MCP (Model Context Protocol) server</strong>. Any agent
              that speaks MCP — OpenClaw, Claude, custom agents — can discover and use PAS tools automatically.
              No framework-specific adapters needed.
            </p>
            <div style={{
              background: "#0a0a0f", border: "1px solid #1a1a24", borderRadius: 5,
              padding: 14, fontSize: 11, lineHeight: 1.7, color: "#888",
              fontFamily: "'JetBrains Mono', monospace", overflowX: "auto",
            }}>
              <div style={{ color: "#555" }}>// Agent discovers PAS via MCP tool listing:</div>
              <div><span style={{ color: "#a78bfa" }}>pas:shielded_pay</span>     — Private payment to any address</div>
              <div><span style={{ color: "#a78bfa" }}>pas:check_balance</span>    — Query shielded balance (local only)</div>
              <div><span style={{ color: "#a78bfa" }}>pas:prove_credential</span> — Generate ZK proof of capability</div>
              <div><span style={{ color: "#a78bfa" }}>pas:request_disclosure</span> — Selective reveal for compliance</div>
              <div><span style={{ color: "#a78bfa" }}>pas:shield_funds</span>     — Move funds into shielded pool</div>
              <div><span style={{ color: "#a78bfa" }}>pas:unshield_funds</span>   — Withdraw to public address</div>
              <div style={{ marginTop: 8, color: "#555" }}>// OpenClaw agent usage (natural language → MCP tool call):</div>
              <div style={{ color: "#22d3ee" }}>"Pay 50 USDC to this skill publisher privately"</div>
              <div style={{ color: "#555" }}>→ pas:shielded_pay {`{recipient, amount: 50, token: "USDC"}`}</div>
            </div>
          </div>

          <div style={{
            padding: "16px 20px", border: "1px solid rgba(251,146,60,0.2)",
            borderRadius: 8, background: "rgba(251,146,60,0.04)", marginTop: 16,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#fb923c", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>
              Revenue Model
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { name: "Relay Fees", desc: "Small fee on each gasless shielded transaction (0.1-0.3%)" },
                { name: "Premium Policies", desc: "Advanced policy templates for enterprises (compliance packs)" },
                { name: "Credential Minting", desc: "Fee for creating/verifying ZK credentials in the vault" },
                { name: "Skill Pack Curation", desc: "Revenue share on curated privacy-audited skill packs" },
              ].map(item => (
                <div key={item.name} style={{
                  padding: "10px 12px", background: "rgba(255,255,255,0.02)",
                  borderRadius: 5, border: "1px solid #1a1a24",
                }}>
                  <div style={{ fontSize: 12, color: "#ccc", fontWeight: 600, marginBottom: 3 }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: "#666", lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        maxWidth: 900, margin: "40px auto 0", padding: "16px 0",
        borderTop: "1px solid #1a1a24",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 10, color: "#333" }}>PAS Architecture Spec — Draft for Discussion</span>
        <span style={{ fontSize: 10, color: "#333" }}>Infra: Railgun (now) → Aztec (Q1 2026) → Ethereum L1 (Strawmap)</span>
      </div>
    </div>
  );
}
