import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { renameColumnSchema } from "@/lib/validation/columns";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { supabase, withCookies } = createSupabaseRouteClient(request);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return withCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const json = await request.json().catch(() => null);
  const parsed = renameColumnSchema.safeParse(json);
  if (!parsed.success) {
    return withCookies(
      NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 }),
    );
  }

  const { data, error } = await supabase
    .from("kanban_columns")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const msg =
      error.code === "23505"
        ? "Column name already exists"
        : process.env.NODE_ENV !== "production"
          ? `Failed to rename column: ${error.message}`
          : "Failed to rename column";
    return withCookies(NextResponse.json({ error: msg }, { status }));
  }

  return withCookies(NextResponse.json({ column: data }));
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { supabase, withCookies } = createSupabaseRouteClient(request);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return withCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { error } = await supabase.from("kanban_columns").delete().eq("id", id);
  if (error) {
    return withCookies(
      NextResponse.json(
        {
          error:
            process.env.NODE_ENV !== "production"
              ? `Failed to delete column: ${error.message}`
              : "Failed to delete column",
        },
        { status: 500 },
      ),
    );
  }

  return withCookies(NextResponse.json({ ok: true }));
}

