import { getAgentByName } from "@cloudflare/agents";
import { ProjectAgent } from "./agent";
import { ensureDbSchema } from "./db";
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

    if (url.pathname.startsWith("/api/project/") && url.pathname.endsWith("/status")) {
      await ensureDbSchema(env.DB);

      const parts = url.pathname.split("/");
      const projectId = parts[3];
      if (!projectId) {
        return new Response(JSON.stringify({ error: "Missing project id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const projectResult = await env.DB
        .prepare(
          `SELECT id, name, goal, status, workflow_instance_id, created_at
           FROM projects WHERE id = ?`
        )
        .bind(projectId)
        .first();

      if (!projectResult) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const tasksResult = await env.DB
        .prepare(
          `SELECT id, title, status, order_index, details, created_at
           FROM tasks WHERE project_id = ?
           ORDER BY order_index ASC, created_at ASC`
        )
        .bind(projectId)
        .all();

      const eventsResult = await env.DB
        .prepare(
          `SELECT id, step, status, detail, created_at
           FROM workflow_events WHERE project_id = ?
           ORDER BY created_at DESC LIMIT 10`
        )
        .bind(projectId)
        .all();

      let workflowStatus: string | null = null;
      let workflowError: unknown = null;
      const workflowId = projectResult.workflow_instance_id as string | null;
      if (workflowId) {
        try {
          const wf = await env.PROJECT_WORKFLOW.get(workflowId);
          const status = await wf.status();
          workflowStatus = status.status;
          workflowError = status.error ?? null;
        } catch (error) {
          workflowStatus = "unknown";
          workflowError = String(error);
        }
      }

      return new Response(
        JSON.stringify({
          project: projectResult,
          workflow: {
            id: workflowId,
            status: workflowStatus,
            error: workflowError
          },
          tasks: tasksResult.results,
          events: eventsResult.results
        }),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Default: Serve frontend static assets
    return env.ASSETS.fetch(request);
  },
};

export { ProjectAgent, ProjectWorkflow };