import { ProjectAgent } from "./agent";
import { ProjectWorkflow } from "./workflow";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route to the Agent for chat
    if (url.pathname.startsWith("/api/chat")) {
      // Single ID "global-manager" so the agent "remembers" the project
      const id = env.AGENT_STATE.idFromName("global-manager");
      const agent = env.AGENT_STATE.get(id);
      return agent.fetch(request);
    }

    // Default: Serve frontend
    return env.ASSETS.fetch(request);
  },
};

export { ProjectAgent, ProjectWorkflow };