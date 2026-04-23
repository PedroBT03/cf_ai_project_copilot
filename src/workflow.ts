import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import { ensureDbSchema } from "./db";
import { ProjectWorkflowParams } from "./types";

type Env = {
  AI: Ai;
  DB: D1Database;
};

const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

type PlannedTask = {
  title: string;
  details: string;
};

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) {
    return text;
  }

  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
    .replace(/```$/, "")
    .trim();
}

function normalizeParsedTasks(parsed: unknown): PlannedTask[] {
  const unwrap = (value: unknown): unknown[] | null => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return null;

    const asObject = value as Record<string, unknown>;
    for (const key of ["tasks", "items", "plan", "steps"]) {
      if (Array.isArray(asObject[key])) {
        return asObject[key] as unknown[];
      }
    }
    return null;
  };

  const entries = unwrap(parsed);
  if (!entries) return [];

  return entries
    .map((item) => {
      if (typeof item === "string") {
        const title = item.trim();
        if (!title) return null;
        return { title, details: "" };
      }

      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        const title = typeof row.title === "string" ? row.title.trim() : "";
        const details = typeof row.details === "string" ? row.details.trim() : "";
        if (!title) return null;
        return { title, details };
      }

      return null;
    })
    .filter((item): item is PlannedTask => Boolean(item))
    .slice(0, 8);
}

function fallbackTasks(goal: string): PlannedTask[] {
  return [
    {
      title: `Define scope and success criteria for: ${goal}`,
      details: "Clarify goals, measurable outcomes, and delivery constraints."
    },
    {
      title: "Create a milestone timeline with owners",
      details: "Assign accountability and due dates for each milestone."
    },
    {
      title: "List dependencies, risks, and mitigation actions",
      details: "Document blocking dependencies and define mitigation plans."
    },
    {
      title: "Prepare an execution checklist and kickoff plan",
      details: "Create kickoff agenda, communication cadence, and first sprint checklist."
    }
  ];
}

function parseTaskList(raw: string, goal: string): PlannedTask[] {
  const cleaned = stripCodeFences(raw);

  try {
    const parsed = JSON.parse(cleaned);
    const items = normalizeParsedTasks(parsed);
    if (items.length > 0) return items;
  } catch {
    // Falls back to line parsing below when model doesn't return valid JSON.
  }

  const fromLines = cleaned
    .split("\n")
    .map((line) => line.replace(/^\s*[-*0-9.)\s]+/, "").trim())
    .filter((line) => {
      if (!line) return false;
      if (/^```/.test(line)) return false;
      if (/^[\[\]{}]+$/.test(line)) return false;
      if (/^"?[a-zA-Z0-9_]+"?\s*:\s*$/.test(line)) return false;
      if (line.toLowerCase() === "json") return false;
      return true;
    })
    .map((title) => ({ title, details: "" }))
    .slice(0, 8);

  return fromLines.length > 0 ? fromLines : fallbackTasks(goal);
}

async function runAiSafe(env: Env, messages: { role: string; content: string }[]): Promise<string> {
  try {
    const response = await env.AI.run(AI_MODEL, {
      messages
    });
    return (response as any).response ?? "";
  } catch (error) {
    console.warn(`Workflow model ${AI_MODEL} unavailable; using fallback content.`, error);
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
            "You are a senior delivery manager. Produce a concise, actionable project analysis in 4 bullet points: objective, execution path, major risk, and immediate next action."
        },
        {
          role: "user",
          content: `Project goal: ${goal}\nReturn only the 4 bullet points requested.`
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
            "Return ONLY valid JSON. Output an array (max 8 items). Each item must be an object with: title (string), details (string). Prioritize execution order."
        },
        {
          role: "user",
          content:
            `Create an execution task breakdown for this goal: ${goal}. ` +
            "Tasks should be concrete, owner-ready, and sequenced from planning to delivery."
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

      const batchStatements = tasks.map((task, index) =>
        insertTask.bind(
          crypto.randomUUID(),
          projectId,
          task.title,
          "pending",
          index,
          task.details
        )
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