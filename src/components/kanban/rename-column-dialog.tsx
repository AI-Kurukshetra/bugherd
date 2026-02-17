"use client";

import * as React from "react";

import type { KanbanColumn } from "@/types/kanban";
import { renameColumnSchema } from "@/lib/validation/columns";
import { fetchJson } from "@/lib/client/fetch-json";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RenameColumnDialog({
  column,
  open,
  onOpenChange,
  onRenamed,
}: {
  column: KanbanColumn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenamed: (column: KanbanColumn) => void;
}) {
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(column?.name ?? "");
    setError(null);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [column, open]);

  async function submit() {
    if (!column) return;
    setError(null);
    const parsed = renameColumnSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }
    try {
      const res = await fetchJson<{ column: KanbanColumn }>(`/api/columns/${column.id}`, {
        method: "PATCH",
        body: JSON.stringify(parsed.data),
      });
      onRenamed(res.column);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename column");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rename column</DialogTitle>
          <DialogDescription>Choose a new name for this column.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rename-column">Column name</Label>
          <Input
            id="rename-column"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New column name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
          {error ? <div className="text-xs text-red-600">{error}</div> : null}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={!column}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

