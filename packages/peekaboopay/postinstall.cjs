// Peek-a-boo onboarding — runs after npm install
const g = '\x1b[32m';  // green
const m = '\x1b[36m';  // cyan/mint
const v = '\x1b[35m';  // violet
const d = '\x1b[90m';  // dim
const b = '\x1b[1m';   // bold
const r = '\x1b[0m';   // reset

console.log(`
${g}${b}  peek${m}—${g}a${m}—${g}boo${r}  ${d}v0.1.0${r}
${d}  ─────────────────────────────────────────${r}
${b}  Private payments for web3${r}
${d}  Shield. Send. Prove.${r}

${b}  Choose your chain:${r}

${m}  Bittensor EVM ${d}(Chain 964)${r}
${d}    Shielded TAO, anonymous miners, deployed on mainnet${r}
${d}    ───${r}
    ${v}import${r} { BittensorAdapter } ${v}from${r} ${g}'@peekaboopay/adapter-bittensor'${r}
    ${v}const${r} adapter = ${v}new${r} ${m}BittensorAdapter${r}()
    ${v}await${r} adapter.${m}initialize${r}({ chainId: ${g}964${r} })

${m}  Ethereum / BSC / Polygon / Arbitrum ${d}(via Railgun)${r}
${d}    Shielded ERC-20, ZK-SNARKs, 4 chains supported${r}
${d}    ───${r}
    ${v}import${r} { RailgunAdapter } ${v}from${r} ${g}'@peekaboopay/adapter-railgun'${r}
    ${v}const${r} adapter = ${v}new${r} ${m}RailgunAdapter${r}()
    ${v}await${r} adapter.${m}initialize${r}({ chainId: ${g}1${r} })

${m}  x402 HTTP Payments ${d}(private 402 flows)${r}
${d}    Shielded payment scheme for HTTP-native payments${r}
${d}    ───${r}
    ${v}import${r} { ${m}createShieldedFetch${r} } ${v}from${r} ${g}'@peekaboopay/x402'${r}
    ${v}const${r} fetch = ${m}createShieldedFetch${r}({ pay })

${m}  MCP Agent Tools ${d}(Claude, LangChain, CrewAI)${r}
${d}    10 privacy tools as native MCP tool calls${r}
${d}    ───${r}
    ${v}import${r} { ${m}createMCPServer${r} } ${v}from${r} ${g}'@peekaboopay/mcp-server'${r}

${d}  ─────────────────────────────────────────${r}

${m}  API Keys ${d}(for agent access)${r}
${d}    1. Connect wallet at ${m}app.peekaboo.finance${d}
    2. Go to API Keys → Generate
    3. Use in your agent:${r}
    ${v}headers${r}: { ${g}"Authorization"${r}: ${g}"Bearer pab_..."${r} }

${d}  ─────────────────────────────────────────${r}
${b}  Links:${r}
    ${m}Dashboard${r}     ${d}https://app.peekaboo.finance${r}
    ${m}Get Started${r}   ${d}https://peekaboo.finance/get-started/${r}
    ${m}Docs${r}          ${d}https://peekaboo.finance/docs/${r}
    ${m}GitHub${r}        ${d}https://github.com/peekabooprotocol/peekaboopay${r}
${d}  ─────────────────────────────────────────${r}
`);
