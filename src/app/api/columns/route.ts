import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createColumnSchema } from "@/lib/validation/columns";

export async function GET(request: NextRequest) {
  const { supabase, withCookies } = createSupabaseRouteClient(request);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return withCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { data, error } = await supabase
    .from("kanban_columns")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return withCookies(
      NextResponse.json(
        {
          error:
            process.env.NODE_ENV !== "production"
              ? `Failed to fetch columns: ${error.message}`
              : "Failed to fetch columns",
        },
        { status: 500 },
      ),
    );
  }

  return withCookies(NextResponse.json({ columns: data }));
}

export async function POST(request: NextRequest) {
  const { supabase, withCookies } = createSupabaseRouteClient(request);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return withCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const json = await request.json().catch(() => null);
  const parsed = createColumnSchema.safeParse(json);
  if (!parsed.success) {
    return withCookies(
      NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 }),
    );
  }

  const { data: maxRow } = await supabase
    .from("kanban_columns")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPos = ((maxRow?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("kanban_columns")
    .insert({
      user_id: auth.user.id,
      name: parsed.data.name,
      position: nextPos,
    })
    .select("*")
    .single();

  if (error) {
    // likely unique constraint on name
    const status = error.code === "23505" ? 409 : 500;
    const msg =
      error.code === "23505"
        ? "Column name already exists"
        : process.env.NODE_ENV !== "production"
          ? `Failed to create column: ${error.message}`
          : "Failed to create column";
    return withCookies(NextResponse.json({ error: msg }, { status }));
  }

  return withCookies(NextResponse.json({ column: data }, { status: 201 }));
}

