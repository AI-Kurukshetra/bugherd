"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import type { KanbanColumn } from "@/types/kanban";
import type { Task } from "@/types/task";
import { TASK_SEVERITIES } from "@/types/task";
import { createTaskSchema } from "@/lib/validation/tasks";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchJson } from "@/lib/client/fetch-json";
import { TagInput } from "@/components/common/tag-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormValues = import("zod").input<typeof createTaskSchema>;

export function EditTaskDialog({
  task,
  columns,
  open,
  onOpenChange,
  onUpdated,
}: {
  task: Task | null;
  columns: KanbanColumn[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (task: Task) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = React.useState<string | null>(null);
  const [attachmentFallbackUrl, setAttachmentFallbackUrl] = React.useState<string | null>(null);
  const [attachmentError, setAttachmentError] = React.useState<string | null>(null);
  const [attachmentLoading, setAttachmentLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      description: "",
      assignee: "",
      severity: "normal",
      column_id: "",
      tags: [],
    },
  });

  React.useEffect(() => {
    if (!task) return;
    form.reset({
      description: task.description ?? "",
      assignee: task.assignee ?? "",
      severity: task.severity,
      column_id: task.column_id,
      tags: task.tags ?? [],
    });
    setError(null);
  }, [form, task, open]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadAttachment() {
      setAttachmentError(null);
      setAttachmentUrl(null);
      setAttachmentFallbackUrl(null);

      if (!open || !task?.screenshot_path) return;

      setAttachmentLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const bucket = "task-screenshots";

        // Fallback for public buckets (or debugging).
        const pub = supabase.storage.from(bucket).getPublicUrl(task.screenshot_path);
        if (!cancelled) setAttachmentFallbackUrl(pub.data.publicUrl ?? null);

        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(task.screenshot_path, 60 * 10);

        if (error) throw new Error(error.message);
        if (!cancelled) setAttachmentUrl(data?.signedUrl ?? null);
      } catch (e) {
        if (!cancelled) {
          setAttachmentError(e instanceof Error ? e.message : "Failed to load attachment");
        }
      } finally {
        if (!cancelled) setAttachmentLoading(false);
      }
    }
    void loadAttachment();
    return () => {
      cancelled = true;
    };
  }, [open, task?.screenshot_path]);

  const severity = useWatch({ control: form.control, name: "severity" }) ?? "normal";
  const columnId = useWatch({ control: form.control, name: "column_id" }) ?? task?.column_id ?? "";
  const tags = useWatch({ control: form.control, name: "tags" }) ?? [];

  async function submit(values: FormValues) {
    if (!task) return;
    setError(null);
    try {
      const parsed = createTaskSchema.parse(values);
      const res = await fetchJson<{ task: Task }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(parsed),
      });
      onUpdated(res.task);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update task");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <div className="grid grid-cols-[1fr_320px] gap-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>Edit task</DialogTitle>
              <DialogDescription>Update details for this task.</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              <Label htmlFor="edit-description">Add description</Label>
              <Textarea id="edit-description" {...form.register("description")} />
              {form.formState.errors.description ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.description.message as string}
                </p>
              ) : null}
            </div>

            <div className="mt-6 space-y-2">
              <Label>Attachment</Label>
              {task?.screenshot_path ? (
                attachmentLoading ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-10 text-center text-sm text-zinc-500">
                    Loading attachment…
                  </div>
                ) : attachmentUrl || attachmentFallbackUrl ? (
                  <a
                    href={(attachmentUrl ?? attachmentFallbackUrl) as string}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-zinc-200 bg-black"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={(attachmentUrl ?? attachmentFallbackUrl) as string}
                      alt="Task attachment"
                      className="max-h-64 w-full object-contain"
                      onError={() => {
                        setAttachmentError("Attachment failed to load (check bucket/policies).");
                      }}
                    />
                  </a>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {attachmentError || "Attachment is not available."}
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-10 text-center text-sm text-zinc-500">
                  No Attachment
                </div>
              )}

              {task?.screenshot_path ? (
                <div className="break-all text-[11px] text-zinc-500">
                  Path: <span className="font-mono">{task.screenshot_path}</span>
                </div>
              ) : null}

              {task?.page_url ? (
                <a
                  className="text-xs font-medium text-sky-700 hover:underline"
                  href={task.page_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open page
                </a>
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
                <Label htmlFor="edit-assignee">Assignee(s)</Label>
                <Input
                  id="edit-assignee"
                  placeholder="Assignee(s)"
                  {...form.register("assignee")}
                />
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
                  value={tags}
                  onChange={(next) => form.setValue("tags", next)}
                  placeholder="Tag(s)"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="w-full"
                  type="button"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full"
                  onClick={form.handleSubmit(submit)}
                  disabled={form.formState.isSubmitting || !task}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

