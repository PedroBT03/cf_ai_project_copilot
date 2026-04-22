import { Agent } from "cloudflare:agents";

// Define the environment interface
export interface Env {
  AI: Ai;
  DB: D1Database;
  AGENT_STATE: DurableObjectNamespace;
}

export class ProjectAgent extends Agent<Env> {
  // Handles standard HTTP requests to the Agent
  async onRequest(request: Request) {
    return new Response("Project Agent is active. Send a message via the Realtime SDK or a POST request.");
  }

  // Handles messages (from WebSockets/Realtime SDK)
  async onMessage(message: string) {
    try {
      // Call Llama 3.3 with system instructions
      const aiResponse = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
        messages: [
          { role: "system", content: "You are a professional Project Manager assistant. You help users plan tasks, manage timelines, and organize ideas." },
          { role: "user", content: message }
        ]
      });

      // Return AI response to the client
      return aiResponse;
    } catch (error) {
      console.error("Agent Error:", error);
      return { error: "Failed to process message" };
    }
  }
}