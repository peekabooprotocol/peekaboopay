// Peek-a-boo onboarding — runs after npm install
const g = '\x1b[32m';  // green
const m = '\x1b[36m';  // cyan/mint
const v = '\x1b[35m';  // violet
const p = '\x1b[35m';  // pink
const d = '\x1b[90m';  // dim
const b = '\x1b[1m';   // bold
const r = '\x1b[0m';   // reset
const y = '\x1b[33m';  // yellow

console.log(`
${g}${b}  peek${m}—${g}a${m}—${g}boo${r}  ${d}v0.3.0${r}
${d}  ─────────────────────────────────────────────────${r}
${b}  Agent-first privacy protocol for web3${r}
${d}  ZK-SNARKs · Stealth Addresses · MCP-Native · Multi-Chain${r}

${b}  🔗 Chains (6 live):${r}

${m}  Bittensor EVM ${d}(964)${r}  ${m}Base L2 ${d}(8453)${r}  ${d}Ethereum · BSC · Polygon · Arbitrum${r}

${b}  🛠️  MCP Tools (10):${r}

${d}    ${m}pas_pay${d}              Send a shielded payment${r}
${d}    ${m}pas_receive${d}          Generate stealth receive address${r}
${d}    ${m}pas_shield_funds${d}     Deposit into shielded pool${r}
${d}    ${m}pas_unshield_funds${d}   Withdraw from shielded pool${r}
${d}    ${m}pas_get_balance${d}      Query shielded balance${r}
${d}    ${m}pas_prove${d}            Generate ZK proof${r}
${d}    ${m}pas_credential_store${d} Store ZK-provable credential${r}
${d}    ${m}pas_disclose${d}         Selective attribute disclosure${r}
${d}    ${m}pas_swap${d}             Private token swap ${d}(coming)${r}
${d}    ${m}pas_bridge${d}           Cross-chain bridge ${d}(coming)${r}

${b}  🔐 Privacy Features:${r}

${d}    ${m}Note Encryption${d}      ECDH + AES-256-GCM — recover funds on any device${r}
${d}    ${m}Viewing Keys${d}         Spend vs view separation — safe for dashboards${r}
${d}    ${m}Compliance Proofs${d}    Proof of Innocence — privacy meets regulation${r}
${d}    ${v}Lit Protocol${d}         Decentralized key management — no raw keys${r}

${b}  ⚡ Quick Start:${r}

${d}    ${v}import${r} { BittensorAdapter } ${v}from${r} ${g}'peekaboopay'${r}
${d}    ${v}const${r} adapter = ${v}new${r} ${m}BittensorAdapter${r}()
${d}    ${v}await${r} adapter.${m}initialize${r}({ chainId: ${g}964${r} })
${d}    ${v}await${r} adapter.${m}shield${r}({ amount: ${g}1000000000000000000n${r} })

${d}    ${d}// MCP Server:${r}
${d}    ${g}$${r} npx peekaboopay-mcp

${d}    ${d}// Lit Protocol (no raw keys):${r}
${d}    ${v}import${r} { ${m}createPKPSigner${r} } ${v}from${r} ${g}'@peekaboopay/lit'${r}
${d}    ${v}const${r} signer = ${v}await${r} ${m}createPKPSigner${r}({ litClient, pkpPublicKey, authSig })

${b}  🔑 API Keys:${r}

${d}    1. Connect wallet at ${m}app.peekaboo.finance${r}
${d}    2. Go to API Keys → Generate${r}
${d}    3. ${v}headers${r}: { ${g}"Authorization"${r}: ${g}"Bearer pab_..."${r} }

${d}  ─────────────────────────────────────────────────${r}
${b}  Links:${r}
    ${m}Dashboard${r}     ${d}https://app.peekaboo.finance${r}
    ${m}Get Started${r}   ${d}https://peekaboo.finance/get-started/${r}
    ${m}Docs${r}          ${d}https://peekaboo.finance/docs/${r}
    ${m}GitHub${r}        ${d}https://github.com/peekabooprotocol/peekaboopay${r}
    ${m}npm${r}           ${d}https://www.npmjs.com/package/peekaboopay${r}
    ${m}X${r}             ${d}https://x.com/peekaboo_pay${r}
${d}  ─────────────────────────────────────────────────${r}
`);
