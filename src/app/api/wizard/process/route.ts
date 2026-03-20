import { NextRequest, NextResponse } from "next/server";
import {
  getPlants,
  savePlants,
  getLogs,
  saveLogs,
  getCareEvents,
  saveCareEvents,
} from "@/lib/blob";
import type { Plant, LogEntry, CareEvent, WizardAction } from "@/lib/types";

/**
 * POST /api/wizard/process
 *
 * Batch-execute all wizard actions: create plants, logs, care events.
 * Handles temp ID mapping for new plants.
 *
 * Body: { actions: WizardAction[], password: string }
 *
 * Returns: { created: { plants, logs, careEvents, growthEntries }, createdIds, errors }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actions, password } = body as { actions: WizardAction[]; password: string };

    // Auth check
    if (password !== process.env.GARDEN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: "No actions to process" },
        { status: 400 }
      );
    }

    // Load current data
    const [plants, logs, careEvents] = await Promise.all([
      getPlants(),
      getLogs(),
      getCareEvents(),
    ]);

    // Track temp ID → real ID mapping
    const idMap = new Map<string, string>();
    const createdPlantIds: string[] = [];
    const createdLogIds: string[] = [];
    const errors: string[] = [];

    let plantsCreated = 0;
    let logsCreated = 0;
    let careEventsCreated = 0;

    // --- Process create-plant actions first ---
    for (const action of actions) {
      if (action.type !== "create-plant") continue;

      try {
        const data = action.data as {
          commonName: string;
          variety: string;
          latinName: string;
          category: string;
          sowDate: string;
          location: string;
          notes: string;
          seedSource: string;
          tempId: string;
        };

        // Check for duplicate
        const existing = plants.find(
          (p) => p.commonName.toLowerCase() === data.commonName.toLowerCase()
        );
        if (existing) {
          // Map temp ID to existing plant
          idMap.set(data.tempId, existing.id);
          continue;
        }

        const slug = data.commonName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const newPlant: Plant = {
          id: `plant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          slug,
          commonName: data.commonName,
          variety: data.variety || "",
          latinName: data.latinName || "",
          confidence: "partial",
          sowDate: data.sowDate,
          location: (data.location as "indoor" | "outdoor") || "indoor",
          category: (data.category as "fruit" | "vegetable" | "herb" | "flower") || "vegetable",
          notes: data.notes || "",
          seedSource: data.seedSource || "",
        };

        plants.push(newPlant);
        idMap.set(data.tempId, newPlant.id);
        createdPlantIds.push(newPlant.id);
        plantsCreated++;
      } catch (e) {
        errors.push(`Failed to create plant: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    // --- Process create-log actions ---
    for (const action of actions) {
      if (action.type !== "create-log") continue;

      try {
        const data = action.data as {
          cloudinaryUrl: string;
          plantId: string;
          caption: string;
          status: string;
        };

        // Resolve temp IDs
        let plantId = data.plantId;
        if (plantId && plantId.startsWith("__NEW_")) {
          plantId = idMap.get(plantId) || "";
        }

        const labeled = !!(plantId && data.caption);

        const newLog: LogEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          plantId,
          date: new Date().toISOString().split("T")[0],
          cloudinaryUrl: data.cloudinaryUrl,
          caption: data.caption || "",
          status: (data.status as LogEntry["status"]) || "sowed",
          labeled,
        };

        logs.push(newLog);
        createdLogIds.push(newLog.id);
        logsCreated++;
      } catch (e) {
        errors.push(`Failed to create log: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    // --- Process create-care actions ---
    for (const action of actions) {
      if (action.type !== "create-care") continue;

      try {
        const data = action.data as {
          plantId: string;
          type: string;
          date: string;
          notes: string;
          quantity: string;
        };

        // Resolve temp IDs
        let plantId = data.plantId;
        if (plantId && plantId.startsWith("__NEW_")) {
          plantId = idMap.get(plantId) || "";
        }

        if (!plantId) continue;

        const newCare: CareEvent = {
          id: `care-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          plantId,
          type: (data.type as CareEvent["type"]) || "observed",
          date: data.date,
          notes: data.notes || "",
          quantity: data.quantity || "",
        };

        careEvents.push(newCare);
        careEventsCreated++;
      } catch (e) {
        errors.push(`Failed to create care event: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    // --- Save all data ---
    await Promise.all([
      savePlants(plants),
      saveLogs(logs),
      saveCareEvents(careEvents),
    ]);

    return NextResponse.json({
      created: {
        plants: plantsCreated,
        logs: logsCreated,
        careEvents: careEventsCreated,
        growthEntries: 0,
      },
      createdIds: {
        plants: createdPlantIds,
        logs: createdLogIds,
      },
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("Wizard process error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
