import { NextRequest, NextResponse } from "next/server";
import { getSpaces, saveSpaces } from "@/lib/blob";
import { Space } from "@/lib/types";

export async function GET() {
  const spaces = await getSpaces();
  return NextResponse.json(spaces);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, ...spaceData } = body;

    if (password !== process.env.GARDEN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const spaces = await getSpaces();

    const newSpace: Space = {
      id: `space-${Date.now()}`,
      name: spaceData.name || "New Space",
      type: spaceData.type || "greenhouse",
      description: spaceData.description || "",
      backgroundImageUrl: spaceData.backgroundImageUrl || "",
      width: spaceData.width || 100,
      height: spaceData.height || 60,
      plantPositions: spaceData.plantPositions || [],
    };

    spaces.push(newSpace);
    await saveSpaces(spaces);

    return NextResponse.json(newSpace, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, id, ...updates } = body;

    if (password !== process.env.GARDEN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const spaces = await getSpaces();
    const index = spaces.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    spaces[index] = { ...spaces[index], ...updates };
    await saveSpaces(spaces);

    return NextResponse.json(spaces[index]);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
