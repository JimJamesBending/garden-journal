import { NextRequest, NextResponse } from "next/server";
import { getLogs, saveLogs } from "@/lib/blob";
import { checkPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plantId = searchParams.get("plantId");
  const unlabeled = searchParams.get("unlabeled");

  let logs = await getLogs();

  if (plantId) {
    logs = logs.filter((l) => l.plantId === plantId);
  }

  if (unlabeled === "true") {
    logs = logs.filter((l) => !l.labeled || !l.plantId || !l.caption);
  }

  // Sort newest first
  logs.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await getLogs();

  // Support batch upload: body.entries[] or single entry
  const entries = body.entries || [body];
  const created = [];

  for (const entry of entries) {
    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      plantId: entry.plantId || "",
      date: entry.date || new Date().toISOString().split("T")[0],
      cloudinaryUrl: entry.cloudinaryUrl || "",
      caption: entry.caption || "",
      status: entry.status || "sowed",
      labeled: !!(entry.plantId && entry.caption),
    };
    existing.push(logEntry);
    created.push(logEntry);
  }

  await saveLogs(existing);

  return NextResponse.json(
    created.length === 1 ? created[0] : created,
    { status: 201 }
  );
}
