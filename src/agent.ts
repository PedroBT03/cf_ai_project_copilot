import { Agent, Connection, WSMessage } from "@cloudflare/agents";
import { ensureDbSchema } from "./db";
import { ChatMessage, ProjectWorkflowParams } from "./types";

// Environment interface
export interface Env {
  AI: Ai;
  DB: D1Database;
  AGENT_STATE: DurableObjectNamespace<ProjectAgent>;
  PROJECT_WORKFLOW: Workflow<ProjectWorkflowParams>;
}

type AgentResponse = {
  response: string;
  projectId?: string;
  workflowId?: string;
  mode?: "chat" | "workflow";
};

export class ProjectAgent extends Agent<Env> {
  
  // Handle HTTP requests
  async onRequest(request: Request) {
    const url = new URL(request.url);
    const message = url.searchParams.get("message");

    if (message) {
      // Process the message
      const result = await this.processAiMessage(message);
      return new Response(JSON.stringify(result), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    return new Response("Agent is active. Provide a 'message' query parameter.", { status: 200 });
  }

  // Handle WebSocket messages
  async onMessage(connection: Connection, message: WSMessage) {
    const userText = typeof message === "string" ? message : message.toString();
    const result = await this.processAiMessage(userText);
    connection.send(JSON.stringify(result));
  }

  private isPlanningRequest(userText: string): boolean {
    const normalized = userText.trim().toLowerCase();
    return normalized.startsWith("/plan ") || normalized.startsWith("/goal ");
  }

  private extractGoal(userText: string): string {
    if (userText.toLowerCase().startsWith("/plan ")) {
      return userText.slice(6).trim();
    }
    if (userText.toLowerCase().startsWith("/goal ")) {
      return userText.slice(6).trim();
    }
    return userText.trim();
  }

  private async startProjectWorkflow(goal: string): Promise<AgentResponse> {
    await ensureDbSchema(this.env.DB);

    const projectId = crypto.randomUUID();
    const projectName = goal.length > 80 ? `${goal.slice(0, 77)}...` : goal;

    await this.env.DB
      .prepare(
        `INSERT INTO projects (id, name, description, goal, status)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(projectId, projectName, "Created from chat planner", goal, "queued")
      .run();

    const workflow = await this.env.PROJECT_WORKFLOW.create({
      params: {
        projectId,
        goal,
        requestedBy: this.name
      }
    });

    await this.env.DB
      .prepare(`UPDATE projects SET workflow_instance_id = ? WHERE id = ?`)
      .bind(workflow.id, projectId)
      .run();

    return {
      response:
        `Planning workflow started for your goal.\nProject ID: ${projectId}\nWorkflow ID: ${workflow.id}\nI will now generate a task breakdown and track progress.`,
      projectId,
      workflowId: workflow.id,
      mode: "workflow"
    };
  }

  // AI processing logic
  async processAiMessage(userText: string): Promise<AgentResponse> {
    if (this.isPlanningRequest(userText)) {
      const goal = this.extractGoal(userText);
      if (!goal) {
        return {
          response: "Use `/plan <your goal>` to start a workflow.",
          mode: "workflow"
        };
      }
      return this.startProjectWorkflow(goal);
    }

    // 1. Manage History
    let history = (await this.ctx.storage.get<ChatMessage[]>("history")) || [];
    history.push({ role: "user", content: userText });

    // 2. Call Llama 3.3, with a local fallback when Workers AI is unavailable
    let aiText = "";
    try {
      const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
        messages: [
          { role: "system", content: "You are a professional Project Manager assistant." },
          ...history
        ]
      });

      aiText = (response as any).response ?? String(response);
    } catch (error) {
      console.warn("Workers AI is unavailable, using local fallback response.", error);
      aiText = `Local fallback mode: I received your message: ${userText}`;
    }

    // 3. Update and persist history. Keep only the last 10 messages for context.
    history.push({ role: "assistant", content: aiText });
    if (history.length > 10) history = history.slice(-10);
    await this.ctx.storage.put("history", history);

    return { response: aiText, mode: "chat" };
  }
}