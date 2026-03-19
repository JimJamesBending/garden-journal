import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const LOGS_BLOB_KEY = "garden-logs.json";

async function getExistingLogs() {
  try {
    const { blobs } = await list({ prefix: LOGS_BLOB_KEY });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      return await response.json();
    }
  } catch {
    // First time or blob store not configured — return empty
  }
  return [];
}

export async function GET() {
  const logs = await getExistingLogs();
  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const { plantId, caption, status, cloudinaryUrl, password } =
    await request.json();

  // Auth check
  const expected = process.env.LOG_PASSWORD || "garden2025";
  if (password !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate
  if (!plantId || !caption || !status || !cloudinaryUrl) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Read existing logs from blob storage
  const existing = await getExistingLogs();

  // Create new entry
  const entry = {
    id: `log-${Date.now()}`,
    plantId,
    date: new Date().toISOString().split("T")[0],
    cloudinaryUrl,
    caption,
    status,
  };

  existing.push(entry);

  // Save back to blob storage
  await put(LOGS_BLOB_KEY, JSON.stringify(existing, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });

  return NextResponse.json(entry, { status: 201 });
}
