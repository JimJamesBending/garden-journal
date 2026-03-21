/**
 * Debug logger — writes structured debug events to Supabase.
 * View them at /api/debug/logs?secret=YOUR_VERIFY_TOKEN
 *
 * This is a lightweight diagnostic tool. It writes to a `debug_logs`
 * table and auto-prunes entries older than 24 hours.
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface DebugEvent {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Log a debug event to Supabase. Fire-and-forget — never throws.
 */
export async function debugLog(event: string, data: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("debug_logs").insert({
      event,
      data,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Silently fail — debug logging must never break production
    console.error("[DEBUG-LOG] Failed to write:", event);
  }
}

/**
 * Read recent debug events.
 */
export async function readDebugLogs(limit = 50): Promise<DebugEvent[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("debug_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data || []) as unknown as DebugEvent[];
  } catch {
    return [];
  }
}

/**
 * Prune debug logs older than 24 hours.
 */
export async function pruneDebugLogs(): Promise<void> {
  try {
    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("debug_logs").delete().lt("created_at", cutoff);
  } catch {
    // Silent
  }
}
