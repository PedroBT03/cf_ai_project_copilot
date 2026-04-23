# AI Prompts Log

This file documents the AI-assisted coding process as required by the assignment instructions. 
My approach focused on using AI for architectural framework, Cloudflare-specific configuration syntax, and troubleshooting environment-specific errors.

## Prompt 1: Architecture & Project Framework
**Assistant:** Gemini

**Context:** Define a Cloudflare-native architecture for an AI project copilot.

**Prompt:** 
"I am building an AI-powered Project Manager on Cloudflare and already decided core services: Llama 3.3 (Workers AI), Workflows, Durable Objects (Agents SDK), and D1. Suggest a clean project structure that separates Agent logic, Workflow logic, and the Worker router, with clear file boundaries for future iteration."

## Prompt 2: Cloudflare Infrastructure Configuration
**Assistant:** Gemini

**Context:** Configure runtime bindings and TypeScript for the selected Cloudflare stack.

**Prompt:** 
"I already have the architecture defined. Help me configure `wrangler.toml` and `tsconfig.json` for Workers AI, D1, Durable Objects, and Workflows, including the syntax needed for Agents SDK and Workflow entrypoints in a TypeScript project."

## Prompt 3: Dependency Setup
**Assistant:** Gemini

**Context:** Finalize dependency and script setup for local development.

**Prompt:** 
"I already have a Cloudflare Workers TypeScript scaffold. Recommend the dependency list for Workers AI, D1, and Agents SDK, plus a practical `package.json` script set for a wrangler-first workflow, including type generation from `wrangler.toml` bindings."

## Prompt 4: Database Schema & Agent Implementation
**Assistant:** Gemini

**Context:** Add initial persistence and agent response logic for project planning.

**Prompt:** 
"I already have D1 provisioned. Help me define a practical schema for `projects` and `tasks` (one-to-many), then provide `ProjectAgent` boilerplate using the Agents SDK with a project-manager system prompt and Workers AI (Llama 3.3) integration."

## Prompt 5: Repository Maintenance & Security
**Assistant:** Gemini 2.0

**Context:** Add baseline repository hygiene and secret-safety defaults.

**Prompt:** 
"The repo structure is already in place. Provide a `.gitignore` suitable for a Cloudflare Workers + TypeScript project that excludes local state, secrets, and generated/dependency artifacts while keeping source and config tracked."

## Prompt 6: Agent Routing Alignment
**Assistant:** Gemini 2.0

**Context:** Align agent routing with the Cloudflare Agents SDK.

**Prompt:**
"I already implemented a base `ProjectAgent` and Worker router for `/api/chat`. Help me adjust routing to use the Agents SDK helper for named instances, preserve per-agent conversation state, and keep the endpoint behavior stable for local dev."

## Prompt 7: Local Development Fallback
**Assistant:** Gemini 2.0

**Context:** Keep local development usable without remote AI access.

**Prompt:**
"My agent already uses Workers AI (Llama 3.3) and persists message history. In local development, the AI binding may be unavailable. Suggest a fallback approach so chat requests still return useful responses locally without changing production behavior."

## Prompt 8: Minimal Chat UI for the Worker
**Assistant:** Gemini 2.0

**Context:** Add a simple browser UI to test the worker end-to-end.

**Prompt:**
"The Worker and `/api/chat` endpoint are already working. Help me create a lightweight browser chat UI (HTML/CSS/vanilla JS) that sends messages to the endpoint, renders replies clearly, and is practical for local end-to-end testing."

## Prompt 9: Workflow Step Design
**Assistant:** Gemini 2.0

**Context:** Implement a multi-step planning workflow for project goals.

**Prompt:**
"I already have a working Cloudflare Worker + Agent chat flow. Help me structure a Cloudflare Workflow that takes a project goal and runs explicit steps (`analyze-goal`, `generate-tasks`, `store-tasks`) with clear step boundaries and durable execution semantics."

## Prompt 10: D1 Schema for Workflow Tracking
**Assistant:** Gemini 2.0

**Context:** Extend persistence to support workflow visibility and task dashboards.

**Prompt:**
"I already have basic project and task tables in D1. What small changes should I add so I can track workflow progress and show it in the UI?"

## Prompt 11: Agent Trigger for Planning Mode
**Assistant:** Gemini 2.0

**Context:** Add command-based workflow triggering without breaking normal chat mode.

**Prompt:**
"My agent already replies in chat. Help me add a `/plan` command that starts a workflow and returns IDs I can use in the frontend, while keeping normal chat messages unchanged."

## Prompt 12: Status API Shape
**Assistant:** Gemini 2.0

**Context:** Expose project progress through a single endpoint for the frontend.

**Prompt:**
"I already persist project, task, and workflow info. Can you suggest a clean JSON response for a status endpoint so the frontend can render everything from one request?"

## Prompt 13: Frontend Polling Dashboard
**Assistant:** Gemini 2.0

**Context:** Add a lightweight live status panel to an existing chat UI.

**Prompt:**
"I already have a working browser chat interface. Suggest a simple vanilla JS pattern to poll `/api/project/:id/status`, render tasks + workflow events in a side panel, and start polling only after a planning command returns a project ID."

## Prompt 14: Local Fallback Strategy in Workflow
**Assistant:** Gemini 2.0

**Context:** Keep workflow execution stable in local dev when Workers AI is unavailable.

**Prompt:**
"My workflow uses Workers AI, but in local mode it can fail. Suggest a fallback so the workflow still finishes locally with basic output, without changing production behavior."

## Prompt 15: Task Status Update Endpoint
**Assistant:** Gemini 2.0

**Context:** Add manual task state transitions for execution tracking.

**Prompt:**
"I already list tasks in the status endpoint. Help me add a simple endpoint to change a task state (`pending`, `in_progress`, `done`) and log that change."

## Prompt 16: Frontend Task Controls
**Assistant:** Gemini 2.0

**Context:** Allow task status updates directly from the dashboard UI.

**Prompt:**
"My dashboard already renders tasks. Suggest a simple UI pattern to let me update each task status inline and refresh the panel after changes."

## Prompt 17: SSE Status Stream
**Assistant:** Gemini 2.0

**Context:** Improve project status updates with near-real-time streaming.

**Prompt:**
"I already have polling working for project status. Help me add an Server-Sent Events stream and connect it in the frontend, but keep polling as a backup if streaming disconnects."

## Prompt 18: Task JSON Formatting Fix
**Assistant:** Gemini 2.0

**Context:** Fix malformed task rendering caused by inconsistent AI JSON output.

**Prompt:**
"I'm getting messy task output in the planning board: sometimes `title` and `details` show up as separate bullets, and sometimes I get raw JSON bits like `\"title\": ...`, braces, or code fences. Can you help me clean this up with a JSON-first parse and a simple regex/string fallback? I want one bullet per task title, with details shown separately (like a tooltip). Also explain why this is happening and the safest fix."

## Prompt 19: README Writing Review
**Assistant:** Gemini 2.0

**Context:** Improve README clarity and polish for submission.

**Prompt:**
"I already have a complete README with setup instructions, architecture, demo flow, and API endpoints. Please review the writing quality and suggest edits to improve clarity, structure, and consistency without changing the technical meaning."