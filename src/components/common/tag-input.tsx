"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  maxTags?: number;
};

function normalizeTag(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

export function TagInput({
  value,
  onChange,
  placeholder = "Type a tag and press Enter",
  className,
  maxTags = 10,
}: TagInputProps) {
  const [draft, setDraft] = React.useState("");

  const addTag = React.useCallback(() => {
    const t = normalizeTag(draft);
    if (!t) return;
    if (value.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setDraft("");
      return;
    }
    if (value.length >= maxTags) return;
    onChange([...value, t]);
    setDraft("");
  }, [draft, maxTags, onChange, value]);

  const removeAt = React.useCallback(
    (idx: number) => {
      onChange(value.filter((_, i) => i !== idx));
    },
    [onChange, value],
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-2">
        {value.map((t, idx) => (
          <Badge key={`${t}-${idx}`} variant="secondary" className="gap-1">
            {t}
            <button
              type="button"
              onClick={() => removeAt(idx)}
              className="ml-1 inline-flex rounded-full p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
              aria-label={`Remove tag ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag();
          } else if (e.key === "Backspace" && !draft && value.length) {
            removeAt(value.length - 1);
          }
        }}
      />
    </div>
  );
}

