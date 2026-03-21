import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Not admin");
  return user;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks: Record<
    string,
    { status: "healthy" | "degraded" | "down"; detail: string }
  > = {};

  // Supabase check
  try {
    const admin = createAdminClient();
    const start = Date.now();
    await admin.from("profiles").select("id").limit(1);
    const ms = Date.now() - start;
    checks.supabase = {
      status: ms < 1000 ? "healthy" : "degraded",
      detail: `${ms}ms response`,
    };
  } catch {
    checks.supabase = { status: "down", detail: "Connection failed" };
  }

  // WhatsApp config check
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  checks.whatsapp = {
    status: waToken && waPhoneId ? "healthy" : "down",
    detail: waToken && waPhoneId ? "Configured" : "Missing env vars",
  };

  // Gemini config check
  const geminiKey = process.env.GEMINI_API_KEY;
  checks.gemini = {
    status: geminiKey ? "healthy" : "down",
    detail: geminiKey ? "Configured" : "Missing GEMINI_API_KEY",
  };

  // Cloudinary config check
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  checks.cloudinary = {
    status: cloudinaryUrl ? "healthy" : "degraded",
    detail: cloudinaryUrl ? "Configured" : "Missing CLOUDINARY_URL",
  };

  const overallStatus = Object.values(checks).some(
    (c) => c.status === "down"
  )
    ? "down"
    : Object.values(checks).some((c) => c.status === "degraded")
      ? "degraded"
      : "healthy";

  return NextResponse.json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  });
}
