"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import type { KanbanColumn as KanbanColumnType } from "@/types/kanban";
import type { Task } from "@/types/task";
import { fetchJson } from "@/lib/client/fetch-json";
import type { FilterBy, SortBy } from "@/lib/kanban/task-query";
import { matchesFilter, matchesSearch, sortTasks } from "@/lib/kanban/task-query";
import { cn } from "@/lib/utils";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { AddColumnControl } from "@/components/kanban/add-column-control";
import { DeleteColumnDialog } from "@/components/kanban/delete-column-dialog";
import { RenameColumnDialog } from "@/components/kanban/rename-column-dialog";
import { AddTaskDialog } from "@/components/tasks/add-task-dialog";
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, X } from "lucide-react";

type TasksByColumn = Record<string, Task[]>;

function toTasksByColumn(cols: KanbanColumnType[], tasks: Task[]): TasksByColumn {
  const map: TasksByColumn = {};
  for (const c of cols) map[c.id] = [];
  for (const t of tasks) {
    (map[t.column_id] ??= []).push(t);
  }
  for (const id of Object.keys(map)) {
    map[id].sort((a, b) => a.position - b.position);
  }
  return map;
}

function findContainer(taskMap: TasksByColumn, columnIds: string[], id: string): string | null {
  if (columnIds.includes(id)) return id;
  for (const colId of columnIds) {
    if (taskMap[colId]?.some((t) => t.id === id)) return colId;
  }
  return null;
}

