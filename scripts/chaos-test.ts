#!/usr/bin/env npx tsx
/**
 * Chaos Test for Hazel WhatsApp Webhook
 *
 * Sends mock WhatsApp webhook payloads to test resilience against
 * real-world chaotic usage patterns: rapid-fire messages, stickers
 * mid-conversation, reactions during processing, unknown types, etc.
 *
 * Usage:
 *   npx tsx scripts/chaos-test.ts [local|prod] [scenario]
 *
 * Examples:
 *   npx tsx scripts/chaos-test.ts local all
 *   npx tsx scripts/chaos-test.ts prod sticker-interrupt
 *   npx tsx scripts/chaos-test.ts local rapid-images
 *   npx tsx scripts/chaos-test.ts local --list
 *
 * Note: This tests webhook resilience, NOT Gemini responses.
 * Image scenarios use a real WhatsApp media_id which will fail
 * to download — that's expected and tests error handling.
 */

const ENDPOINTS = {
  local: "http://localhost:3000/api/webhooks/whatsapp",
  prod: "https://garden-project-theta.vercel.app/api/webhooks/whatsapp",
};

const TEST_PHONE = "447700900000"; // UK test number
const FAKE_MEDIA_ID = "chaos_test_media_" + Date.now();

// ============================================
// WEBHOOK PAYLOAD BUILDER
// ============================================

