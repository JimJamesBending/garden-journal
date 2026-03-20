import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { checkPassword } from "@/lib/auth";
import type { PhotoCategory } from "@/lib/types";

/**
 * POST /api/wizard/sort
 *
 * Sends batch of photo URLs to Gemini 2.5 Flash for:
 * - Photo categorisation (plant/label/soil/overview/unclear)
 * - OCR on labels
 * - Plant species identification (replaces PlantNet — free, no limits)
 *
 * Free tier: 250 req/day, £0 cost.
 *
 * Body: { photoUrls: string[], password: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photoUrls, password } = body;

    // Auth check — same password as portal login
    if (!checkPassword(password)) {
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

    // --- Single Gemini call: categorise + OCR + plant ID ---
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [
        ...imageContents,
        {
          text: `You are an expert garden photo assistant for a UK gardener. I'm showing you ${photoUrls.length} garden photos. For EACH image (in order), do ALL of the following:

1. CLASSIFY into exactly one category:
   - "plant": Close-up of a living plant, leaves, flowers, fruit, or seedlings
   - "label": Seed packet, plant label, price tag, care instructions, or text/packaging
   - "overview": Wide shot of a garden bed, greenhouse, windowsill, polytunnel, or growing area
   - "soil": Photo of soil, ground, compost, pots with just soil, or empty growing medium
   - "unclear": Cannot determine what this is

2. CONFIDENCE: Score 0-100 for your classification

3. OCR: If it's a "label" photo, read ALL visible text and include it. Null for non-labels.

4. IDENTIFY: If it's a "plant" photo, identify the species. Include:
   - species (Latin name, e.g. "Fragaria × ananassa")
   - commonName (English, e.g. "Strawberry")
   - idConfidence (0-100, how sure you are of the ID)
   - family (e.g. "Rosaceae")
   - genus (e.g. "Fragaria")
   Set plantId to null for non-plant photos.

5. NOTES: Brief description of what you see (under 80 chars, useful for captions)

Respond ONLY with valid JSON in this exact format:
{"results":[{"index":0,"category":"plant","confidence":95,"ocrText":null,"plantId":{"species":"Fragaria × ananassa","commonName":"Strawberry","idConfidence":85,"family":"Rosaceae","genus":"Fragaria"},"notes":"Young strawberry seedling with trifoliate leaves, about 5cm tall"}]}

Rules:
- Index must match the image order (0-based)
- ocrText must be null for non-label photos
- plantId must be null for non-plant photos
- If you can't identify the plant species, still set plantId but with low idConfidence
- For UK garden plants, prefer common UK names (courgette not zucchini, aubergine not eggplant)
- Return one result per image, even if unclear`,
        },
      ],
    });

    // Parse Gemini's response
    const responseText = result.text?.trim();
    if (!responseText) {
      throw new Error("No text response from Gemini");
    }

    // Extract JSON (handle markdown code blocks)
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
        plantId: {
          species: string;
          commonName: string;
          idConfidence: number;
          family: string;
          genus: string;
        } | null;
        notes: string;
      }>;
    };

    // Map to our response format
    const results = photoUrls.map((url: string, i: number) => {
      const sortResult = parsed.results.find((r) => r.index === i) || {
        category: "unclear" as PhotoCategory,
        confidence: 50,
        ocrText: null,
        plantId: null,
        notes: "",
      };

      return {
        url,
        category: sortResult.category,
        confidence: sortResult.confidence,
        ocrText: sortResult.ocrText,
        plantIdSuggestion: sortResult.plantId
          ? {
              species: sortResult.plantId.species,
              commonName: sortResult.plantId.commonName,
              confidence: sortResult.plantId.idConfidence,
              family: sortResult.plantId.family,
              genus: sortResult.plantId.genus,
            }
          : null,
        aiNotes: sortResult.notes,
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sort failed";
    console.error("Wizard sort error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
