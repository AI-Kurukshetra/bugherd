"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreHorizontal, Plus, SquareCheckBig, Trash2, Pencil } from "lucide-react";

import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import { TaskCard } from "@/components/kanban/task-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function KanbanColumn({
  title,
  tasks,
  onEditTask,
  columnId,
  selectedTaskIds,
  dndDisabled,
  onSelectAllTasks,
  onAddTask,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
}: {
  title: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  columnId: string;
  selectedTaskIds: Set<string>;
  dndDisabled: boolean;
  onSelectAllTasks: () => void;
  onAddTask: () => void;
  onAddColumn: () => void;
  onRenameColumn: () => void;
  onDeleteColumn: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { type: "column" },
    disabled: dndDisabled,
  });

  return (
    <div className="min-w-[280px] max-w-[360px] flex-1">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-sm font-semibold tracking-wide text-zinc-700">{title}</div>
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-zinc-200/80 px-2 py-0.5 text-xs font-medium text-zinc-700">
            {tasks.length}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Column actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSelectAllTasks}>
                <SquareCheckBig className="h-4 w-4" />
                Select All Tasks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddTask}>
                <Plus className="h-4 w-4" />
                Add Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddColumn}>
                <Plus className="h-4 w-4" />
                Add Column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRenameColumn}>
                <Pencil className="h-4 w-4" />
                Rename Column
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-700 focus:text-red-700"
                onClick={onDeleteColumn}
              >
                <Trash2 className="h-4 w-4" />
                Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "rounded-xl bg-[#dfe6ef] p-2",
          isOver && "ring-2 ring-sky-400 ring-offset-2 ring-offset-[#eef1f5]",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                selected={selectedTaskIds.has(task.id)}
                dndDisabled={dndDisabled}
              />
            ))}
            {tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white/40 px-3 py-6 text-center text-xs text-zinc-500">
                Drop tasks here
              </div>
            ) : null}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

