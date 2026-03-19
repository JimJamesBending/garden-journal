import { NextRequest, NextResponse } from "next/server";
import { getPlants, savePlants } from "@/lib/blob";
import { checkPassword } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plants = await getPlants();
  const index = plants.findIndex((p) => p.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { password, ...updates } = body;
  plants[index] = { ...plants[index], ...updates };
  await savePlants(plants);

  return NextResponse.json(plants[index]);
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

  const plants = await getPlants();
  const filtered = plants.filter((p) => p.id !== id);
  if (filtered.length === plants.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await savePlants(filtered);
  return NextResponse.json({ ok: true });
}