function makeWebhookPayload(
  phone: string,
  type: string,
  content: Record<string, unknown>,
  messageIdSuffix?: string
) {
  const msgId = messageIdSuffix
    ? `wamid_chaos_${messageIdSuffix}`
    : `wamid_chaos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15551397887",
                phone_number_id: "1017579654776008",
              },
              contacts: [
                { profile: { name: "Chaos Tester" }, wa_id: phone },
              ],
              messages: [
                {
                  from: phone,
                  id: msgId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type,
                  ...content,
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

function textPayload(phone: string, body: string, idSuffix?: string) {
  return makeWebhookPayload(phone, "text", { text: { body } }, idSuffix);
}

function imagePayload(phone: string, caption?: string, idSuffix?: string) {
  return makeWebhookPayload(
    phone,
    "image",
    {
      image: {
        id: `${FAKE_MEDIA_ID}_${idSuffix || Date.now()}`,
        mime_type: "image/jpeg",
        ...(caption ? { caption } : {}),
      },
    },
    idSuffix
  );
}

function stickerPayload(phone: string, idSuffix?: string) {
  return makeWebhookPayload(
    phone,
    "sticker",
    {
      sticker: {
        id: "sticker_media_123",
        mime_type: "image/webp",
        animated: false,
      },
    },
    idSuffix
  );
}

function reactionPayload(phone: string, reactToId: string, idSuffix?: string) {
  return makeWebhookPayload(
    phone,
    "reaction",
    {
      reaction: {
        message_id: reactToId,
        emoji: "\u2764\ufe0f",
      },
    },
    idSuffix
  );
}

function audioPayload(phone: string, idSuffix?: string) {
  return makeWebhookPayload(
    phone,
    "audio",
    {
      audio: {
        id: "audio_media_123",
        mime_type: "audio/ogg; codecs=opus",
      },
    },
    idSuffix
  );
}

function videoPayload(phone: string, idSuffix?: string) {
  return makeWebhookPayload(
    phone,
    "video",
    {
      video: {
        id: "video_media_123",
        mime_type: "video/mp4",
      },
    },
    idSuffix
  );
}

function documentPayload(phone: string, idSuffix?: string) {
  return makeWebhookPayload(
    phone,
    "document",
    {
      document: {
        id: "doc_media_123",
        mime_type: "application/pdf",
        filename: "garden-plan.pdf",
      },
    },
    idSuffix
  );
}

function locationPayload(phone: string, idSuffix?: string) {
  return makeWebhookPayload(
    phone,
    "location",
    {
      location: {
        latitude: 51.4545,
        longitude: -2.5879,
        name: "My Garden",
        address: "Bristol, UK",
      },
    },
    idSuffix
  );
}

// ============================================
// HTTP SENDER
// ============================================

async function send(
  endpoint: string,
  payload: unknown,
  label: string
): Promise<{ status: number; duration: number }> {
  const start = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const duration = Date.now() - start;
    const statusIcon = res.status === 200 ? "\u2705" : "\u274c";
    console.log(
      `  ${statusIcon} [${res.status}] ${label} (${duration}ms)`
    );
    return { status: res.status, duration };
  } catch (err) {
    const duration = Date.now() - start;
    console.log(
      `  \u274c [ERR] ${label} (${duration}ms) — ${err instanceof Error ? err.message : String(err)}`
    );
    return { status: 0, duration };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// TEST SCENARIOS
// ============================================

type Scenario = {
  name: string;
  description: string;
  expected: string;
  run: (endpoint: string) => Promise<void>;
};

const scenarios: Record<string, Scenario> = {
  "rapid-text": {
    name: "Rapid-Fire Text",
    description: "5 text messages in 1 second from same user",
    expected: "All return 200. Only the latest message should get a meaningful response.",
    run: async (endpoint) => {
      const messages = [
        "Hello",
        "How are you",
        "I have a question about tomatoes",
        "Actually never mind",
        "Wait, yes I do want to know about tomatoes",
      ];
      await Promise.all(
        messages.map((msg, i) =>
          send(endpoint, textPayload(TEST_PHONE, msg, `rapid_text_${i}`), `Text ${i + 1}: "${msg}"`)
        )
      );
    },
  },

  "rapid-images": {
    name: "Rapid-Fire Images",
    description: "3 images in 2 seconds (tests batch queue)",
    expected: "All return 200. Images should batch together into one Gemini call.",
    run: async (endpoint) => {
      await send(endpoint, imagePayload(TEST_PHONE, "My tomato", "batch_img_1"), "Image 1: tomato");
      await sleep(500);
      await send(endpoint, imagePayload(TEST_PHONE, "My basil", "batch_img_2"), "Image 2: basil");
      await sleep(500);
      await send(endpoint, imagePayload(TEST_PHONE, undefined, "batch_img_3"), "Image 3: no caption");
    },
  },

  "sticker-interrupt": {
    name: "Sticker Mid-Conversation",
    description: "Image \u2192 1s \u2192 sticker \u2192 1s \u2192 image",
    expected: "200 for all. Sticker silently blue-ticked (no reply). Images batch normally.",
    run: async (endpoint) => {
      await send(endpoint, imagePayload(TEST_PHONE, "Rose bush", "stk_img_1"), "Image 1: rose");
      await sleep(1000);
      await send(endpoint, stickerPayload(TEST_PHONE, "stk_sticker"), "Sticker: cat");
      await sleep(1000);
      await send(endpoint, imagePayload(TEST_PHONE, "Lavender", "stk_img_2"), "Image 2: lavender");
    },
  },

  "reaction-during": {
    name: "Reaction During Processing",
    description: "Send image, then reaction 1s later",
    expected: "200 for both. Reaction silently blue-ticked, doesn't interrupt image processing.",
    run: async (endpoint) => {
      const imgPayload = imagePayload(TEST_PHONE, "Sunflower", "react_img");
      await send(endpoint, imgPayload, "Image: sunflower");
      await sleep(1000);
      await send(
        endpoint,
        reactionPayload(TEST_PHONE, "wamid_chaos_react_img", "react_heart"),
        "Reaction: \u2764\ufe0f to image"
      );
    },
  },

  "empty-text": {
    name: "Empty Text Message",
    description: "Text with empty body",
    expected: "200. Should handle gracefully (empty string to Gemini or ignore).",
    run: async (endpoint) => {
      await send(endpoint, textPayload(TEST_PHONE, "", "empty"), "Empty text: ''");
    },
  },

  "long-text": {
    name: "Very Long Text",
    description: "5000-character text message",
    expected: "200. Gemini should handle it. Response may be truncated by Hazel's brevity rules.",
    run: async (endpoint) => {
      const longText = "I have a really long question about my garden. ".repeat(100);
      await send(
        endpoint,
        textPayload(TEST_PHONE, longText, "longtext"),
        `Long text: ${longText.length} chars`
      );
    },
  },

  "duplicate-webhook": {
    name: "Duplicate Webhook",
    description: "Same payload sent twice (tests idempotency)",
    expected: "Both return 200. Should not cause duplicate processing or errors.",
    run: async (endpoint) => {
      const payload = textPayload(TEST_PHONE, "Is this a weed?", "dupe_fixed_id");
      await send(endpoint, payload, "Send 1: 'Is this a weed?'");
      await sleep(200);
      await send(endpoint, payload, "Send 2: DUPLICATE of send 1");
    },
  },

  "unknown-type": {
    name: "Unknown Message Type",
    description: "type='future_thing' (tests catch-all)",
    expected: "200. Should fall through to unsupported media handler.",
    run: async (endpoint) => {
      const payload = makeWebhookPayload(
        TEST_PHONE,
        "future_thing",
        { future_thing: { data: "some new whatsapp feature" } },
        "unknown"
      );
      await send(endpoint, payload, "Unknown type: 'future_thing'");
    },
  },

  "audio-video-doc": {
    name: "Audio / Video / Document",
    description: "Tests unsupported-but-reply path",
    expected: "200 for all. Each gets 'I can only look at photos...' reply.",
    run: async (endpoint) => {
      await send(endpoint, audioPayload(TEST_PHONE, "aud"), "Audio message");
      await sleep(500);
      await send(endpoint, videoPayload(TEST_PHONE, "vid"), "Video message");
      await sleep(500);
      await send(endpoint, documentPayload(TEST_PHONE, "doc"), "Document: garden-plan.pdf");
    },
  },

  "location-share": {
    name: "Location Share",
    description: "User shares their garden location",
    expected: "200. Silently blue-ticked (location is in SILENT_TYPES).",
    run: async (endpoint) => {
      await send(endpoint, locationPayload(TEST_PHONE, "loc"), "Location: Bristol, UK");
    },
  },

  "mixed-burst": {
    name: "Mixed Burst",
    description: "text \u2192 image \u2192 sticker \u2192 text \u2192 image in 3 seconds",
    expected: "All return 200. Sticker silent. Text processed. Images may batch.",
    run: async (endpoint) => {
      await send(endpoint, textPayload(TEST_PHONE, "Look at my garden!", "mix_1"), "Text: 'Look at my garden!'");
      await sleep(500);
      await send(endpoint, imagePayload(TEST_PHONE, "My roses", "mix_2"), "Image: roses");
      await sleep(500);
      await send(endpoint, stickerPayload(TEST_PHONE, "mix_3"), "Sticker");
      await sleep(500);
      await send(endpoint, textPayload(TEST_PHONE, "Aren't they lovely?", "mix_4"), "Text: 'Aren't they lovely?'");
      await sleep(500);
      await send(endpoint, imagePayload(TEST_PHONE, "Close up", "mix_5"), "Image: close up");
    },
  },

  "status-only": {
    name: "Status-Only Webhook",
    description: "Webhook with no messages (status update delivery receipt)",
    expected: "200. Should exit early with no processing.",
    run: async (endpoint) => {
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "15551397887",
                    phone_number_id: "1017579654776008",
                  },
                  statuses: [
                    {
                      id: "wamid_status_123",
                      status: "delivered",
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      recipient_id: TEST_PHONE,
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      };
      await send(endpoint, payload, "Status webhook: delivery receipt");
    },
  },
};

// ============================================
// RUNNER
// ============================================

async function runScenario(endpoint: string, key: string) {
  const scenario = scenarios[key];
  if (!scenario) {
    console.error(`\u274c Unknown scenario: "${key}"`);
    console.error(`Available: ${Object.keys(scenarios).join(", ")}, all`);
    process.exit(1);
  }

  console.log(`\n\u{1f9ea} ${scenario.name}`);
  console.log(`   ${scenario.description}`);
  console.log(`   Expected: ${scenario.expected}`);
  console.log("");

  await scenario.run(endpoint);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list") || args.includes("-l")) {
    console.log("\n\u{1f30a} Chaos Test Scenarios:\n");
    for (const [key, s] of Object.entries(scenarios)) {
      console.log(`  ${key.padEnd(20)} ${s.description}`);
    }
    console.log(`  ${"all".padEnd(20)} Run all scenarios sequentially`);
    console.log("");
    process.exit(0);
  }

  const env = args[0] || "local";
  const scenario = args[1] || "all";

  const endpoint = ENDPOINTS[env as keyof typeof ENDPOINTS];
  if (!endpoint) {
    console.error(`\u274c Unknown environment: "${env}". Use "local" or "prod".`);
    process.exit(1);
  }

  console.log("\n\u{1f30a}\u{1f30a}\u{1f30a} HAZEL CHAOS TEST \u{1f30a}\u{1f30a}\u{1f30a}");
  console.log(`Target: ${endpoint}`);
  console.log(`Phone:  ${TEST_PHONE}`);
  console.log(`Time:   ${new Date().toISOString()}`);

  // Quick connectivity check
  try {
    const healthCheck = await fetch(endpoint, { method: "GET" });
    console.log(`Health: ${healthCheck.status} (GET — should be 403 or 200)\n`);
  } catch (err) {
    console.error(`\u274c Cannot reach ${endpoint}:`, err instanceof Error ? err.message : String(err));
    console.error("Is the server running?");
    process.exit(1);
  }

  if (scenario === "all") {
    const keys = Object.keys(scenarios);
    console.log(`Running all ${keys.length} scenarios...\n`);

    for (const key of keys) {
      await runScenario(endpoint, key);
      // Small gap between scenarios to avoid overwhelming
      await sleep(2000);
    }

    console.log("\n\u2705 All scenarios complete.");
    console.log("Check Vercel/terminal logs for server-side behavior.");
    console.log("Check WhatsApp on the test phone for actual messages received.\n");
  } else {
    await runScenario(endpoint, scenario);
    console.log("\n\u2705 Scenario complete.\n");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
