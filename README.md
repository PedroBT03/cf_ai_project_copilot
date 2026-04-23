# cf_ai_project_copilot

An AI-powered project management assistant built on Cloudflare's network. It leverages autonomous agents to decompose complex goals into executable tasks using Workflows.

## Live Deployment

- App URL: `https://cf_ai_project_copilot.pedrobt2003.workers.dev`

## 🚀 Technical Stack
- **LLM:** Llama 3.3 (via Workers AI)
- **Orchestration:** Cloudflare Workflows for multi-step task planning.
- **State & Memory:** Durable Objects (via Agents SDK) for session and chat state.
- **UI:** Static assets served by the Worker.
- **Persistence:** D1 for projects, tasks, and workflow event logs.

## What This App Does

1. Accepts chat input from the user.
2. Runs normal assistant replies through Workers AI.
3. Starts a planning workflow when user sends `/plan <goal>`.
4. Stores workflow progress and generated tasks in D1.
5. Shows planning status and logs in a side panel with SSE updates.

## Core Components

- `src/index.ts`: Worker router and API endpoints.
- `src/agent.ts`: Durable Object agent logic (chat + `/plan` trigger).
- `src/workflow.ts`: Multi-step planning workflow.
- `src/db.ts`: Schema bootstrap helper for D1 tables.
- `public/index.html`, `public/app.js`: Chat UI and planning dashboard.
- `migrations/0000_init.sql`: D1 schema.

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
   npm run dev
   ```
4. Open:
   ```
   http://127.0.0.1:8787/
   ```

### Notes
- The default development command runs in local mode so it works without a workers.dev subdomain.
- Workers AI may fall back locally if remote inference is unavailable.
- In that case, deploy testing is the source of truth for real model responses.

## Deployed Testing (Recommended)

You can fully test all components directly on the deployed link:

- `https://cf_ai_project_copilot.pedrobt2003.workers.dev`

Quick check via terminal:

```bash
curl -s "https://cf_ai_project_copilot.pedrobt2003.workers.dev/api/chat?message=hello"
```

## Demo Flow (MVP)

1. Open local app (`http://127.0.0.1:8787/`) or deployed app (`workers.dev` link above).
2. In chat, start planning mode:
   ```
   /plan Launch a mobile app for student budgeting
   ```
3. The assistant returns `projectId` and `workflowId`.
4. The side panel updates with:
   - workflow state
   - generated tasks
   - workflow events
5. Change task status directly in the dashboard (`pending`, `in_progress`, `done`).
6. Confirm event log updates in real time.

### API Endpoints

- `GET /api/chat?message=<text>`: chat/command input (`/plan` to trigger workflow)
- `GET /api/project/:id/status`: project + workflow + tasks + event log
- `PATCH /api/task/:id`: update task status body `{ "status": "pending|in_progress|done" }`
- `GET /api/project/:id/stream`: SSE stream for near-real-time status updates

## Submission Notes

- Repository prefix requirement is satisfied: `cf_ai_project_copilot`.
- `PROMPTS.md` contains the AI prompt log used during implementation.