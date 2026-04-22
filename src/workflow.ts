import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";

export class ProjectWorkflow extends WorkflowEntrypoint {
  async run(event: WorkflowEvent<any>, step: WorkflowStep) {
    await step.do("Log start", async () => {
      console.log("Workflow started for project");
    });
  }
}