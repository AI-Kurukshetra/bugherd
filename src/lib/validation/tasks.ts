import { z } from "zod";

import { TASK_SEVERITIES } from "@/types/task";

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .regex(/^[\p{L}\p{N}\s._-]+$/u, "Tag contains unsupported characters");

export const createTaskSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  assignee: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length ? v : undefined)),
  severity: z.enum(TASK_SEVERITIES).default("normal"),
  column_id: z.string().uuid(),
  tags: z.array(tagSchema).max(10).default([]),
}).strict();

export const updateTaskSchema = z
  .object({
    description: z.string().trim().min(1).max(2000).optional(),
    assignee: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional()
      .transform((v) => (v === "" ? null : v)),
    severity: z.enum(TASK_SEVERITIES).optional(),
    column_id: z.string().uuid().optional(),
    tags: z.array(tagSchema).max(10).optional(),
    position: z.number().int().min(0).max(1_000_000).optional(),
  })
  .strict();

export const reorderSchema = z.object({
  items: z
    .array(
      z
        .object({
          id: z.string().uuid(),
          column_id: z.string().uuid(),
          position: z.number().int().min(0).max(1_000_000),
        })
        .strict(),
    )
    .min(1)
    .max(200),
});

