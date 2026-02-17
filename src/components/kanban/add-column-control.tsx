"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import type { KanbanColumn } from "@/types/kanban";
import { fetchJson } from "@/lib/client/fetch-json";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddColumnControl({
  onCreated,
  openSignal,
  className,
}: {
  onCreated: (column: KanbanColumn) => void;
  openSignal?: number;
  className?: string;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const prevOpenSignalRef = React.useRef<number | undefined>(undefined);
  const [isAdding, setIsAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof openSignal !== "number") return;
    // Only open when the signal changes (not on initial mount).
    if (prevOpenSignalRef.current === undefined) {
      prevOpenSignalRef.current = openSignal;
      return;
    }
    if (openSignal !== prevOpenSignalRef.current) {
      prevOpenSignalRef.current = openSignal;
      setIsAdding(true);
    }
  }, [openSignal]);

  React.useEffect(() => {
    if (!isAdding) return;
    // Ensure the control is visible and focus input reliably.
    rootRef.current?.scrollIntoView({ behavior: "smooth", inline: "end", block: "nearest" });
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isAdding]);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const res = await fetchJson<{ column: KanbanColumn }>("/api/columns", {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      onCreated(res.column);
      setName("");
      setIsAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create column");
    }
  }

  if (!isAdding) {
    return (
      <div ref={rootRef} className={cn("min-w-[280px] max-w-[360px] flex-1", className)}>
        <div className="mb-2 flex items-center justify-end px-1">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
            aria-label="Add column"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="rounded-xl bg-transparent p-2" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("min-w-[280px] max-w-[360px] flex-1", className)}>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New column name"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void create();
            } else if (e.key === "Escape") {
              setIsAdding(false);
              setName("");
              setError(null);
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => {
            setIsAdding(false);
            setName("");
            setError(null);
          }}
          aria-label="Cancel add column"
        >
          <X />
        </Button>
      </div>
      {error ? (
        <div className="px-1 text-xs text-red-600">{error}</div>
      ) : (
        <div className="px-1 text-xs text-zinc-500">Press Enter to create.</div>
      )}
    </div>
  );
}

