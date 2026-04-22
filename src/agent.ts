import { Agent, Connection, WSMessage } from "@cloudflare/agents";

// Environment interface
export interface Env {
  AI: Ai;
  DB: D1Database;
  AGENT_STATE: DurableObjectNamespace;
  PROJECT_WORKFLOW: Workflow;
}

export class ProjectAgent extends Agent<Env> {
  
  // Handle HTTP requests
  async onRequest(request: Request) {
    const url = new URL(request.url);
    const message = url.searchParams.get("message");

    if (message) {
      // Process the message
      const aiText = await this.processAiMessage(message);
      return new Response(JSON.stringify({ response: aiText }), {
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
    const aiText = await this.processAiMessage(userText);
    connection.send(JSON.stringify({ response: aiText }));
  }

  // AI processing logic
  async processAiMessage(userText: string): Promise<string> {
    // 1. Manage History
    let history = (await this.ctx.storage.get<any[]>("history")) || [];
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

    return aiText;
  }
}