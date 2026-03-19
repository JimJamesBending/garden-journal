import { NextRequest, NextResponse } from "next/server";
import { getSoilReadings, saveSoilReadings } from "@/lib/blob";
import { checkPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plantId = searchParams.get("plantId");

  let readings = await getSoilReadings();

  if (plantId) {
    readings = readings.filter((r) => r.plantId === plantId);
  }

  readings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(readings);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plantId, ph, nitrogen, phosphorus, potassium, moisture, notes, date } = body;

  if (!plantId) {
    return NextResponse.json(
      { error: "plantId is required" },
      { status: 400 }
    );
  }

  const reading = {
    id: `soil-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    plantId,
    date: date || new Date().toISOString().split("T")[0],
    ph: ph ?? null,
    nitrogen: nitrogen ?? null,
    phosphorus: phosphorus ?? null,
    potassium: potassium ?? null,
    moisture: moisture ?? null,
    notes: notes || "",
  };

  const readings = await getSoilReadings();
  readings.push(reading);
  await saveSoilReadings(readings);

  return NextResponse.json(reading, { status: 201 });
}
