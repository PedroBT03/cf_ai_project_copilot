import { getAgentByName } from "@cloudflare/agents";
import { ProjectAgent } from "./agent";
import { ProjectWorkflow } from "./workflow";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route to agent for chat messages
    if (url.pathname === "/api/chat") {
      const agentId = "global-manager";
      const stub = await getAgentByName(env.AGENT_STATE, agentId);

      return stub.fetch(request);
    }

    // Default: Serve frontend static assets
    return env.ASSETS.fetch(request);
  },
};

export { ProjectAgent, ProjectWorkflow };