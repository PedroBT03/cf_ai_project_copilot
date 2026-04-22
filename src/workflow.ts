import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import { ensureDbSchema } from "./db";
import { ProjectWorkflowParams } from "./types";

type Env = {
  AI: Ai;
  DB: D1Database;
};

function fallbackTasks(goal: string): string[] {
  return [
    `Define scope and success criteria for: ${goal}`,
    "Create a milestone timeline with owners",
    "List dependencies, risks, and mitigation actions",
    "Prepare an execution checklist and kickoff plan"
  ];
}

function parseTaskList(raw: string, goal: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const items = parsed
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 8);
      if (items.length > 0) return items;
    }
  } catch {
    // Falls back to line parsing below when model doesn't return valid JSON.
  }

  const fromLines = raw
    .split("\n")
    .map((line) => line.replace(/^\s*[-*0-9.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);

  return fromLines.length > 0 ? fromLines : fallbackTasks(goal);
}

async function runAiSafe(env: Env, messages: { role: string; content: string }[]): Promise<string> {
  try {
    const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
      messages
    });
    return (response as any).response ?? "";
  } catch (error) {
    console.warn("Workflow AI unavailable; using fallback content.", error);
    return "";
  }
}

export class ProjectWorkflow extends WorkflowEntrypoint<Env, ProjectWorkflowParams> {
  async run(event: WorkflowEvent<ProjectWorkflowParams>, step: WorkflowStep) {
    const { projectId, goal } = event.payload;
    await ensureDbSchema(this.env.DB);

    await step.do("log-start", async () => {
      await this.env.DB
        .prepare(
          `INSERT INTO workflow_events (id, project_id, step, status, detail)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(crypto.randomUUID(), projectId, "start", "running", "Workflow accepted")
        .run();

      await this.env.DB
        .prepare(`UPDATE projects SET status = ? WHERE id = ?`)
        .bind("running", projectId)
        .run();
    });

    const analysis = await step.do("analyze-goal", async () => {
      const text = await runAiSafe(this.env, [
        {
          role: "system",
          content:
            "You are a project planning analyst. Produce a concise 2-4 sentence plan analysis."
        },
        {
          role: "user",
          content: `Analyze this project goal and highlight execution priorities: ${goal}`
        }
      ]);

      return text || `Initial analysis prepared for goal: ${goal}`;
    });

    await step.do("store-analysis", async () => {
      await this.env.DB
        .prepare(
          `INSERT INTO workflow_events (id, project_id, step, status, detail)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(crypto.randomUUID(), projectId, "analyze-goal", "complete", String(analysis))
        .run();
    });

    const rawTasks = await step.do("generate-tasks", async () => {
      const text = await runAiSafe(this.env, [
        {
          role: "system",
          content:
            "Return ONLY a JSON array of task strings. Max 8 tasks. Prioritize practical execution order."
        },
        {
          role: "user",
          content: `Create a task breakdown for this goal: ${goal}`
        }
      ]);

      return text || JSON.stringify(fallbackTasks(goal));
    });

    await step.do("store-tasks", async () => {
      const tasks = parseTaskList(String(rawTasks), goal);

      const insertTask = this.env.DB.prepare(
        `INSERT INTO tasks (id, project_id, title, status, order_index, details)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      const batchStatements = tasks.map((title, index) =>
        insertTask.bind(crypto.randomUUID(), projectId, title, "pending", index, null)
      );

      if (batchStatements.length > 0) {
        await this.env.DB.batch(batchStatements);
      }

      await this.env.DB
        .prepare(
          `INSERT INTO workflow_events (id, project_id, step, status, detail)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          projectId,
          "generate-tasks",
          "complete",
          `Generated ${tasks.length} tasks`
        )
        .run();

      await this.env.DB
        .prepare(`UPDATE projects SET status = ? WHERE id = ?`)
        .bind("planned", projectId)
        .run();

      await this.env.DB
        .prepare(
          `INSERT INTO workflow_events (id, project_id, step, status, detail)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(crypto.randomUUID(), projectId, "workflow", "complete", "Planning workflow completed")
        .run();
    });
  }
}