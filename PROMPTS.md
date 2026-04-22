# AI Prompts Log

This file documents the AI-assisted coding process as required by the assignment instructions. 
My approach focused on using AI for architectural framework, Cloudflare-specific configuration syntax, and troubleshooting environment-specific errors.

## Prompt 1: Architecture & Project Framework
**Assistant:** Gemini

**Context:** Defining the technical stack based on the Cloudflare ecosystem.

**Prompt:** 
"I am designing an AI-powered Project Manager on Cloudflare. I want to use the following architecture:
- Llama 3.3 for the LLM.
- Cloudflare Workflows for asynchronous project decomposition.
- Durable Objects (via the new Agents SDK) for session state and long-term memory.
- D1 for persistence.
Suggest a standard project structure that separates the Agent logic, the Workflow logic, and the Worker router."

## Prompt 2: Cloudflare Infrastructure Configuration
**Assistant:** Gemini

**Context:** Setting up the `wrangler.toml` and TypeScript environment.

**Prompt:** 
"I need to configure my `wrangler.toml` and `tsconfig.json` for a project using Workers AI, D1, Durable Objects, and Workflows. Provide the correct syntax to bind these resources and enable support for the Cloudflare Agents and Workflows SDKs."

## Prompt 3: Dependency Setup
**Assistant:** Gemini

**Context:** Setting up the development environment.

**Prompt:** 
"I am setting up a Cloudflare Workers project with TypeScript. Please provide:
1. The recommended list of devDependencies for a project using Workers AI, D1, and the Agents SDK.
2. The standard `package.json` scripts for a 'wrangler-first' workflow, including a command to generate TypeScript types from my `wrangler.toml` bindings."

## Prompt 4: Database Schema & Agent Implementation
**Assistant:** Gemini

**Context:** Implementing the data layer and the Agent logic.

**Prompt:** 
"I have my D1 database ready. Help me design a SQL schema for `projects` and `tasks` (one-to-many relationship). 
After that, provide the boilerplate for a `ProjectAgent` class using the `cloudflare:agents` SDK that maintains a system prompt for a Project Manager persona and can communicate with Llama 3.3."

## Prompt 5: Repository Maintenance & Security
**Assistant:** Gemini 2.0

**Context:** Preparing the repository for its initial commit.

**Prompt:** 
"Provide a standard `.gitignore` file for this project. Prevent tracking local environment state, sensitive credentials, and heavy dependency folders."

## Prompt 6: Agent Routing Alignment
**Assistant:** Gemini 2.0

**Context:** Align agent routing with the Cloudflare Agents SDK.

**Prompt:**
"The base agent and worker router are in place. I already have a `ProjectAgent` durable object and a Worker router for `/api/chat`. Help me update the routing so the worker uses the Cloudflare Agents SDK helper for named agent instances, preserves conversation state per agent, and keeps the request path compatible with local development."

## Prompt 7: Local Development Fallback
**Assistant:** Gemini 2.0

**Context:** Keep local development usable without remote AI access.

**Prompt:**
"The project is wired to Workers AI, but local development may not always have remote AI access enabled. My agent already calls Llama 3.3 on Workers AI and stores message history. Suggest a clean fallback strategy for local development so the chat still returns a useful response when the AI binding is unavailable, without changing the production flow."

## Prompt 8: Minimal Chat UI for the Worker
**Assistant:** Gemini 2.0

**Context:** Add a simple browser UI to test the worker end-to-end.

**Prompt:**
"The worker now serves static assets, and I want a simple browser UI that can exercise the chat endpoint end-to-end. Given a Cloudflare Worker that exposes `/api/chat`, generate a lightweight chat interface with HTML, CSS, and vanilla JavaScript that posts user messages to the endpoint, renders the conversation, and works well in local development."