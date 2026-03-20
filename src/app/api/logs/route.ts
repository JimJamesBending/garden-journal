import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGardenId,
  getLogs,
  createLog,
  createLogsBatch,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plantId = searchParams.get("plantId") || undefined;
  const unlabeled = searchParams.get("unlabeled") === "true" || undefined;

  const supabase = await createClient();
  const gardenId = await getGardenId(supabase);

  const logs = await getLogs(supabase, gardenId, { plantId, unlabeled });

  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const gardenId = await getGardenId(supabase);

  // Support batch upload: body.entries[] or single entry
  const entries = body.entries || [body];

  if (entries.length > 1) {
    const logs = entries.map((entry: Record<string, unknown>) => ({
      plantId: entry.plantId || "",
      date: entry.date || new Date().toISOString().split("T")[0],
      cloudinaryUrl: entry.cloudinaryUrl || "",
      caption: entry.caption || "",
      status: entry.status || "sowed",
      labeled: !!(entry.plantId && entry.caption),
    }));

    const created = await createLogsBatch(supabase, gardenId, logs);
    return NextResponse.json(created, { status: 201 });
  }

  const entry = entries[0];
  const log = await createLog(supabase, gardenId, {
    plantId: entry.plantId || "",
    date: entry.date || new Date().toISOString().split("T")[0],
    cloudinaryUrl: entry.cloudinaryUrl || "",
    caption: entry.caption || "",
    status: entry.status || "sowed",
    labeled: !!(entry.plantId && entry.caption),
  });

  return NextResponse.json(log, { status: 201 });
}
