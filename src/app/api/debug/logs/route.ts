import { NextRequest, NextResponse } from "next/server";
import { readDebugLogs, pruneDebugLogs } from "@/lib/debug-log";

/**
 * GET /api/debug/logs?secret=YOUR_VERIFY_TOKEN
 *
 * Shows the last 50 debug events from production.
 * Open this in a browser tab while testing Hazel — it refreshes with
 * every new event (typing calls, webhook messages, errors).
 *
 * Add &html=1 for a formatted HTML view with auto-refresh.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Auto-prune old entries
  await pruneDebugLogs();

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const logs = await readDebugLogs(limit);

  const html = req.nextUrl.searchParams.get("html");
  if (html) {
    // Formatted HTML view with auto-refresh every 3 seconds
    const rows = logs
      .map((log) => {
        const entry = log as unknown as Record<string, unknown>;
        const data = entry.data as Record<string, unknown> | undefined;
        const created = entry.created_at as string | undefined;
        return `<tr>
          <td style="white-space:nowrap;padding:4px 8px;font-size:12px;color:#666">${created ? new Date(created).toLocaleTimeString() : ""}</td>
          <td style="padding:4px 8px;font-weight:bold;color:#333">${entry.event || ""}</td>
          <td style="padding:4px 8px;font-size:12px;font-family:monospace;max-width:600px;overflow:auto"><pre style="margin:0;white-space:pre-wrap">${JSON.stringify(data, null, 2)}</pre></td>
        </tr>`;
      })
      .join("\n");

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Hazel Debug Logs</title>
  <meta http-equiv="refresh" content="3">
  <style>
    body { font-family: -apple-system, sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { font-size: 18px; color: #333; }
    table { border-collapse: collapse; width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    tr { border-bottom: 1px solid #eee; }
    tr:hover { background: #f9f9f9; }
    .meta { color: #999; font-size: 12px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>Hazel Debug Logs (live, refreshes every 3s)</h1>
  <p class="meta">${logs.length} events | <a href="?secret=${secret}&html=1&limit=100">Show 100</a> | <a href="?secret=${secret}">Raw JSON</a></p>
  <table>
    <tr style="background:#f0f0f0">
      <th style="padding:8px;text-align:left">Time</th>
      <th style="padding:8px;text-align:left">Event</th>
      <th style="padding:8px;text-align:left">Data</th>
    </tr>
    ${rows}
  </table>
</body>
</html>`;

    return new NextResponse(htmlContent, {
      headers: { "Content-Type": "text/html" },
    });
  }

  return NextResponse.json({ count: logs.length, logs });
}
