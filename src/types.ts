export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ProjectWorkflowParams = {
  projectId: string;
  goal: string;
  requestedBy: string;
};

export type WorkflowEventRow = {
  id: string;
  project_id: string;
  step: string;
  status: string;
  detail: string | null;
  created_at: string;
};

export type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  order_index: number;
  details: string | null;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  status: string;
  workflow_instance_id: string | null;
  created_at: string;
};
