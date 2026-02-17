"use client";

import * as React from "react";

import type { KanbanColumn } from "@/types/kanban";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DeleteColumnDialog({
  column,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  error,
}: {
  column: KanbanColumn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  error: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete column</DialogTitle>
          <DialogDescription>
            {column ? (
              <>
                You are about to delete <span className="font-medium text-zinc-900">“{column.name}”</span>.
                All tasks inside this column will be removed. This action can’t be undone.
              </>
            ) : (
              "This action can’t be undone."
            )}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            type="button"
            onClick={onConfirm}
            disabled={!column || isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

