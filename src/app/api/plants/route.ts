import { NextRequest, NextResponse } from "next/server";
import { getPlants, savePlants } from "@/lib/blob";
import { checkPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const plants = await getPlants();
  return NextResponse.json(plants);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commonName, variety, latinName, category, sowDate, location, notes } =
    body;

  if (!commonName) {
    return NextResponse.json(
      { error: "commonName is required" },
      { status: 400 }
    );
  }

  const slug = commonName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const plant = {
    id: `plant-${Date.now()}`,
    slug,
    commonName,
    variety: variety || "Unknown",
    latinName: latinName || "",
    confidence: "partial" as const,
    sowDate: sowDate || new Date().toISOString().split("T")[0],
    location: location || "indoor",
    category: category || "flower",
    notes: notes || "",
    seedSource: "Added via portal",
  };

  const plants = await getPlants();
  plants.push(plant);
  await savePlants(plants);

  return NextResponse.json(plant, { status: 201 });
}
