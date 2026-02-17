import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { updateTaskSchema } from "@/lib/validation/tasks";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { supabase, withCookies } = createSupabaseRouteClient(request);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return withCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const json = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(json);
  if (!parsed.success) {
    return withCookies(
      NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 }),
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return withCookies(NextResponse.json({ error: "Failed to update task" }, { status: 500 }));
  }

  return withCookies(NextResponse.json({ task: data }));
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { supabase, withCookies } = createSupabaseRouteClient(request);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return withCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) {
    return withCookies(NextResponse.json({ error: "Failed to delete task" }, { status: 500 }));
  }

  return withCookies(NextResponse.json({ ok: true }));
}

