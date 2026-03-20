import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/auth
 *
 * Returns the current authenticated user's profile,
 * or 401 if not logged in.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
