import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { Task } from "@/types/task";
import type { KanbanColumn } from "@/types/kanban";
import { DEFAULT_COLUMNS } from "@/lib/kanban/defaults";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  // Ensure default columns exist for this user.
  const { data: existingColumns, error: colErr } = await supabase
    .from("kanban_columns")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (colErr) {
    const msg = colErr.message?.includes("kanban_columns")
      ? "Database is missing `kanban_columns`. Run the latest `supabase/schema.sql` (or migration) in Supabase SQL editor."
      : "Failed to load columns.";
    return (
      <div className="space-y-2 text-sm text-red-700">
        <div>{msg}</div>
        {process.env.NODE_ENV !== "production" ? (
          <pre className="max-w-full overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            {colErr.message}
          </pre>
        ) : null}
      </div>
    );
  }

  let columns = (existingColumns ?? []) as KanbanColumn[];
  if (columns.length === 0) {
    const { data: created, error: createErr } = await supabase
      .from("kanban_columns")
      .insert(
        DEFAULT_COLUMNS.map((c) => ({
          user_id: data.user.id,
          name: c.name,
          position: c.position,
        })),
      )
      .select("*")
      .order("position", { ascending: true });

    if (createErr) {
      return (
        <div className="space-y-2 text-sm text-red-700">
          <div>Failed to initialize columns.</div>
          {process.env.NODE_ENV !== "production" ? (
            <pre className="max-w-full overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
              {createErr.message}
            </pre>
          ) : null}
        </div>
      );
    }
    columns = (created ?? []) as KanbanColumn[];
  }

  const { data: tasks, error: taskErr } = await supabase
    .from("tasks")
    .select("*")
    .order("column_id", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (taskErr) {
    // Keep error non-sensitive for users.
    return (
      <div className="space-y-2 text-sm text-red-700">
        <div>Failed to load tasks.</div>
        {process.env.NODE_ENV !== "production" ? (
          <pre className="max-w-full overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            {taskErr.message}
          </pre>
        ) : null}
      </div>
    );
  }

  return (
    <KanbanBoard
      initialColumns={columns}
      initialTasks={(tasks ?? []) as Task[]}
    />
  );
}

