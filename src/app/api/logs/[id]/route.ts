import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGardenId,
  getLogs,
  updateLog,
  deleteLog,
} from "@/lib/supabase/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const gardenId = await getGardenId(supabase);

  // Fetch all logs and find the one with matching id
  const logs = await getLogs(supabase, gardenId, {});
  const log = logs.find((l: { id: string }) => l.id === id);

  if (!log) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(log);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { password, ...updates } = body;

  // Auto-set labeled if plantId and caption are now present
  if (updates.plantId && updates.caption) {
    updates.labeled = true;
  }

  const log = await updateLog(supabase, id, updates);
  if (!log) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(log);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteLog(supabase, id);
  return NextResponse.json({ ok: true });
}
