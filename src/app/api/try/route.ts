import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Simple in-memory rate limit
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = await req.json();
  const { imageUrl, textQuery } = body;

  if (!imageUrl && !textQuery) {
    return NextResponse.json({ error: "Provide imageUrl or textQuery" }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let contents: any[];

    if (imageUrl) {
      // Fetch image and convert to base64
      const res = await fetch(imageUrl);
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = res.headers.get("content-type") || "image/jpeg";

      contents = [
        { inlineData: { mimeType, data: base64 } },
        { text: `You are a friendly, expert gardener helping a beginner in the UK. Look at this photo — it could be a plant, a seed packet, a plant label, or a garden view.

If it's a SEED PACKET or LABEL: read all the text carefully and extract the plant name, variety, and any sowing/care instructions.

If it's a PLANT: identify the species.

For either case, respond with:
1. The plant's common name and Latin name
2. The variety if you can tell
3. The plant category (fruit, vegetable, herb, or flower)
4. Your confidence (0-100)
5. 3-4 care tips for RIGHT NOW (March in the UK) written in warm, simple English for a complete beginner. Be specific and practical.
6. One fun fact about this plant
7. A sowing tip relevant to this time of year

Respond ONLY with valid JSON:
{"plantName":"Tomato","latinName":"Solanum lycopersicum","variety":"Cherry (best guess)","category":"vegetable","confidence":85,"careAdvice":["Water every 2-3 days","Keep on a sunny windowsill until late May","Feed weekly with tomato food once flowers appear"],"funFact":"Tomatoes are technically berries!","sowingTip":"March is perfect for starting tomatoes indoors","sourceType":"photo"}

If you truly cannot identify anything, set confidence to 0 and plantName to "Unknown Plant".` }
      ];
    } else {
      // Text query — user typed or selected a plant name
      contents = [
        { text: `You are a friendly, expert gardener helping a beginner in the UK. The user says they are growing: "${textQuery}"

Provide helpful information about this plant. Respond with:
1. The correct common name and Latin name
2. The most popular UK garden variety
3. The plant category (fruit, vegetable, herb, or flower)
4. Confidence 95 (since they told us what it is)
5. 3-4 care tips for RIGHT NOW (March in the UK) written in warm, simple English for a complete beginner. Be specific and practical.
6. One fun fact about this plant
7. A sowing tip relevant to this time of year

Respond ONLY with valid JSON:
{"plantName":"Tomato","latinName":"Solanum lycopersicum","variety":"Gardener's Delight","category":"vegetable","confidence":95,"careAdvice":["Water every 2-3 days","Keep on a sunny windowsill until late May","Feed weekly with tomato food once flowers appear"],"funFact":"Tomatoes are technically berries!","sowingTip":"March is perfect for starting tomatoes indoors","sourceType":"text"}` }
      ];
    }

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents,
    });

    const responseText = result.text?.trim();
    if (!responseText) throw new Error("No response from AI");

    let jsonStr = responseText;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Try route error:", err);
    return NextResponse.json(
      { error: "Something went wrong identifying your plant. Please try again." },
      { status: 500 }
    );
  }
}
