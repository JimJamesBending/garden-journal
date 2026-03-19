import { NextResponse } from "next/server";
import { getPlants } from "@/lib/data";

export async function GET() {
  const plants = getPlants().map((p) => ({
    id: p.id,
    commonName: p.commonName,
    variety: p.variety,
  }));
  return NextResponse.json(plants);
}
