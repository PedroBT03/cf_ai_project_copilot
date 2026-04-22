# cf_ai_project_copilot

An AI-powered project management assistant built on Cloudflare's edge network. It leverages autonomous agents to decompose complex goals into executable tasks using Workflows.

## 🚀 Technical Stack
- **LLM:** Llama 3.3 (via Workers AI)
- **Orchestration:** Cloudflare Workflows for multi-step task generation.
- **State & Memory:** Durable Objects (via Agents SDK) for persistent session context.
- **Realtime UI:** Cloudflare Pages with Realtime SDK for live agent updates.
- **Persistence:** Cloudflare D1 for project history.

## 🛠️ Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Authenticate with Cloudflare:
   ```bash
   npx wrangler login
   ```
3. Run in development mode:
   ```bash
   npx wrangler dev
   ```