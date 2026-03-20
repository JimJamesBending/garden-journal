import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGardenId,
  getCareEvents,
  createCareEvent,
} from "@/lib/supabase/queries";
import { CareEventType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plantId = searchParams.get("plantId") || undefined;

  const supabase = await createClient();
  const gardenId = await getGardenId(supabase);

  const events = await getCareEvents(supabase, gardenId, plantId);

  return NextResponse.json(events);
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
  const { plantId, type, notes, quantity, date } = body;

  if (!plantId || !type) {
    return NextResponse.json(
      { error: "plantId and type are required" },
      { status: 400 }
    );
  }

  const validTypes: CareEventType[] = [
    "watered", "fed", "pruned", "repotted", "treated", "harvested", "observed",
  ];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const gardenId = await getGardenId(supabase);

  const event = await createCareEvent(supabase, gardenId, {
    plantId,
    type: type as CareEventType,
    date: date || new Date().toISOString().split("T")[0],
    notes: notes || "",
    quantity: quantity || "",
  });

  return NextResponse.json(event, { status: 201 });
}
