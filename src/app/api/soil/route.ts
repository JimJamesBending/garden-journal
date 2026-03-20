import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGardenId,
  getSoilReadings,
  createSoilReading,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plantId = searchParams.get("plantId") || undefined;

  const supabase = await createClient();
  const gardenId = await getGardenId(supabase);

  const readings = await getSoilReadings(supabase, gardenId, plantId);

  return NextResponse.json(readings);
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
  const { plantId, ph, nitrogen, phosphorus, potassium, moisture, notes, date } =
    body;

  if (!plantId) {
    return NextResponse.json(
      { error: "plantId is required" },
      { status: 400 }
    );
  }

  const gardenId = await getGardenId(supabase);

  const reading = await createSoilReading(supabase, gardenId, {
    plantId,
    date: date || new Date().toISOString().split("T")[0],
    ph: ph ?? null,
    nitrogen: nitrogen ?? null,
    phosphorus: phosphorus ?? null,
    potassium: potassium ?? null,
    moisture: moisture ?? null,
    notes: notes || "",
  });

  return NextResponse.json(reading, { status: 201 });
}
