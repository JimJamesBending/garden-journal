import { SupabaseClient } from "@supabase/supabase-js";
import type { SpaceSubtype } from "../types";

export interface GardenContext {
  plants: Array<{
    id: string;
    commonName: string;
    latinName: string;
    category: string;
    variety: string;
    sowDate: string;
    notes: string;
  }>;
  recentLogs: Array<{
    plantName: string;
    date: string;
    caption: string;
    status: string;
  }>;
  spaces: Array<{
    name: string;
    type: string;
    plantCount: number;
    subtypesInUse: string[];
  }>;
  plantCount: number;
  userMessageCount: number;
  isNewUser: boolean;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

/**
 * Build the full context Hazel needs to give personalised advice.
 * Fetches the user's plants, recent logs, and conversation history.
 */
export async function buildGardenContext(
  supabase: SupabaseClient,
  gardenId: string,
  conversationId: string
): Promise<GardenContext> {
  // Fetch plants
  const { data: plants } = await supabase
    .from("plants")
    .select("id, common_name, latin_name, category, variety, sow_date, notes")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: true });

  // Fetch last 5 log entries with plant names
  const { data: logs } = await supabase
    .from("log_entries")
    .select("date, caption, status, plant_id, plants(common_name)")
    .eq("garden_id", gardenId)
    .order("date", { ascending: false })
    .limit(5);

  // Fetch spaces
  const { data: spaces } = await supabase
    .from("spaces")
    .select("name, type, plant_positions")
    .eq("garden_id", gardenId)
    .order("created_at");

  // Fetch last 10 messages for conversation context + count user messages
  const [{ data: messages }, { count: userMsgCount }] = await Promise.all([
    supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("role", "user"),
  ]);

  const mappedPlants = (plants || []).map((p) => ({
    id: p.id,
    commonName: p.common_name || "",
    latinName: p.latin_name || "",
    category: p.category || "flower",
    variety: p.variety || "",
    sowDate: p.sow_date || "",
    notes: p.notes || "",
  }));

  const mappedLogs = (logs || []).map((l) => {
    const plantData = l.plants as unknown as { common_name: string } | null;
    return {
      plantName: plantData?.common_name || "Unknown plant",
      date: l.date || "",
      caption: l.caption || "",
      status: l.status || "",
    };
  });

  // Reverse messages so they're in chronological order
  const conversationHistory = (messages || [])
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content || "",
    }));

  const mappedSpaces = (spaces || []).map((s) => {
    const positions = (s.plant_positions || []) as Array<{ plantId: string; subtype?: string }>;
    const subtypesInUse = [...new Set(
      positions
        .map((p) => p.subtype)
        .filter((st): st is string => !!st)
    )];
    return {
      name: s.name || "",
      type: s.type || "garden-bed",
      plantCount: positions.length,
      subtypesInUse,
    };
  });

  return {
    plants: mappedPlants,
    recentLogs: mappedLogs,
    spaces: mappedSpaces,
    plantCount: mappedPlants.length,
    userMessageCount: userMsgCount || 0,
    isNewUser: mappedPlants.length === 0 && conversationHistory.length === 0,
    conversationHistory,
  };
}
