import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { reorderSchema } from "@/lib/validation/tasks";

export async function PATCH(request: NextRequest) {
  const { supabase, withCookies } = createSupabaseRouteClient(request);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return withCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const json = await request.json().catch(() => null);
  const parsed = reorderSchema.safeParse(json);
  if (!parsed.success) {
    return withCookies(
      NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 }),
    );
  }

  for (const item of parsed.data.items) {
    const { error } = await supabase
      .from("tasks")
      .update({ column_id: item.column_id, position: item.position })
      .eq("id", item.id);
    if (error) {
      return withCookies(NextResponse.json({ error: "Failed to reorder tasks" }, { status: 500 }));
    }
  }

  return withCookies(NextResponse.json({ ok: true }));
}

