---
sidebar_position: 2
---

# Agent Integration

How to integrate PAS with different agent frameworks.

## LangChain

```typescript
import { PASClient } from "@peekaboopay/sdk";
import { createPASTools } from "@peekaboopay/agent-langchain";

const pas = new PASClient(backend);
const tools = createPASTools(pas);

// Use tools with any LangChain agent
const agent = createReactAgent({ llm, tools });
```

## CrewAI

```typescript
import { PASClient } from "@peekaboopay/sdk";
import { createCrewAITools } from "@peekaboopay/agent-crewai";

const pas = new PASClient(backend);
const tools = createCrewAITools(pas);
```

## MCP (Recommended)

The most framework-agnostic approach. Any agent that speaks MCP can discover PAS tools automatically without any adapter code.

## Direct SDK

For maximum control, use `PASClient` directly in your agent code. See the [Quickstart](./quickstart) guide.
