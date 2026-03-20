import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGardenId, getSpaces, createSpace, updateSpace } from "@/lib/supabase/queries";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gardenId = await getGardenId(supabase);
    const spaces = await getSpaces(supabase, gardenId);
    return NextResponse.json(spaces);
  } catch (error) {
    console.error("Spaces GET error:", error);
    return NextResponse.json({ error: "Failed to fetch spaces" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gardenId = await getGardenId(supabase);
    const body = await req.json();

    const newSpace = await createSpace(supabase, gardenId, {
      name: body.name || "New Space",
      type: body.type || "greenhouse",
      description: body.description || "",
      backgroundImageUrl: body.backgroundImageUrl || "",
      width: body.width || 100,
      height: body.height || 60,
      plantPositions: body.plantPositions || [],
    });

    return NextResponse.json(newSpace, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Space ID is required" }, { status: 400 });
    }

    const updated = await updateSpace(supabase, id, updates);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