export function KanbanBoard({
  initialColumns,
  initialTasks,
}: {
  initialColumns: KanbanColumnType[];
  initialTasks: Task[];
}) {
  const [columns, setColumns] = React.useState<KanbanColumnType[]>(() =>
    [...initialColumns].sort((a, b) => a.position - b.position),
  );
  const columnIds = React.useMemo(() => columns.map((c) => c.id), [columns]);

  const [tasksByColumn, setTasksByColumn] = React.useState<TasksByColumn>(() =>
    toTasksByColumn(initialColumns, initialTasks),
  );
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [lastRefreshAt, setLastRefreshAt] = React.useState<number | null>(Date.now());
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(() => new Set());
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterBy, setFilterBy] = React.useState<FilterBy>("all_feedback");
  const [sortBy, setSortBy] = React.useState<SortBy>("manually");

  const [addTaskOpen, setAddTaskOpen] = React.useState(false);
  const [addTaskColumnId, setAddTaskColumnId] = React.useState<string | null>(null);
  const [addColumnOpenSignal, setAddColumnOpenSignal] = React.useState(0);
  const [renamingColumnId, setRenamingColumnId] = React.useState<string | null>(null);
  const [deletingColumnId, setDeletingColumnId] = React.useState<string | null>(null);
  const [isDeletingColumn, setIsDeletingColumn] = React.useState(false);
  const [deleteColumnError, setDeleteColumnError] = React.useState<string | null>(null);

  const renamingColumn = React.useMemo(
    () => columns.find((c) => c.id === renamingColumnId) ?? null,
    [columns, renamingColumnId],
  );

  const deletingColumn = React.useMemo(
    () => columns.find((c) => c.id === deletingColumnId) ?? null,
    [columns, deletingColumnId],
  );

  const editingTask = React.useMemo(() => {
    if (!editingTaskId) return null;
    for (const colId of columnIds) {
      const t = tasksByColumn[colId]?.find((x) => x.id === editingTaskId);
      if (t) return t;
    }
    return null;
  }, [columnIds, editingTaskId, tasksByColumn]);

  const dndDisabled = sortBy !== "manually";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persistFrom = React.useCallback(async (next: TasksByColumn, affectedColumnIds: string[]) => {
    const items = affectedColumnIds
      .flatMap((colId) =>
        (next[colId] ?? []).map((t, idx) => ({
          id: t.id,
          column_id: colId,
          position: idx,
        })),
      )
      .reduce<{ id: string; column_id: string; position: number }[]>((acc, item) => {
        if (!acc.some((x) => x.id === item.id)) acc.push(item);
        return acc;
      }, []);

    setIsSyncing(true);
    try {
      await fetchJson<{ ok: true }>("/api/tasks/reorder", {
        method: "PATCH",
        body: JSON.stringify({ items }),
      });
    } catch {
      // On failure, refresh state from server.
      try {
        const [colsRes, tasksRes] = await Promise.all([
          fetchJson<{ columns: KanbanColumnType[] }>("/api/columns", { method: "GET" }),
          fetchJson<{ tasks: Task[] }>("/api/tasks", { method: "GET" }),
        ]);
        setColumns([...colsRes.columns].sort((a, b) => a.position - b.position));
        setTasksByColumn(toTasksByColumn(colsRes.columns, tasksRes.tasks));
      } catch {
        // ignore
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const refreshFromServer = React.useCallback(async () => {
    // Don't interrupt in-flight writes.
    if (isSyncing) return;
    try {
      const [colsRes, tasksRes] = await Promise.all([
        fetchJson<{ columns: KanbanColumnType[] }>("/api/columns", { method: "GET" }),
        fetchJson<{ tasks: Task[] }>("/api/tasks", { method: "GET" }),
      ]);

      const nextCols = [...colsRes.columns].sort((a, b) => a.position - b.position);
      const nextTasks = tasksRes.tasks ?? [];

      setColumns(nextCols);
      setTasksByColumn(toTasksByColumn(nextCols, nextTasks));

      const ids = new Set(nextTasks.map((t) => t.id));
      setSelectedTaskIds((prev) => new Set([...prev].filter((id) => ids.has(id))));
      setLastRefreshAt(Date.now());
    } catch {
      // ignore background refresh failures
    }
  }, [isSyncing]);

  React.useEffect(() => {
    const onFocus = () => void refreshFromServer();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshFromServer();
    }, 7000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [refreshFromServer]);

  async function confirmDeleteColumn() {
    if (!deletingColumn) return;
    setIsDeletingColumn(true);
    setDeleteColumnError(null);

    const colId = deletingColumn.id;
    const removedTaskIds = new Set((tasksByColumn[colId] ?? []).map((t) => t.id));

    try {
      await fetchJson<{ ok: true }>(`/api/columns/${colId}`, { method: "DELETE" });
      setColumns((prev) => prev.filter((c) => c.id !== colId));
      setTasksByColumn((prev) => {
        const next = { ...prev };
        delete next[colId];
        return next;
      });
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        removedTaskIds.forEach((id) => next.delete(id));
        return next;
      });
      setEditingTaskId((prev) => (prev && removedTaskIds.has(prev) ? null : prev));
      setDeletingColumnId(null);
    } catch (e) {
      setDeleteColumnError(e instanceof Error ? e.message : "Failed to delete column");
    } finally {
      setIsDeletingColumn(false);
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainer(tasksByColumn, columnIds, activeId);
    const overContainer = findContainer(tasksByColumn, columnIds, overId);
    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    setTasksByColumn((prev) => {
      const next: TasksByColumn = { ...prev };
      const activeTasks = [...(next[activeContainer] ?? [])];
      const overTasks = [...(next[overContainer] ?? [])];

      const activeIndex = activeTasks.findIndex((t) => t.id === activeId);
      const overIndex = overTasks.findIndex((t) => t.id === overId);

      const [moved] = activeTasks.splice(activeIndex, 1);
      moved.column_id = overContainer;

      const insertAt = overIndex >= 0 ? overIndex : overTasks.length;
      overTasks.splice(insertAt, 0, moved);

      next[activeContainer] = activeTasks;
      next[overContainer] = overTasks;
      return next;
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainer(tasksByColumn, columnIds, activeId);
    const overContainer = findContainer(tasksByColumn, columnIds, overId);
    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      const list = tasksByColumn[activeContainer] ?? [];
      const activeIndex = list.findIndex((t) => t.id === activeId);
      const rawOverIndex = list.findIndex((t) => t.id === overId);
      const overIndex =
        rawOverIndex >= 0 ? rawOverIndex : Math.max(list.length - 1, 0);
      if (activeIndex === overIndex) return;

      setTasksByColumn((prev) => {
        const next: TasksByColumn = {
          ...prev,
          [activeContainer]: arrayMove(prev[activeContainer] ?? [], activeIndex, overIndex),
        };
        void persistFrom(next, [activeContainer]);
        return next;
      });
      return;
    }

    // Cross-column: positions already updated in onDragOver; persist both columns.
    setTasksByColumn((prev) => {
      void persistFrom(prev, [activeContainer, overContainer]);
      return prev;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-zinc-900">Bacancy First Project</div>
          <div className="text-sm text-zinc-500">Kanban board</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-500">
            {isSyncing
              ? "Saving…"
              : lastRefreshAt
                ? `Synced ${Math.max(0, Math.round((Date.now() - lastRefreshAt) / 1000))}s ago`
                : null}
          </div>
          <AddTaskDialog
            columns={columns}
            onCreated={(task) => {
              setTasksByColumn((prev) => ({
                ...prev,
                [task.column_id]: [...(prev[task.column_id] ?? []), task],
              }));
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="pl-9 pr-9"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Filter and sort">
              <SlidersHorizontal />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[320px]">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Filter by
                </div>
                <div className="space-y-1">
                  {(
                    [
                      ["all_feedback", "All feedback"],
                      ["design_feedback", "Design feedback"],
                      ["website_feedback", "Website feedback"],
                      ["mentioned", "Mentioned"],
                      ["unread_comments", "Unread comments"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilterBy(id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-zinc-100",
                        filterBy === id && "bg-zinc-100",
                      )}
                    >
                      <span
                        className={cn(
                          "h-4 w-4 rounded-full border border-zinc-300",
                          filterBy === id && "border-sky-600 ring-4 ring-sky-100",
                        )}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Sort by
                </div>
                <div className="space-y-1">
                  {(
                    [
                      ["manually", "manually"],
                      ["severity", "severity"],
                      ["due_date", "due date"],
                      ["time_created", "time created"],
                      ["assigned_to", "assigned to"],
                      ["last_modified", "last modified"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSortBy(id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-zinc-100",
                        sortBy === id && "bg-zinc-100",
                      )}
                    >
                      <span
                        className={cn(
                          "h-4 w-4 rounded-full border border-zinc-300",
                          sortBy === id && "border-sky-600 ring-4 ring-sky-100",
                        )}
                      />
                      {label}
                    </button>
                  ))}
                </div>
                {dndDisabled ? (
                  <div className="text-xs text-zinc-500">
                    Drag &amp; drop is disabled while sorting.
                  </div>
                ) : null}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={columnIds}>
          <div
            className={cn(
              "flex gap-4 overflow-x-auto pb-2",
              "[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300/70",
            )}
          >
            {columns.map((col) => {
              const raw = tasksByColumn[col.id] ?? [];
              const filtered = raw
                .filter((t) => matchesSearch(t, searchTerm))
                .filter((t) => matchesFilter(t, filterBy));
              const sorted = sortTasks(filtered, sortBy);

              return (
                <KanbanColumn
                  key={col.id}
                  columnId={col.id}
                  title={col.name}
                  tasks={sorted}
                  onEditTask={(task) => setEditingTaskId(task.id)}
                  selectedTaskIds={selectedTaskIds}
                  dndDisabled={dndDisabled}
                  onSelectAllTasks={() => {
                    setSelectedTaskIds((prev) => {
                      const next = new Set(prev);
                      const tasks = sorted;
                      const allSelected = tasks.length > 0 && tasks.every((t) => next.has(t.id));
                      if (allSelected) {
                        tasks.forEach((t) => next.delete(t.id));
                      } else {
                        tasks.forEach((t) => next.add(t.id));
                      }
                      return next;
                    });
                  }}
                  onAddTask={() => {
                    setAddTaskColumnId(col.id);
                    setAddTaskOpen(true);
                  }}
                  onAddColumn={() => setAddColumnOpenSignal((x) => x + 1)}
                  onRenameColumn={() => setRenamingColumnId(col.id)}
                  onDeleteColumn={() => {
                    setDeleteColumnError(null);
                    setDeletingColumnId(col.id);
                  }}
                />
              );
            })}
            <AddColumnControl
              openSignal={addColumnOpenSignal}
              onCreated={(column) => {
                setColumns((prev) => [...prev, column].sort((a, b) => a.position - b.position));
                setTasksByColumn((prev) => ({ ...prev, [column.id]: prev[column.id] ?? [] }));
              }}
            />
          </div>
        </SortableContext>
      </DndContext>

      <RenameColumnDialog
        column={renamingColumn}
        open={!!renamingColumnId}
        onOpenChange={(open) => {
          if (!open) setRenamingColumnId(null);
        }}
        onRenamed={(col) => {
          setColumns((prev) => prev.map((c) => (c.id === col.id ? { ...c, name: col.name } : c)));
        }}
      />

      <DeleteColumnDialog
        column={deletingColumn}
        open={!!deletingColumnId}
        onOpenChange={(open) => {
          if (!open) setDeletingColumnId(null);
        }}
        onConfirm={() => void confirmDeleteColumn()}
        isDeleting={isDeletingColumn}
        error={deleteColumnError}
      />

      <AddTaskDialog
        hideTrigger
        open={addTaskOpen}
        onOpenChange={(open) => setAddTaskOpen(open)}
        defaultColumnId={addTaskColumnId ?? undefined}
        columns={columns}
        onCreated={(task) => {
          setTasksByColumn((prev) => ({
            ...prev,
            [task.column_id]: [...(prev[task.column_id] ?? []), task],
          }));
        }}
      />

      <EditTaskDialog
        task={editingTask}
        columns={columns}
        open={!!editingTaskId}
        onOpenChange={(open) => {
          if (!open) setEditingTaskId(null);
        }}
        onUpdated={(updated) => {
          setTasksByColumn((prev) => {
            let from: string | null = null;
            for (const colId of Object.keys(prev)) {
              if ((prev[colId] ?? []).some((t) => t.id === updated.id)) {
                from = colId;
                break;
              }
            }

            const base: TasksByColumn = { ...prev };
            for (const colId of Object.keys(base)) {
              base[colId] = (base[colId] ?? []).filter((t) => t.id !== updated.id);
            }

            const to = updated.column_id;
            base[to] = [...(base[to] ?? []), { ...updated, position: (base[to] ?? []).length }];

            const affected = from && from !== to ? [from, to] : [to];
            void persistFrom(base, affected);
            return base;
          });
        }}
      />
    </div>
  );
}

