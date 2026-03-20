"use client";

import { useState, useRef, useCallback, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Mode = "choose" | "camera" | "search" | "loading" | "result" | "error";

interface PlantResult {
  plantName: string;
  latinName: string;
  variety?: string;
  category: string;
  confidence: number;
  careAdvice: string[];
  funFact: string;
  sowingTip?: string;
  sourceType: "photo" | "text";
}

// ─── Common UK garden plants for fuzzy search ────────────────────────────────

const PLANT_LIST = [
  // ── Vegetables ──
  "Tomato", "Cherry Tomato", "Beefsteak Tomato", "Lettuce", "Cos Lettuce",
  "Little Gem Lettuce", "Pepper", "Chilli Pepper", "Sweet Pepper", "Carrot",
  "Cucumber", "Courgette", "Marrow", "Pumpkin", "Butternut Squash", "Squash",
  "Beetroot", "Radish", "Turnip", "Swede", "Parsnip", "Potato", "Sweet Potato",
  "Onion", "Red Onion", "Shallot", "Spring Onion", "Garlic", "Leek",
  "Pea", "Sugar Snap Pea", "Mangetout", "Broad Bean", "Runner Bean",
  "French Bean", "Dwarf Bean", "Borlotti Bean", "Sweetcorn",
  "Cabbage", "Red Cabbage", "Savoy Cabbage", "Broccoli", "Purple Sprouting Broccoli",
  "Cauliflower", "Brussels Sprout", "Kale", "Cavolo Nero", "Spinach",
  "Chard", "Swiss Chard", "Rainbow Chard", "Rocket", "Watercress",
  "Pak Choi", "Mizuna", "Mustard Greens", "Asparagus", "Artichoke",
  "Globe Artichoke", "Jerusalem Artichoke", "Aubergine", "Celeriac", "Celery",
  "Fennel", "Florence Fennel", "Kohlrabi", "Okra", "Sweetcorn",
  // ── Herbs ──
  "Basil", "Sweet Basil", "Thai Basil", "Purple Basil", "Parsley",
  "Flat Leaf Parsley", "Curly Parsley", "Mint", "Spearmint", "Peppermint",
  "Apple Mint", "Chocolate Mint", "Thyme", "Lemon Thyme", "Rosemary",
  "Sage", "Purple Sage", "Chive", "Garlic Chive", "Dill", "Coriander",
  "Oregano", "Marjoram", "Tarragon", "French Tarragon", "Bay", "Bay Laurel",
  "Lemon Balm", "Lovage", "Sorrel", "Borage", "Chamomile", "Lemongrass",
  "Comfrey", "Horseradish", "Stevia", "Bergamot", "Hyssop", "Rue",
  "Winter Savory", "Summer Savory", "Angelica", "Feverfew", "Valerian",
  // ── Fruit ──
  "Strawberry", "Alpine Strawberry", "Raspberry", "Autumn Raspberry",
  "Blackberry", "Blueberry", "Gooseberry", "Blackcurrant", "Redcurrant",
  "Whitecurrant", "Cranberry", "Loganberry", "Tayberry", "Boysenberry",
  "Jostaberry", "Elderberry", "Grape", "Fig", "Kiwi",
  "Apple", "Crab Apple", "Pear", "Plum", "Damson", "Greengage", "Cherry",
  "Morello Cherry", "Quince", "Medlar", "Mulberry", "Peach", "Nectarine",
  "Apricot", "Rhubarb", "Melon", "Watermelon", "Cape Gooseberry",
  // ── Popular Flowers ──
  "Rose", "Climbing Rose", "Shrub Rose", "David Austin Rose",
  "Sunflower", "Sweet Pea", "Lavender", "English Lavender", "French Lavender",
  "Foxglove", "Dahlia", "Petunia", "Marigold", "French Marigold",
  "Pansy", "Viola", "Poppy", "Oriental Poppy", "Welsh Poppy", "Iceland Poppy",
  "Geranium", "Pelargonium", "Hardy Geranium", "Chrysanthemum",
  "Daffodil", "Narcissus", "Tulip", "Bluebell", "Snowdrop",
  "Crocus", "Iris", "Bearded Iris", "Allium", "Hyacinth", "Grape Hyacinth",
  "Lily", "Day Lily", "Lily of the Valley", "Anemone", "Ranunculus",
  "Cornflower", "Delphinium", "Lupin", "Hollyhock", "Cosmos", "Zinnia",
  "Aster", "Michaelmas Daisy", "Rudbeckia", "Echinacea", "Coneflower",
  "Sweet William", "Dianthus", "Pink", "Carnation", "Snapdragon",
  "Begonia", "Impatiens", "Busy Lizzie", "Fuchsia", "Lobelia",
  "Alyssum", "Verbena", "Salvia", "Nemesia", "Gazania", "Osteospermum",
  "Calendula", "Pot Marigold", "Nasturtium", "Morning Glory",
  "Clematis", "Jasmine", "Star Jasmine", "Wisteria", "Honeysuckle",
  "Passionflower", "Bougainvillea", "Campsis",
  "Heather", "Erica", "Primrose", "Cowslip", "Forget-Me-Not",
  "Hellebore", "Christmas Rose", "Lenten Rose", "Winter Aconite",
  "Cyclamen", "Camellia", "Rhododendron", "Azalea", "Hydrangea",
  "Magnolia", "Buddleia", "Butterfly Bush", "Viburnum", "Deutzia",
  "Weigela", "Philadelphus", "Mock Orange", "Lilac", "Forsythia",
  "Pieris", "Skimmia", "Euonymus", "Cotoneaster", "Pyracantha",
  "Berberis", "Escallonia", "Hebe", "Potentilla",
  // ── Grasses & Ferns ──
  "Miscanthus", "Stipa", "Pennisetum", "Festuca", "Carex", "Cortaderia",
  "Pampas Grass", "Blue Fescue", "Japanese Forest Grass",
  "Fern", "Boston Fern", "Hart's Tongue Fern", "Polypody", "Bracken",
  // ── Houseplants (people photograph these too) ──
  "Spider Plant", "Peace Lily", "Snake Plant", "Pothos", "Golden Pothos",
  "Monstera", "Swiss Cheese Plant", "Fiddle Leaf Fig", "Rubber Plant",
  "Aloe Vera", "Jade Plant", "Succulent", "Cactus", "Christmas Cactus",
  "Orchid", "Moth Orchid", "African Violet", "Kalanchoe",
  "Yucca", "Dracaena", "ZZ Plant", "String of Pearls", "String of Hearts",
  "Tradescantia", "Pilea", "Chinese Money Plant", "Cast Iron Plant",
  "Aspidistra", "Prayer Plant", "Calathea", "Hoya",
  // ── Trees & Hedging ──
  "Oak", "Beech", "Birch", "Silver Birch", "Hazel", "Willow",
  "Weeping Willow", "Acer", "Japanese Maple", "Field Maple",
  "Rowan", "Mountain Ash", "Horse Chestnut", "Sweet Chestnut",
  "Hawthorn", "Holly", "Yew", "Box", "Privet", "Laurel",
  "Cherry Laurel", "Hornbeam", "Lime", "Linden",
  "Eucalyptus", "Olive", "Bay Tree", "Corkscrew Willow",
  // ── Wildflowers & Natives ──
  "Red Campion", "White Campion", "Ox-Eye Daisy", "Meadow Buttercup",
  "Field Scabious", "Knapweed", "Teasel", "Vetch", "Bird's-Foot Trefoil",
  "Yarrow", "Wild Garlic", "Ramsons", "Meadow Cranesbill", "Ragged Robin",
  "Yellow Rattle", "Self-Heal", "Wild Thyme", "Nettle", "Dandelion",
  "Clover", "Red Clover", "White Clover", "Plantain", "Dock",
];

// ─── Quick-pick tiles ────────────────────────────────────────────────────────

const QUICK_PICKS = [
  { emoji: "\uD83C\uDF45", name: "Tomato" },
  { emoji: "\uD83E\uDD6C", name: "Lettuce" },
  { emoji: "\uD83E\uDED1", name: "Pepper" },
  { emoji: "\uD83E\uDD55", name: "Carrot" },
  { emoji: "\uD83C\uDF3B", name: "Sunflower" },
  { emoji: "\uD83C\uDF39", name: "Rose" },
  { emoji: "\uD83E\uDD52", name: "Cucumber" },
  { emoji: "\uD83E\uDED8", name: "Runner Bean" },
  { emoji: "\uD83E\uDD54", name: "Potato" },
  { emoji: "\uD83C\uDF53", name: "Strawberry" },
  { emoji: "\uD83C\uDF3F", name: "Basil" },
  { emoji: "\uD83C\uDF3A", name: "Sweet Pea" },
];

// ─── Fuzzy match helper ──────────────────────────────────────────────────────

function fuzzyMatch(query: string, items: string[]): string[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return [];
  return items.filter((item) => item.toLowerCase().includes(lower));
}

// ─── Cloudinary upload ───────────────────────────────────────────────────────

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "garden_log");
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/davterbwx/image/upload",
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.secure_url;
}

