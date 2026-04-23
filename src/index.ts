import { getAgentByName } from "@cloudflare/agents";
import { ProjectAgent } from "./agent";
import { ensureDbSchema } from "./db";
import { ProjectWorkflow } from "./workflow";

async function getProjectSnapshot(env: any, projectId: string) {
  const projectResult = await env.DB
    .prepare(
      `SELECT id, name, goal, status, workflow_instance_id, created_at
       FROM projects WHERE id = ?`
    )
    .bind(projectId)
    .first();

  if (!projectResult) {
    return null;
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

  return {
    project: projectResult,
    workflow: {
      id: workflowId,
      status: workflowStatus,
      error: workflowError
    },
    tasks: tasksResult.results,
    events: eventsResult.results
  };
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const jsonHeaders = { "Content-Type": "application/json" };

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
          headers: jsonHeaders
        });
      }

      const snapshot = await getProjectSnapshot(env, projectId);
      if (!snapshot) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers: jsonHeaders
        });
      }

      return new Response(
        JSON.stringify(snapshot),
        {
          headers: jsonHeaders
        }
      );
    }

    if (url.pathname.startsWith("/api/project/") && url.pathname.endsWith("/stream")) {
      await ensureDbSchema(env.DB);
      const parts = url.pathname.split("/");
      const projectId = parts[3];
      if (!projectId) {
        return new Response(JSON.stringify({ error: "Missing project id" }), {
          status: 400,
          headers: jsonHeaders
        });
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let closed = false;

          const sendSnapshot = async () => {
            if (closed) return;
            try {
              const snapshot = await getProjectSnapshot(env, projectId);
              controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify(snapshot)}\n\n`));
            } catch (error) {
              controller.enqueue(
                encoder.encode(`event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`)
              );
            }
          };

          await sendSnapshot();
          const interval = setInterval(() => {
            void sendSnapshot();
          }, 3000);

          // Stop streaming after 2 minutes to avoid leaking resources.
          setTimeout(() => {
            if (!closed) {
              clearInterval(interval);
              closed = true;
              controller.close();
            }
          }, 120000);
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive"
        }
      });
    }

    if (url.pathname.startsWith("/api/task/") && request.method === "PATCH") {
      await ensureDbSchema(env.DB);
      const parts = url.pathname.split("/");
      const taskId = parts[3];
      if (!taskId) {
        return new Response(JSON.stringify({ error: "Missing task id" }), {
          status: 400,
          headers: jsonHeaders
        });
      }

      const body = (await request.json().catch(() => null)) as { status?: string } | null;
      const newStatus = body?.status;
      const allowedStatuses = new Set(["pending", "in_progress", "done"]);

      if (!newStatus || !allowedStatuses.has(newStatus)) {
        return new Response(JSON.stringify({ error: "Invalid task status" }), {
          status: 400,
          headers: jsonHeaders
        });
      }

      const taskRow = await env.DB
        .prepare(`SELECT id, project_id FROM tasks WHERE id = ?`)
        .bind(taskId)
        .first();

      if (!taskRow) {
        return new Response(JSON.stringify({ error: "Task not found" }), {
          status: 404,
          headers: jsonHeaders
        });
      }

      await env.DB.prepare(`UPDATE tasks SET status = ? WHERE id = ?`).bind(newStatus, taskId).run();

      await env.DB
        .prepare(
          `INSERT INTO workflow_events (id, project_id, step, status, detail)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          taskRow.project_id,
          "task-update",
          "complete",
          `Task ${taskId} set to ${newStatus}`
        )
        .run();

      return new Response(JSON.stringify({ ok: true, taskId, status: newStatus }), {
        headers: jsonHeaders
      });
    }

    // Default: Serve frontend static assets
    return env.ASSETS.fetch(request);
  },
};

export { ProjectAgent, ProjectWorkflow };