import { NextRequest, NextResponse } from "next/server";
import { getLogs, saveLogs } from "@/lib/blob";
import { checkPassword } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const logs = await getLogs();
  const log = logs.find((l) => l.id === id);

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
  const body = await request.json();

  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await getLogs();
  const index = logs.findIndex((l) => l.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { password, ...updates } = body;

  // Auto-set labeled if plantId and caption are now present
  if (updates.plantId && updates.caption) {
    updates.labeled = true;
  }

  logs[index] = { ...logs[index], ...updates };
  await saveLogs(logs);

  return NextResponse.json(logs[index]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await getLogs();
  const filtered = logs.filter((l) => l.id !== id);
  if (filtered.length === logs.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await saveLogs(filtered);
  return NextResponse.json({ ok: true });
}
