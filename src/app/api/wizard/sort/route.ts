import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { identifyPlant } from "@/lib/plant-id";
import type { PhotoCategory, PlantIdResult } from "@/lib/types";

/**
 * POST /api/wizard/sort
 *
 * Sends batch of photo URLs to Gemini Flash for categorisation + OCR.
 * Then calls PlantNet for plant photos (species identification).
 *
 * Uses Gemini 2.5 Flash — free tier: 250 req/day, $0 cost.
 *
 * Body: { photoUrls: string[], password: string }
 *
 * Returns: { results: Array<{ url, category, confidence, ocrText, plantIdSuggestion, aiNotes }> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photoUrls, password } = body;

    // Auth check
    if (password !== process.env.GARDEN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one photo URL is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 503 }
      );
    }

    // --- Fetch images and convert to base64 ---
    const imageContents = await Promise.all(
      photoUrls.map(async (url: string) => {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = res.headers.get("content-type") || "image/jpeg";
        return {
          inlineData: {
            mimeType,
            data: base64,
          },
        };
      })
    );

    // --- Call Gemini Flash Vision API ---
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [
        ...imageContents,
        {
          text: `You are a garden photo assistant for a UK gardener. I'm showing you ${photoUrls.length} garden photos. For EACH image (in order), classify it into exactly one category:

- "plant": Close-up photo of a living plant, leaves, flowers, fruit, or seedlings
- "label": Seed packet, plant label, price tag, care instructions, or any text/packaging
- "overview": Wide shot of a garden bed, greenhouse, windowsill, polytunnel, or growing area
- "soil": Photo of soil, ground, compost, pots with just soil, or empty growing medium
- "unclear": Cannot determine what this is

For EACH image, also:
1. Give a confidence score (0-100) for your classification
2. If it's a "label" photo, read ALL visible text (OCR) and include it
3. Write brief notes about what you see (useful for captions)

Respond ONLY with valid JSON in this exact format:
{"results":[{"index":0,"category":"plant","confidence":95,"ocrText":null,"notes":"Young strawberry seedling with trifoliate leaves, about 5cm tall"}]}

Important:
- Index must match the image order (0-based)
- ocrText should be null for non-label photos
- Keep notes concise (under 80 characters)
- Return one result per image, even if unclear`,
        },
      ],
    });

    // Parse Gemini's response
    const responseText = result.text?.trim();
    if (!responseText) {
      throw new Error("No text response from Gemini");
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr) as {
      results: Array<{
        index: number;
        category: PhotoCategory;
        confidence: number;
        ocrText: string | null;
        notes: string;
      }>;
    };

    // --- Call PlantNet for plant photos ---
    const results = await Promise.all(
      photoUrls.map(async (url: string, i: number) => {
        const sortResult = parsed.results.find((r) => r.index === i) || {
          category: "unclear" as PhotoCategory,
          confidence: 50,
          ocrText: null,
          notes: "",
        };

        let plantIdSuggestion: PlantIdResult | null = null;

        // Try PlantNet for plant photos (only if API key is set)
        if (sortResult.category === "plant" && process.env.PLANTNET_API_KEY) {
          try {
            const idResult = await identifyPlant({
              imageUrls: [url],
              organ: "auto",
            });
            if (idResult.results.length > 0) {
              plantIdSuggestion = idResult.results[0];
            }
          } catch {
            // PlantNet failure is non-fatal
          }
        }

        return {
          url,
          category: sortResult.category,
          confidence: sortResult.confidence,
          ocrText: sortResult.ocrText,
          plantIdSuggestion,
          aiNotes: sortResult.notes,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sort failed";
    console.error("Wizard sort error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
