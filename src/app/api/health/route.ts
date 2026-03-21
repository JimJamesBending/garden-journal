import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const startedAt = Date.now();

/**
 * GET /api/health
 * Returns system health status. No auth required.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {};

  // Check Supabase connectivity
  const supabaseStart = Date.now();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    checks.supabase = {
      ok: !error,
      ms: Date.now() - supabaseStart,
      ...(error ? { error: error.message } : {}),
    };
  } catch (e) {
    checks.supabase = {
      ok: false,
      ms: Date.now() - supabaseStart,
      error: String(e),
    };
  }

  // Check environment variables
  checks.env = {
    ok: !!(
      process.env.GEMINI_API_KEY &&
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  };

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
