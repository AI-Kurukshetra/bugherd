export const TASK_SEVERITIES = ["critical", "important", "normal", "minor"] as const;
export type TaskSeverity = (typeof TASK_SEVERITIES)[number];

export type Task = {
  id: string;
  user_id: string;
  column_id: string;
  description: string;
  assignee: string | null;
  severity: TaskSeverity;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
  page_url?: string | null;
  page_title?: string | null;
  selector?: string | null;
  screenshot_path?: string | null;
};

