import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const expected = process.env.LOG_PASSWORD || "2303";

  if (password === expected) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
