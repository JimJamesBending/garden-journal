import { NextRequest, NextResponse } from "next/server";
import { getCareEvents, saveCareEvents } from "@/lib/blob";
import { checkPassword } from "@/lib/auth";
import { CareEventType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plantId = searchParams.get("plantId");

  let events = await getCareEvents();

  if (plantId) {
    events = events.filter((e) => e.plantId === plantId);
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const event = {
    id: `care-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    plantId,
    type: type as CareEventType,
    date: date || new Date().toISOString().split("T")[0],
    notes: notes || "",
    quantity: quantity || "",
  };

  const events = await getCareEvents();
  events.push(event);
  await saveCareEvents(events);

  return NextResponse.json(event, { status: 201 });
}
