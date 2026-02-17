"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Plus } from "lucide-react";

import type { KanbanColumn } from "@/types/kanban";
import type { Task } from "@/types/task";
import { TASK_SEVERITIES } from "@/types/task";
import { createTaskSchema } from "@/lib/validation/tasks";
import { fetchJson } from "@/lib/client/fetch-json";
import { TagInput } from "@/components/common/tag-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormValues = import("zod").input<typeof createTaskSchema>;

export function AddTaskDialog({
  columns,
  onCreated,
  defaultColumnId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger,
}: {
  columns: KanbanColumn[];
  onCreated: (task: Task) => void;
  defaultColumnId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      description: "",
      assignee: "",
      severity: "normal",
      column_id: defaultColumnId ?? columns[0]?.id ?? "",
      tags: [],
    },
  });

  const severity = useWatch({ control: form.control, name: "severity" }) ?? "normal";
  const columnId = useWatch({ control: form.control, name: "column_id" }) ?? columns[0]?.id ?? "";
  const tags = useWatch({ control: form.control, name: "tags" }) ?? [];

  React.useEffect(() => {
    if (!open) return;
    const desired = defaultColumnId ?? columns[0]?.id;
    if (desired && form.getValues("column_id") !== desired) {
      form.setValue("column_id", desired);
    }
  }, [columns, defaultColumnId, form, open]);

  async function submit(values: FormValues) {
    setError(null);
    try {
      const parsed = createTaskSchema.parse(values);
      const res = await fetchJson<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
      onCreated(res.task);
      setOpen(false);
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger ? (
        <DialogTrigger asChild>
          <Button>
            <Plus />
            Add Task
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="p-0">
        <div className="grid grid-cols-[1fr_320px] gap-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Bacancy First Project</DialogTitle>
              <DialogDescription>Create a new task on the board.</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              <Label htmlFor="description">Add description</Label>
              <Textarea id="description" {...form.register("description")} />
              {form.formState.errors.description ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.description.message as string}
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-l border-zinc-200 bg-white p-6">
            <div className="space-y-4">
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="assignee">Assignee(s)</Label>
                <Input id="assignee" placeholder="Assignee(s)" {...form.register("assignee")} />
              </div>

              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select
                  value={severity}
                  onValueChange={(v) => form.setValue("severity", v as Task["severity"])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={columnId}
                  onValueChange={(v) => form.setValue("column_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Tag(s)</Label>
                <TagInput
                  value={tags ?? []}
                  onChange={(next) => form.setValue("tags", next)}
                  placeholder="Tag(s)"
                />
              </div>

              <Button
                className="w-full"
                onClick={form.handleSubmit(submit)}
                disabled={form.formState.isSubmitting}
              >
                Create task
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

