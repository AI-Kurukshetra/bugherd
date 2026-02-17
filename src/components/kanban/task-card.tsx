"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2 } from "lucide-react";

import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function severityClass(severity: Task["severity"]) {
  switch (severity) {
    case "critical":
      return "border-l-red-600";
    case "important":
      return "border-l-orange-600";
    case "normal":
      return "border-l-sky-600";
    case "minor":
      return "border-l-zinc-500";
    default:
      return "border-l-zinc-300";
  }
}

export function TaskCard({
  task,
  onEdit,
  selected,
  dndDisabled,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  selected?: boolean;
  dndDisabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", columnId: task.column_id },
    disabled: !!dndDisabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-zinc-200 bg-white shadow-sm",
        "border-l-4",
        severityClass(task.severity),
        isDragging && "opacity-60",
        selected && "ring-2 ring-sky-400",
      )}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onEdit(task)}
    >
      <div className="p-3">
        {selected ? (
          <div className="mb-1 flex items-center gap-1 text-xs font-medium text-sky-700">
            <CheckCircle2 className="h-4 w-4" />
            Selected
          </div>
        ) : null}
        <div className="line-clamp-3 text-sm font-medium text-zinc-900">{task.description}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={task.severity}>{task.severity}</Badge>
          {task.assignee ? (
            <Badge variant="outline" className="text-zinc-700">
              {task.assignee}
            </Badge>
          ) : null}
        </div>
        {task.tags?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.tags.slice(0, 6).map((t, idx) => (
              <Badge key={`${task.id}-tag-${idx}`} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

