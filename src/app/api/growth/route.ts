import { NextRequest, NextResponse } from "next/server";
import { getGrowth, saveGrowth } from "@/lib/blob";
import { checkPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plantId = searchParams.get("plantId");

  let entries = await getGrowth();

  if (plantId) {
    entries = entries.filter((e) => e.plantId === plantId);
  }

  entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!body.plantId) {
    return NextResponse.json(
      { error: "plantId is required" },
      { status: 400 }
    );
  }

  const entry = {
    id: `growth-${Date.now()}`,
    plantId: body.plantId,
    date: body.date || new Date().toISOString().split("T")[0],
    heightCm: body.heightCm ?? null,
    leafCount: body.leafCount ?? null,
    healthScore: body.healthScore ?? null,
    notes: body.notes || "",
  };

  const existing = await getGrowth();
  existing.push(entry);
  await saveGrowth(existing);

  return NextResponse.json(entry, { status: 201 });
}
