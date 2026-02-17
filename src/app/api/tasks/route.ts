import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createTaskSchema } from "@/lib/validation/tasks";

export async function GET(request: NextRequest) {
  const { supabase, withCookies } = createSupabaseRouteClient(request);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return withCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("column_id", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return withCookies(NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 }));
  }

  return withCookies(NextResponse.json({ tasks: data }));
}

export async function POST(request: NextRequest) {
  const { supabase, withCookies } = createSupabaseRouteClient(request);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return withCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const json = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(json);
  if (!parsed.success) {
    return withCookies(
      NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 }),
    );
  }

  // Determine next position in the target column.
  const { data: maxRow } = await supabase
    .from("tasks")
    .select("position")
    .eq("column_id", parsed.data.column_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPos = ((maxRow?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: auth.user.id,
      description: parsed.data.description,
      assignee: parsed.data.assignee ?? null,
      severity: parsed.data.severity,
      column_id: parsed.data.column_id,
      tags: parsed.data.tags,
      position: nextPos,
    })
    .select("*")
    .single();

  if (error) {
    return withCookies(NextResponse.json({ error: "Failed to create task" }, { status: 500 }));
  }

  return withCookies(NextResponse.json({ task: data }, { status: 201 }));
}

