import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/debug/typing-test
 *
 * Fires the typing indicator against a known phone number and returns
 * the raw WhatsApp API response so you can verify it actually works.
 *
 * Query params:
 *   phone – recipient phone in international format (e.g. 447700900000)
 *
 * Protected by a simple secret query param to stop random hits.
 *
 * Usage:
 *   curl "https://your-app.vercel.app/api/debug/typing-test?phone=447...&secret=YOUR_SECRET"
 *
 * Then check your phone — you should see the three dots appear.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json(
      { error: "Missing ?phone= param" },
      { status: 400 }
    );
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return NextResponse.json(
      { error: "Missing WhatsApp env vars" },
      { status: 500 }
    );
  }

  const GRAPH_API = "https://graph.facebook.com/v23.0";

  const results: Record<string, unknown> = {};

  // ---- Step 1: Send typing indicator via the "typing" status ----
  // The WhatsApp typing indicator requires a valid inbound message_id.
  // Since we don't have one for an on-demand test, we use a synthetic
  // approach: send a silent message first, capture its wamid, then
  // fire typing against it. But typing_indicator only works on INBOUND
  // message IDs, not outbound.
  //
  // So instead we test the raw API call and report what Meta returns.
  // If the response includes "success" AND typing dots appear on your
  // phone, the feature is working.

  try {
    // Fire a typing indicator using a synthetic message ID.
    // This will likely fail or be ignored, but the response tells us
    // whether v23.0 even recognises the typing_indicator field.
    const syntheticRes = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: "test_typing_check_" + Date.now(),
        typing_indicator: { type: "text" },
      }),
    });
    const syntheticBody = await syntheticRes.text();
    results.synthetic_typing = {
      status: syntheticRes.status,
      body: syntheticBody,
    };
  } catch (e) {
    results.synthetic_typing = { error: String(e) };
  }

  // ---- Step 2: Send a real text message so we get a wamid back ----
  // Then immediately fire typing on the conversation. The user will see:
  //   1. A test message arrive
  //   2. Typing dots appear (if working)
  //   3. Typing dots disappear after ~25s or when we stop

  let outboundWamid: string | null = null;

  try {
    const msgRes = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: "Typing indicator test — if you see three dots after this message, typing is working.",
        },
      }),
    });
    const msgBody = await msgRes.json();
    results.test_message = { status: msgRes.status, body: msgBody };

    // Extract wamid from response
    if (
      msgBody &&
      typeof msgBody === "object" &&
      "messages" in msgBody &&
      Array.isArray((msgBody as Record<string, unknown>).messages)
    ) {
      const messages = (msgBody as Record<string, unknown[]>).messages;
      if (messages[0] && typeof messages[0] === "object" && "id" in messages[0]) {
        outboundWamid = (messages[0] as Record<string, string>).id;
      }
    }
  } catch (e) {
    results.test_message = { error: String(e) };
  }

  // ---- Step 3: Fire typing using the outbound wamid ----
  // Note: typing_indicator only works with INBOUND message IDs.
  // This tests whether Meta returns an error or silently accepts.
  if (outboundWamid) {
    try {
      const typingRes = await fetch(
        `${GRAPH_API}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            status: "read",
            message_id: outboundWamid,
            typing_indicator: { type: "text" },
          }),
        }
      );
      const typingBody = await typingRes.text();
      results.typing_on_outbound = {
        status: typingRes.status,
        wamid: outboundWamid,
        body: typingBody,
      };
    } catch (e) {
      results.typing_on_outbound = { error: String(e) };
    }
  }

  // ---- Summary ----
  results.api_version = "v23.0";
  results.phone_number_id = phoneNumberId;
  results.target_phone = phone;
  results.note =
    "Check your phone now. If three dots appeared after the test message, typing is working. " +
    "The synthetic_typing test uses a fake message ID — it's expected to fail. " +
    "typing_on_outbound uses the outbound wamid — typing only works on INBOUND IDs, so this may also fail. " +
    "The real test is: send Hazel a message and watch for dots.";

  return NextResponse.json(results, { status: 200 });
}