// ─── API call ────────────────────────────────────────────────────────────────

async function identifyPlant(
  payload: { imageUrl?: string; textQuery?: string }
): Promise<PlantResult> {
  const res = await fetch("/api/try", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Identification failed");
  }
  return res.json();
}

// ─── Category emoji helper ──────────────────────────────────────────────────

function categoryEmoji(category: string): string {
  switch (category) {
    case "fruit": return "\uD83C\uDF53";
    case "vegetable": return "\uD83E\uDD6C";
    case "herb": return "\uD83C\uDF3F";
    case "flower": return "\uD83C\uDF3A";
    default: return "\uD83C\uDF31";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TryPage() {
  const [mode, setMode] = useState<Mode>("choose");
  const [result, setResult] = useState<PlantResult | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ─── Filtered suggestions ─────────────────────────────────────────────────

  const suggestions = useMemo(
    () => fuzzyMatch(searchText, PLANT_LIST).slice(0, 8),
    [searchText]
  );

  // ─── Photo handler ────────────────────────────────────────────────────────

  const handlePhoto = useCallback(async (file: File) => {
    setMode("loading");
    try {
      const cloudinaryUrl = await uploadToCloudinary(file);
      setPhotoUrl(cloudinaryUrl);
      const data = await identifyPlant({ imageUrl: cloudinaryUrl });
      setResult(data);
      setMode("result");
    } catch {
      setErrorMessage(
        "Hmm, we couldn't quite make that out. Try a clearer photo, or tell us what it is instead."
      );
      setMode("error");
    }
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handlePhoto(file);
    },
    [handlePhoto]
  );

  // ─── Text search handler ──────────────────────────────────────────────────

  const handleTextSearch = useCallback(async (plantName: string) => {
    if (!plantName.trim()) return;
    setMode("loading");
    try {
      const data = await identifyPlant({ textQuery: plantName.trim() });
      setResult(data);
      setPhotoUrl(null);
      setMode("result");
    } catch {
      setErrorMessage(
        "Hmm, we couldn't find information about that plant. Try a different name or take a photo instead."
      );
      setMode("error");
    }
  }, []);

  // ─── Save to garden ───────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    if (result) {
      const pending = {
        ...result,
        photoUrl,
        savedAt: new Date().toISOString(),
      };
      sessionStorage.setItem("pendingPlant", JSON.stringify(pending));
      window.location.href = "/signup";
    }
  }, [result, photoUrl]);

  // ─── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setMode("choose");
    setResult(null);
    setPhotoUrl(null);
    setSearchText("");
    setErrorMessage("");
  }, []);

  // ─── Hidden file inputs ───────────────────────────────────────────────────

  const fileInputs = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </>
  );

  // =========================================================================
  // RENDER — CHOOSE MODE
  // =========================================================================

  if (mode === "choose") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
        }}
      >
        {fileInputs}
        <div style={{ width: "100%", maxWidth: "440px" }}>
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "#1A1A1A",
              textAlign: "center",
              marginBottom: "8px",
              lineHeight: 1.2,
            }}
          >
            What Are You Growing?
          </h1>
          <p
            style={{
              fontSize: "18px",
              color: "#4A4A4A",
              textAlign: "center",
              marginBottom: "32px",
              lineHeight: 1.5,
            }}
          >
            Snap a photo or tell us &mdash; we&apos;ll give you instant care advice
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Take a Photo */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%",
                height: "64px",
                backgroundColor: "#2E7D32",
                color: "#FFFFFF",
                fontSize: "20px",
                fontWeight: 600,
                border: "none",
                borderRadius: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span aria-hidden="true">{"\uD83D\uDCF7"}</span> Take a Photo of My Plant
            </button>

            {/* Photograph Seed Packet */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              style={{
                width: "100%",
                height: "64px",
                backgroundColor: "#2E7D32",
                color: "#FFFFFF",
                fontSize: "20px",
                fontWeight: 600,
                border: "none",
                borderRadius: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span aria-hidden="true">{"\uD83D\uDCE6"}</span> Photograph My Seed Packet
            </button>

            {/* Tell Me What I'm Growing */}
            <button
              onClick={() => setMode("search")}
              style={{
                width: "100%",
                height: "64px",
                backgroundColor: "#FFFFFF",
                color: "#2E7D32",
                fontSize: "20px",
                fontWeight: 600,
                border: "2px solid #2E7D32",
                borderRadius: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span aria-hidden="true">{"\uD83C\uDF31"}</span> Tell Me What I&apos;m Growing
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: "32px" }}>
            <a
              href="/"
              style={{
                fontSize: "18px",
                color: "#4A4A4A",
                textDecoration: "none",
              }}
            >
              &larr; Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER — CAMERA MODE
  // =========================================================================

  if (mode === "camera") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
        }}
      >
        {fileInputs}
        <div style={{ width: "100%", maxWidth: "440px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#1A1A1A",
              textAlign: "center",
              marginBottom: "24px",
            }}
          >
            Take a Photo
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%",
                height: "64px",
                backgroundColor: "#2E7D32",
                color: "#FFFFFF",
                fontSize: "20px",
                fontWeight: 600,
                border: "none",
                borderRadius: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span aria-hidden="true">{"\uD83D\uDCF7"}</span> Open Camera
            </button>

            <button
              onClick={() => galleryInputRef.current?.click()}
              style={{
                width: "100%",
                height: "64px",
                backgroundColor: "#FFFFFF",
                color: "#2E7D32",
                fontSize: "20px",
                fontWeight: 600,
                border: "2px solid #2E7D32",
                borderRadius: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              Choose from gallery
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: "32px" }}>
            <button
              onClick={reset}
              style={{
                fontSize: "18px",
                color: "#4A4A4A",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              &larr; Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER — SEARCH MODE
  // =========================================================================

  if (mode === "search") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FFFFFF",
          padding: "24px 20px",
        }}
      >
        {fileInputs}
        <div style={{ width: "100%", maxWidth: "440px", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#1A1A1A",
              textAlign: "center",
              marginBottom: "24px",
            }}
          >
            What are you growing?
          </h1>

          {/* Quick-pick grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              marginBottom: "24px",
            }}
          >
            {QUICK_PICKS.map((plant) => (
              <button
                key={plant.name}
                onClick={() => handleTextSearch(plant.name)}
                style={{
                  minHeight: "100px",
                  backgroundColor: "#FFFFFF",
                  border: "2px solid #2E7D32",
                  borderRadius: "16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "12px 4px",
                }}
              >
                <span style={{ fontSize: "32px" }} aria-hidden="true">
                  {plant.emoji}
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1A1A1A",
                  }}
                >
                  {plant.name}
                </span>
              </button>
            ))}
          </div>

          {/* Search input */}
          <div style={{ marginBottom: "16px", position: "relative" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTextSearch(searchText);
                }}
                placeholder="Or type your plant name..."
                style={{
                  flex: 1,
                  height: "48px",
                  fontSize: "18px",
                  color: "#1A1A1A",
                  border: "2px solid #2E7D32",
                  borderRadius: "12px",
                  padding: "0 16px",
                  backgroundColor: "#FFFFFF",
                  outline: "none",
                }}
              />
              <button
                onClick={() => handleTextSearch(searchText)}
                style={{
                  height: "48px",
                  padding: "0 24px",
                  backgroundColor: "#2E7D32",
                  color: "#FFFFFF",
                  fontSize: "18px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                }}
              >
                Go
              </button>
            </div>

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && searchText.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "56px",
                  left: 0,
                  right: 0,
                  backgroundColor: "#FFFFFF",
                  border: "2px solid #2E7D32",
                  borderRadius: "12px",
                  overflow: "hidden",
                  zIndex: 10,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                {suggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      setSearchText("");
                      handleTextSearch(name);
                    }}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      fontSize: "18px",
                      color: "#1A1A1A",
                      backgroundColor: "#FFFFFF",
                      border: "none",
                      borderBottom: "1px solid #E0E0E0",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Photo fallback link */}
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              onClick={() => setMode("camera")}
              style={{
                fontSize: "18px",
                color: "#2E7D32",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {"\uD83D\uDCF7"} I don&apos;t know &mdash; let me take a photo instead
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              onClick={reset}
              style={{
                fontSize: "18px",
                color: "#4A4A4A",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              &larr; Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER — LOADING MODE
  // =========================================================================

  if (mode === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
        }}
      >
        {/* Spinner */}
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid #E0E0E0",
            borderTopColor: "#2E7D32",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            marginBottom: "24px",
          }}
        />
        <p
          style={{
            fontSize: "20px",
            color: "#4A4A4A",
            textAlign: "center",
          }}
        >
          Our garden expert is having a look...
        </p>

        {/* Keyframes injected via style tag */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // =========================================================================
  // RENDER — ERROR MODE
  // =========================================================================

  if (mode === "error") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
        }}
      >
        {fileInputs}
        <div style={{ width: "100%", maxWidth: "440px", textAlign: "center" }}>
          <p
            style={{
              fontSize: "20px",
              color: "#1A1A1A",
              marginBottom: "32px",
              lineHeight: 1.5,
            }}
          >
            {errorMessage}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={() => {
                setMode("camera");
              }}
              style={{
                width: "100%",
                height: "56px",
                backgroundColor: "#2E7D32",
                color: "#FFFFFF",
                fontSize: "18px",
                fontWeight: 600,
                border: "none",
                borderRadius: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span aria-hidden="true">{"\uD83D\uDCF7"}</span> Try Another Photo
            </button>

            <button
              onClick={() => setMode("search")}
              style={{
                width: "100%",
                height: "56px",
                backgroundColor: "#FFFFFF",
                color: "#2E7D32",
                fontSize: "18px",
                fontWeight: 600,
                border: "2px solid #2E7D32",
                borderRadius: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span aria-hidden="true">{"\uD83C\uDF31"}</span> Tell Us Instead
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              onClick={reset}
              style={{
                fontSize: "18px",
                color: "#4A4A4A",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              &larr; Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER — RESULT MODE
  // =========================================================================

  if (mode === "result" && result) {
    const confidenceColor = result.confidence >= 70 ? "#2E7D32" : "#E65100";
    const confidenceLabel =
      result.confidence >= 70 ? `We're ${result.confidence}% sure` : "Our best guess";

    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FFFFFF",
          padding: "24px 20px 48px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "440px", margin: "0 auto" }}>
          {/* User photo */}
          {photoUrl && (
            <div
              style={{
                width: "100%",
                borderRadius: "16px",
                overflow: "hidden",
                marginBottom: "20px",
                border: "2px solid #E0E0E0",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Your plant photo"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  maxHeight: "360px",
                  objectFit: "cover",
                }}
              />
            </div>
          )}

          {/* Plant name */}
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#1A1A1A",
              textAlign: "center",
              marginBottom: "4px",
            }}
          >
            That&apos;s a {result.plantName}! {categoryEmoji(result.category)}
          </h1>

          {/* Variety */}
          {result.variety && (
            <p
              style={{
                fontSize: "18px",
                color: "#4A4A4A",
                textAlign: "center",
                marginBottom: "8px",
              }}
            >
              Looks like a {result.variety} variety
            </p>
          )}

          {/* Latin name */}
          <p
            style={{
              fontSize: "16px",
              color: "#757575",
              textAlign: "center",
              fontStyle: "italic",
              marginBottom: "16px",
            }}
          >
            {result.latinName}
          </p>

          {/* Confidence badge */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <span
              style={{
                display: "inline-block",
                padding: "8px 20px",
                borderRadius: "24px",
                backgroundColor: confidenceColor,
                color: "#FFFFFF",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              {confidenceLabel}
            </span>
          </div>

          {/* This Week card */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "2px solid #2E7D32",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#1A1A1A",
                marginBottom: "16px",
              }}
            >
              What to do this week
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {result.careAdvice.map((tip, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "18px",
                    color: "#1A1A1A",
                    lineHeight: 1.5,
                    padding: "8px 0",
                    paddingLeft: "24px",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "12px",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "#2E7D32",
                    }}
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Fun fact card */}
          {result.funFact && (
            <div
              style={{
                backgroundColor: "#E8F5E9",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "18px",
                  color: "#1A1A1A",
                  lineHeight: 1.5,
                }}
              >
                {"\uD83D\uDCA1"} <strong>Did you know?</strong> {result.funFact}
              </p>
            </div>
          )}

          {/* Sowing tip */}
          {result.sowingTip && (
            <div
              style={{
                backgroundColor: "#FFF8E1",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <p
                style={{
                  fontSize: "18px",
                  color: "#1A1A1A",
                  lineHeight: 1.5,
                }}
              >
                {"\uD83C\uDF31"} <strong>Sowing tip:</strong> {result.sowingTip}
              </p>
            </div>
          )}

          {/* Save CTA */}
          <button
            onClick={handleSave}
            style={{
              width: "100%",
              height: "64px",
              backgroundColor: "#2E7D32",
              color: "#FFFFFF",
              fontSize: "20px",
              fontWeight: 700,
              border: "none",
              borderRadius: "16px",
              cursor: "pointer",
              marginBottom: "16px",
            }}
          >
            Save This to My Garden
          </button>

          {/* Secondary links */}
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <button
              onClick={reset}
              style={{
                fontSize: "18px",
                color: "#2E7D32",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Just browsing? Try another plant
            </button>
            <a
              href="/login"
              style={{
                fontSize: "18px",
                color: "#4A4A4A",
                textDecoration: "none",
              }}
            >
              Already have an account? Sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Fallback — should never reach here
  return null;
}
