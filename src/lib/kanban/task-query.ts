import type { Task } from "@/types/task";

export type FilterBy = "all_feedback" | "design_feedback" | "website_feedback" | "mentioned" | "unread_comments";

export type SortBy =
  | "manually"
  | "severity"
  | "due_date"
  | "time_created"
  | "assigned_to"
  | "last_modified";

function norm(s: string) {
  return s.trim().toLowerCase();
}

function hasAnyTag(task: Task, tags: string[]) {
  const set = new Set((task.tags ?? []).map((t) => norm(t)));
  return tags.some((t) => set.has(norm(t)));
}

export function matchesSearch(task: Task, term: string) {
  const t = norm(term);
  if (!t) return true;
  return (
    task.description.toLowerCase().includes(t) ||
    (task.assignee ?? "").toLowerCase().includes(t) ||
    (task.tags ?? []).some((x) => x.toLowerCase().includes(t))
  );
}

export function matchesFilter(task: Task, filterBy: FilterBy) {
  switch (filterBy) {
    case "all_feedback":
      return true;
    case "design_feedback":
      // Heuristic: treat tags as categories for now
      return hasAnyTag(task, ["design", "ui", "ux"]);
    case "website_feedback":
      return hasAnyTag(task, ["website", "web"]);
    case "mentioned":
      return /@\w+/.test(task.description) || hasAnyTag(task, ["mentioned"]);
    case "unread_comments":
      return hasAnyTag(task, ["unread", "unread-comments", "unread_comments"]);
  }
}

function severityWeight(s: Task["severity"]) {
  switch (s) {
    case "critical":
      return 0;
    case "important":
      return 1;
    case "normal":
      return 2;
    case "minor":
      return 3;
  }
}

function parseDueDate(task: Task): number | null {
  // Tag format: due:YYYY-MM-DD
  for (const raw of task.tags ?? []) {
    const t = raw.trim();
    const m = /^due:(\d{4}-\d{2}-\d{2})$/i.exec(t);
    if (!m) continue;
    const d = new Date(`${m[1]}T00:00:00.000Z`);
    const ms = d.getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return null;
}

export function sortTasks(tasks: Task[], sortBy: SortBy) {
  const copy = [...tasks];
  switch (sortBy) {
    case "manually":
      return copy.sort((a, b) => a.position - b.position);
    case "severity":
      return copy.sort((a, b) => severityWeight(a.severity) - severityWeight(b.severity) || a.position - b.position);
    case "due_date":
      return copy.sort((a, b) => {
        const da = parseDueDate(a);
        const db = parseDueDate(b);
        if (da === null && db === null) return a.position - b.position;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db || a.position - b.position;
      });
    case "time_created":
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "assigned_to":
      return copy.sort((a, b) => (a.assignee ?? "").localeCompare(b.assignee ?? "") || a.position - b.position);
    case "last_modified":
      return copy.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }
}

