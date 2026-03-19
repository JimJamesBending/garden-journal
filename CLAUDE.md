# Garden Journal — Claude Instructions

## Project Overview
A garden journal web app for tracking seedlings from sowing to harvest. Built with Next.js, deployed on Vercel, photos stored on Cloudinary, data stored in Vercel Blob.

**Live site:** https://garden-journal-ashy.vercel.app/
**Portal:** https://garden-journal-ashy.vercel.app/garden
**GitHub:** https://github.com/JimJamesBending/garden-journal

## Stack
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS (dark botanical theme)
- Cloudinary (image hosting, unsigned upload preset `garden_log`, cloud name `davterbwx`)
- Vercel Blob (JSON data storage for plants, logs, growth)
- Vercel (hosting, auto-deploys from `master` branch)

## API Reference

### Read (public, no auth required)
- `GET /api/plants` — all plants
- `GET /api/logs` — all logs (newest first)
- `GET /api/logs?plantId=<id>` — logs for a specific plant
- `GET /api/logs?unlabeled=true` — photos needing identification
- `GET /api/logs/<id>` — single log entry
- `GET /api/growth` — all growth data
- `GET /api/growth?plantId=<id>` — growth data for a specific plant

### Write (requires `password` field in JSON body)
- `POST /api/plants` — create plant (fields: commonName, variety, latinName, category, sowDate, location, notes)
- `PUT /api/plants/<id>` — update plant (partial update, send only changed fields)
- `DELETE /api/plants/<id>` — delete plant
- `POST /api/logs` — create log entry (fields: cloudinaryUrl, plantId, caption, status) or batch via `entries[]`
- `PUT /api/logs/<id>` — update log entry (Claude uses this to label photos)
- `DELETE /api/logs/<id>` — delete log entry
- `POST /api/growth` — add growth measurement (fields: plantId, heightCm, leafCount, healthScore, notes)

### Auth
- Password: set via `LOG_PASSWORD` env var on Vercel (default: `2303`)
- All write endpoints require `password` in the request body
- All read endpoints are public

## Photo Analysis Workflow

When Jim says "check my garden photos" or similar:

1. Fetch unlabeled photos:
   ```
   curl https://garden-journal-ashy.vercel.app/api/logs?unlabeled=true
   ```

2. For each entry with a `cloudinaryUrl`, view the image using WebFetch or Read tool

3. Identify:
   - Which plant it is (match against existing plants from `/api/plants`)
   - What growth status it shows (sowed/germinated/transplanted/flowering/harvested)
   - Write a descriptive caption

4. Update each entry:
   ```
   curl -X PUT https://garden-journal-ashy.vercel.app/api/logs/<id> \
     -H "Content-Type: application/json" \
     -d '{"plantId": "<matched-plant-id>", "caption": "<description>", "status": "<status>", "password": "<password>"}'
   ```

5. Confirm to Jim what was labeled and any photos you couldn't identify

## Data Model

### Plant
```json
{
  "id": "strawberry",
  "slug": "strawberry",
  "commonName": "Strawberry",
  "variety": "Grandian F1 Hybrid",
  "latinName": "Fragaria × ananassa",
  "confidence": "confirmed",
  "sowDate": "2025-03-18",
  "location": "indoor",
  "category": "fruit",
  "notes": "Large red fruit, long fruiting season.",
  "seedSource": "Packet confirmed from photo"
}
```

### Log Entry
```json
{
  "id": "log-1710800000000-abc1",
  "plantId": "strawberry",
  "date": "2025-03-18",
  "cloudinaryUrl": "https://res.cloudinary.com/davterbwx/...",
  "caption": "Seed packet for Grandian F1 Hybrid strawberry",
  "status": "sowed",
  "labeled": true
}
```

### Growth Entry
```json
{
  "id": "growth-1710800000000",
  "plantId": "strawberry",
  "date": "2025-03-25",
  "heightCm": 2.5,
  "leafCount": 4,
  "healthScore": 4,
  "notes": "Looking healthy, first true leaves"
}
```

## Project Structure
```
garden-journal/
├── data/                    # Seed data (plants.json, logs.json — initial data, blob takes over)
├── public/                  # PWA manifest, icons
├── src/
│   ├── app/
│   │   ├── api/             # REST API routes
│   │   │   ├── auth/        # Password check
│   │   │   ├── growth/      # Growth CRUD
│   │   │   ├── logs/        # Logs CRUD + [id] route
│   │   │   └── plants/      # Plants CRUD + [id] route
│   │   ├── garden/          # Mobile portal (Photos, Plants, Growth tabs)
│   │   ├── log/new/         # Legacy log form (still works)
│   │   ├── plant/[slug]/    # Individual plant pages
│   │   └── page.tsx         # Homepage
│   ├── components/          # PlantCard, StatusPill, PhotoTimeline, PlantLogs
│   └── lib/
│       ├── auth.ts          # Password check helper
│       ├── blob.ts          # Vercel Blob read/write helpers
│       ├── data.ts          # Data access layer (reads from blob)
│       └── types.ts         # TypeScript interfaces
```

## Environment Variables (Vercel)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` = `davterbwx`
- `LOG_PASSWORD` = the garden portal password
- `BLOB_READ_WRITE_TOKEN` = auto-set by Vercel Blob store connection

## IMPORTANT: Deployment Checklist
Before the site will work on Vercel, ALL of the following must be configured in the Vercel dashboard:
1. **Vercel Blob store** must be connected (Project Settings > Storage > Create Database > Blob). This auto-sets `BLOB_READ_WRITE_TOKEN`. Without it, every page and API route will 500.
2. **`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`** must be set as an env var (value: `davterbwx`). Without it, photo uploads will fail silently.
3. **`LOG_PASSWORD`** should be set if you want something other than the default `2303`.

If the live site is returning 500 errors, check the Blob store connection first — it is the most common cause.

## Design
- Dark botanical theme: deep greens (#0a1f0a), parchment accents (#e8d5b0)
- Fonts: Cormorant Garamond (display), Lora (body), JetBrains Mono (labels)
- Mobile-first portal at /garden, public-facing site at /
- PWA-installable on iOS via Add to Home Screen

## Current Plants (seeded March 2025)
1. Strawberry — Grandian F1 Hybrid
2. Sweet Pepper — Salad Festival F1 (Unwins)
3. Onion — Ailsa Craig
4. Sweet Pea — Everlasting (Lathyrus latifolius)
5. Sunflower — Unknown variety
6. Tomato — Unknown variety (standard red)
7. Basil — Sweet Basil
8. Sweet Pepper — Unwins Mixed
9. Poppy — Mixed Annual
10. Poppy — Scarlet Red
11. Foxglove — Digitalis purpurea (Unwins)
12. Lavender — English Lavender (Lavandula angustifolia)
13. Heather — Unknown variety
14. Daffodil — Unknown variety (Narcissus)

---

# V2 ARCHITECTURE — "The AI Gardener"

## Vision
Transform the garden journal from a photo log into a **full AI-powered gardening companion**. The public front page becomes a stunning, over-the-top animated one-page scroller that showcases the garden. The portal becomes an intelligent assistant that proactively guides Jim through every aspect of plant care — like having a knowledgeable gardener friend who never forgets anything.

The AI Gardener doesn't just record — it **anticipates, advises, and explains**. It tells you what's coming, what you need to buy, when to act, and why.

## Design Philosophy

### Inspiration Sources
- **BBC Gardeners' World**: Warm, encouraging tone. Monthly task checklists. Action + benefit phrasing ("Deadhead dahlias to encourage more blooms"). Plant profiles with sow/plant/flower/harvest timeline grids. Jump-linked how-to guides. Video integration.
- **RHS**: Authoritative but accessible. "Garden jobs this month" format. Plant-specific care calendars. Problem-solving sections with diagnosis + treatment.
- **Charles Dowding**: No-dig philosophy. Seasonal sowing timelines. Practical, experience-based advice.

### AI Gardener Tone
The AI Gardener speaks like a **friendly, experienced allotment neighbour** — warm but knowledgeable, never condescending, always explains the "why":
- "Your sweet peas will need pinching out soon — when they hit about 10cm, nip the growing tips. This forces them to bush out from the base and you'll get three times as many flowers."
- "Heads up: your onions will want potting on in about 3 weeks. They'll start getting root-bound in those small pots. Grab some 3-inch pots and multi-purpose compost before then."
- "The forecast shows overnight frost on Thursday. Your tomato seedlings won't survive that — bring them inside or cover them with fleece."
- "Nice work — your foxglove has really taken off since the last photo. I'm counting roughly 6 new leaves in two weeks, which is bang on track for this time of year."

### Content Structure (per Gardeners' World pattern)
Each piece of advice follows: **Action → Timing → Reason → What you'll need**
```
WHAT: Repot your sweet peas into larger containers
WHEN: In about 2 weeks (early April), when roots show at drainage holes
WHY:  They'll become root-bound and growth will stall. Bigger pots = bigger root system = more flowers
NEED: 2-litre pots, multipurpose compost, bamboo canes for support
```

---

## V2 STACK ADDITIONS

### Animation & UI
- **Lenis** — smooth scroll engine (foundation for one-page scroller)
- **GSAP + ScrollTrigger** — scroll-scrubbed animations, pinned sections, parallax
- **Framer Motion** — declarative UI transitions, component enter/exit animations
- **Native CSS scroll-driven animations** — `animation-timeline: view()` for zero-cost fade-ins
- **React Three Fiber** (optional, lazy-loaded) — 3D plant visualizations if needed

### Data Visualization
- **Recharts** or **Nivo** — growth charts, weather overlays, statistical displays
- **D3.js** (selective) — custom timeline visualizations, heatmaps

### Weather APIs (all free tier)
- **Open-Meteo** (primary) — current weather, 7-day forecast, soil temperature, soil moisture, UV index, historical data, evapotranspiration. No API key needed.
- **Met Office DataHub** — UK severe weather warnings (NSWWS), frost alerts. Free tier available.
- **SunriseSunset.io** — daylight hours, golden hour times
- **Visual Crossing** (backup) — growing degree days, historical correlation

### Image Processing
- **Cloudinary URL transforms** (zero client cost):
  - `a_auto` — auto-rotation from EXIF
  - `c_auto` — smart crop
  - `e_auto_color,e_auto_brightness,e_auto_contrast` — auto-levels
  - `g_auto` — smart gravity for thumbnails
  - `f_auto,q_auto` — auto-format (WebP/AVIF) and quality
  - `w_800` etc — responsive widths for srcset

### AI / Intelligence
- **Claude API** (via Vercel serverless) — photo identification, growth comparison, health assessment, caption generation, journal summaries, care advice generation
- **Local plant knowledge base** (`data/plant-care.json`) — sowing windows, germination times, growth rates, harvest dates, soil pH, feeding schedules, companion planting, common problems — all UK-specific

---

## V2 FEATURE LIST (185 features, no particles)

### A. PUBLIC FRONT PAGE — One-Page Scroller Showpiece

#### A1. Hero Section
1. Full-viewport animated hero with parallax plant imagery
2. Smooth scroll indicator with botanical animation
3. Animated title typography (letter-by-letter reveal on scroll)
4. Live weather widget embedded in hero (current temp, conditions, location)
5. "Last updated X hours ago" live pulse indicator
6. Season indicator with animated transitions (spring/summer/autumn/winter theming)

#### A2. Garden Overview Section
7. Animated stats counter (total plants, photos, days growing, total harvests)
8. Interactive category filter pills (fruit, veg, herb, flower) with smooth transitions
9. Garden "health score" — aggregate across all plants with animated gauge
10. Mini garden map/layout visualization
11. Current growth stage distribution chart (pie/donut — how many germinated vs flowering etc.)

#### A3. Plant Showcase Cards
12. Horizontal scroll carousel of plant cards with 3D tilt on hover
13. Each card: hero photo, name, variety, days growing, current status badge
14. Micro-animation on status badges (pulsing "flowering", growing "germinated")
15. Click/tap to expand into full plant profile (modal or scroll-to-section)
16. Auto-rotating "Plant of the Week" spotlight
17. Before/after growth comparison slider per plant
18. Growth sparkline chart on each card

#### A4. Photo Timeline / Journal Section
19. Vertical timeline with scroll-triggered photo reveals
20. Photos auto-rotated, auto-cropped, auto-levelled via Cloudinary transforms
21. Masonry grid layout for photo gallery view
22. Lightbox with swipe navigation
23. AI-generated captions displayed alongside photos
24. Date grouping with weather data sidebar (what the weather was that day)
25. Timelapse video generation from sequential plant photos
26. "Sizzle reel" — auto-generated highlight video of best growth moments

#### A5. Weather & Environment Dashboard
27. Current weather card with animated icons (sun, rain, clouds, wind)
28. 7-day forecast strip with gardening relevance (good/bad for watering)
29. Soil temperature at multiple depths (from Open-Meteo)
30. Soil moisture levels
31. UV index with sun exposure recommendation
32. Rainfall tracker — last 7 days vs plant needs
33. Frost warning alert banner (auto-triggered from Met Office NSWWS)
34. Sunrise/sunset times with daylight hours bar
35. Growing degree days accumulator with progress towards milestones
36. Historical weather overlay — compare this week vs same week last year
37. Moon phase display (for biodynamic gardeners)

#### A6. Growth Analytics Section
38. Interactive height-over-time charts per plant (line charts with smooth animations)
39. Leaf count progression charts
40. Growth rate comparison — actual vs expected curve overlay
41. Predicted harvest date countdown timers
42. "Growth velocity" speedometer animation
43. Seasonal growth summary with animated bar charts
44. Year-over-year comparison (when data accumulates)
45. Best performing plant leaderboard

#### A7. Watering & Care Section
46. Watering schedule calendar with colour-coded plant needs
47. "Last watered" indicators per plant with urgency colouring
48. Smart watering recommendation engine (weather + soil + plant type)
49. Rain delay notifications — "Skip watering, rain expected tomorrow"
50. Watering history heatmap (calendar view)
51. Fertiliser schedule tracker
52. Next care action dashboard — what needs doing today

#### A8. Soil Science Section
53. Soil pH tracking with target range visualisation per plant
54. NPK level indicators with traffic light system
55. Soil type classification display
56. Amendment recommendations (lime, sulphur, compost, etc.)
57. Soil test history timeline
58. Nutrient depletion modelling based on what's planted

#### A9. Plant Intelligence Section
59. AI photo comparison — "new leaves since last photo" detection & highlighting
60. Plant health scoring (0-100) with breakdown factors
61. Disease/pest identification from photos with treatment recommendations
62. Growth anomaly detection — alerts when growth significantly deviates from expected
63. Companion planting compatibility matrix visualization
64. Predicted growth trajectory based on current data + weather forecast

#### A10. Statistics & Insights
65. Total harvest weight tracker
66. Germination success rate per variety
67. Survival rate tracking
68. Cost tracker — seeds, soil, pots, tools — with ROI for edibles
69. Most productive month/week highlights
70. Garden biodiversity index
71. Carbon sequestration estimation
72. Water usage efficiency metrics

#### A11. Sizzle Reel / Media Section
73. Auto-generated garden highlight video (best photos, key milestones, growth timelapses)
74. Background video loops of garden activity
75. Image comparison sliders (spring vs summer)
76. Photo mosaic wall with randomised reveal animation
77. Instagram-style story format for recent updates

#### A12. Journal / Blog Section
78. Rich text journal entries with inline photos
79. Voice-to-text transcribed entries
80. Weather auto-attached to each entry
81. Tagged and searchable entries
82. "Lessons learned" annual summary generation

#### A13. Footer
83. Social sharing buttons
84. "Built with" credits
85. Seasonal quote rotator
86. Newsletter signup (future)

---

### B. PHOTO PROCESSING

87. Auto-rotation based on EXIF orientation data (Cloudinary `a_auto`)
88. Auto-cropping to remove excess background (Cloudinary `c_auto`)
89. Auto-levels / auto-enhance (Cloudinary `e_auto_color`, `e_auto_brightness`, `e_auto_contrast`)
90. Smart thumbnail generation (Cloudinary `g_auto` gravity)
91. Background blur for portrait-style plant photos
92. Consistent aspect ratio enforcement across gallery
93. Lazy loading with blur-up placeholder (next/image + Cloudinary)
94. Responsive image sizing (srcset with Cloudinary width transforms)
95. WebP/AVIF auto-format serving

---

### C. AI GARDENER ADVISORY SYSTEM (The Core Innovation)

This is the heart of V2. The AI Gardener is a **proactive, context-aware advisor** that generates personalised guidance based on Jim's actual plants, their current state, the weather, the season, and gardening best practice.

#### C1. How It Works
The advisory engine runs as a **server-side generation pipeline**:
1. Reads all plant data, growth entries, logs, and care events from Blob store
2. Cross-references against the plant knowledge base (`data/plant-care.json`)
3. Fetches current + forecast weather from Open-Meteo
4. Generates advice using Claude API (or rule-based fallback)
5. Stores generated advice in Blob store as `garden-advice.json`
6. Advice regenerates daily (via ISR revalidation) or on-demand via portal

#### C2. Advice Categories (inspired by Gardeners' World monthly format)

**This Week's Jobs** — Top priority tasks right now
- "Water your tomato seedlings — it's been 4 days and no rain is forecast until Friday"
- "Your sweet peas are ready for pinching out — they've hit 12cm based on your last measurement"

**Coming Up (2-4 weeks ahead)** — Forward planning with shopping lists
- "In about 3 weeks, your onions will need potting on into larger containers. Pick up some 3-inch pots and multipurpose compost."
- "Your strawberries should start flowering in late April. Get some straw mulch ready to protect the fruit from soil splash."

**Seasonal Guide** — What to sow/plant/harvest this month
- "March is perfect for sowing tomatoes indoors. You've already got yours started — nice one."
- "It's too early to plant out anything tender. Wait until after the last frost (usually mid-May in Bristol)."

**Weather Alerts** — Reactive advice based on forecast
- "Frost warning for Thursday night (Met Office yellow alert). Bring tender seedlings inside or cover with horticultural fleece."
- "Heatwave this weekend — water twice daily for seedlings in small pots, they'll dry out fast in terracotta."
- "Heavy rain forecast Monday-Wednesday. Skip watering, but check drainage in pots to avoid waterlogging."

**Growth Updates** — AI analysis of recent photos and measurements
- "Your foxglove has put on 6 new leaves since the last photo two weeks ago — that's excellent progress for March."
- "Your basil seems to have stalled — no height change in 10 days. Could be temperature-related; basil wants consistent 18°C+. Try moving it to a warmer spot."

**Problem Alerts** — Proactive issue detection
- "Your sweet pepper leaves look slightly yellow in the latest photo. This could be nitrogen deficiency — try a balanced liquid feed."
- "Slugs are most active in the mild, damp weather forecast this week. Consider putting out beer traps or copper tape around your hostas."

**Harvest Countdown** — When to expect results
- "Based on sowing date and current growth rate, your strawberries should fruit around mid-June — roughly 11 weeks away."
- "Your onions are on track for a late July harvest. Don't feed them after June or the bulbs won't store well."

**Buy List** — What to purchase and when
- "Shopping list for this weekend: 2L pots x6, multipurpose compost (1 bag), bamboo canes (pack of 20), liquid tomato feed"
- "You'll need horticultural fleece before Thursday's frost. B&Q or any garden centre will stock it."

**Fun Facts & Encouragement**
- "Did you know sweet peas were first cultivated in Sicily in the 17th century? Yours are carrying on a 400-year tradition."
- "You've logged 21 photos and 14 plants — your garden journal is really coming together!"

#### C3. Portal Integration
The portal (/garden) shows the AI Gardener as a **dashboard of advice cards**:
- Priority-sorted (urgent weather alerts at top, fun facts at bottom)
- Dismissable (swipe away completed tasks)
- Tappable (expand for full explanation + "why" reasoning)
- Colour-coded urgency (red = act today, amber = this week, green = coming up, blue = info)

#### C4. Plant Knowledge Base Structure
`data/plant-care.json` — local JSON, no API dependency:
```json
{
  "sweet-pea": {
    "commonName": "Sweet Pea",
    "latinName": "Lathyrus odoratus",
    "category": "flower",
    "ukHardinessZone": "H5",
    "lifecycle": "annual",
    "sowIndoors": { "earliest": "01-15", "ideal": "02-01", "latest": "03-31" },
    "sowOutdoors": { "earliest": "03-15", "ideal": "04-01", "latest": "05-15" },
    "plantOut": { "earliest": "04-15", "ideal": "05-01", "latest": "06-01" },
    "floweringPeriod": { "start": "06-01", "end": "09-30" },
    "daysToGermination": { "min": 10, "max": 21 },
    "daysToFlower": { "min": 90, "max": 120 },
    "idealTemp": { "min": 10, "max": 20, "unit": "celsius" },
    "soilPH": { "min": 7.0, "max": 7.5 },
    "wateringNeeds": "moderate",
    "feedingSchedule": "fortnightly liquid feed once flowering",
    "sunRequirement": "full-sun",
    "spacing": "15-20cm",
    "supportRequired": true,
    "supportType": "canes, netting, or trellis (grow to 2m)",
    "pinchOutAt": "10cm height — forces bushy growth",
    "companionPlants": ["sweet-william", "nigella", "cornflower"],
    "badCompanions": [],
    "commonProblems": [
      {
        "problem": "Powdery mildew",
        "symptoms": "White powdery coating on leaves",
        "cause": "Poor air circulation, dry roots",
        "treatment": "Improve airflow, water at base, remove affected leaves"
      },
      {
        "problem": "Bud drop",
        "symptoms": "Flower buds fall off before opening",
        "cause": "Irregular watering or extreme heat",
        "treatment": "Keep soil consistently moist, mulch around base"
      }
    ],
    "harvestTips": "Pick flowers regularly to encourage more blooms. Cut stems long for vases.",
    "repottingTrigger": "Roots visible at drainage holes, plant becomes top-heavy",
    "repottingSize": "Move from 9cm to 2L pot, then plant out",
    "monthlyTasks": {
      "01": "Sow seeds indoors in root trainers or toilet roll tubes",
      "02": "Continue indoor sowing. Keep at 15°C. Don't overwater.",
      "03": "Pinch out tips when 10cm tall. Harden off late-sown plants.",
      "04": "Plant out hardened-off seedlings after last frost risk. Install supports.",
      "05": "Tie in to supports as they grow. Start liquid feeding.",
      "06": "Deadhead spent flowers. Pick regularly for more blooms. Water deeply.",
      "07": "Peak flowering. Keep picking! Feed fortnightly.",
      "08": "Continue picking. Watch for mildew in dry spells.",
      "09": "Flowering slows. Collect seeds from best plants for next year.",
      "10": "Pull out spent plants. Autumn sow for earlier flowers next year.",
      "11": "Autumn-sown seedlings: protect with cloche or cold frame.",
      "12": "Rest. Plan next year's varieties."
    }
  }
}
```

---

### D. GARDEN PORTAL (Management — /garden)

#### D1. AI Gardener Dashboard (NEW — primary portal view)
96. Advice cards feed — priority-sorted, colour-coded, expandable
97. "This Week's Jobs" checklist with tap-to-complete
98. Weather-reactive alerts at top of feed
99. Forward planning timeline (next 4 weeks)
100. Shopping/buy list aggregator
101. "Ask the Gardener" — free-text question input, AI responds with garden-specific context
102. Daily gardening tip (rotated from knowledge base)
103. Seasonal sowing calendar view for your plants
104. Care event quick-log buttons (watered, fed, pruned, repotted, treated)

#### D2. Enhanced Photo Management
105. Batch upload with progress bars
106. AI auto-identification on upload — suggests plant match, status, caption
107. "Is this a new plant?" detection — prompt to create new plant entry
108. Photo tagging (leaf, flower, fruit, whole plant, problem, harvest, setup)
109. Delete/archive photos
110. Re-tag/re-assign photos to different plants

#### D3. Plant Management
111. Add/edit/delete plants
112. Growth stage manual update with date
113. Variety database lookup (auto-fill Latin name, care requirements from knowledge base)
114. Mark plant as "deceased" with cause of death
115. Clone/propagation tracking
116. Seed inventory — packets owned, seeds remaining

#### D4. Care Logging
117. One-tap "Watered" button per plant
118. Fertiliser application logging
119. Pruning event logging
120. Repotting logging with new pot size
121. Treatment logging (pest/disease treatments applied)
122. General observation notes

#### D5. Growth Measurements
123. Height entry with date
124. Leaf count entry
125. Health score entry (1-5)
126. Fruit/flower count
127. Harvest weight logging

#### D6. Soil Data Entry
128. pH reading entry
129. NPK levels entry
130. Moisture level entry
131. Soil test photo upload

#### D7. Settings
132. Garden location (lat/long for weather — defaults to Bristol)
133. Notification preferences
134. Photo quality settings
135. Data export (JSON/CSV)

---

### E. AI / INTELLIGENCE FEATURES

136. Photo identification — "What plant is this?" from uploaded photo
137. Growth comparison — overlay two dated photos, highlight differences (new leaves, height change)
138. Health assessment from photos — detect yellowing, wilting, pests, disease
139. Caption generation — AI writes descriptive captions for each photo
140. Smart status detection — AI suggests growth stage from photo analysis
141. Watering recommendations — AI combines weather forecast + plant needs + soil data
142. Harvest prediction — AI estimates harvest date from growth rate + weather
143. Journal entry generation — AI summarises the week's garden activity
144. Anomaly alerts — "Your tomato hasn't grown in 2 weeks, possible issue"
145. Companion planting advisor — "Don't plant X near Y"
146. Seasonal planning — AI suggests what to sow this month for your zone
147. Weekly digest email/notification — summary of garden status + upcoming tasks
148. Annual review generation — "Your 2025 growing season in review"

---

### F. WEATHER / METEOROLOGICAL INTEGRATION

#### APIs
149. Open-Meteo (primary) — current weather, 7-day forecast, soil temp, soil moisture, UV, historical, evapotranspiration. No API key. Base URL: `https://api.open-meteo.com/v1/forecast`
150. Met Office DataHub — UK severe weather warnings, frost alerts. Free tier.
151. SunriseSunset.io — daylight hours. `https://api.sunrisesunset.io/json?lat=51.45&lng=-2.58`
152. Visual Crossing (backup) — growing degree days

#### Features
153. Real-time weather widget on front page + portal
154. 7-day forecast with gardening context ("good day for planting out", "too wet to dig")
155. Frost alert system with banner notification
156. Rain tracker — actual vs forecast accuracy
157. Heatwave alerts
158. Wind warnings for staked/tall plants
159. UV exposure recommendations
160. Historical weather correlation with plant performance
161. Soil temperature at root depth
162. Evapotranspiration rate (water loss estimation)
163. Chill hour accumulation for fruit trees
164. Growing season countdown (days until last frost / first frost)

---

### G. DATA VISUALIZATION & ANIMATIONS

#### Chart Types
165. Line charts — growth over time (height, leaf count)
166. Bar charts — harvest weights, monthly summaries
167. Pie/donut charts — plant categories, status distribution
168. Radar charts — plant health factor breakdown
169. Heatmaps — watering calendar, activity calendar
170. Sparklines — mini growth trends on plant cards
171. Gauge charts — health scores, soil readings
172. Area charts — cumulative growth, cumulative harvest

#### Animation Effects (NO particles)
173. Scroll-triggered section reveals (fade, slide, scale)
174. Parallax depth layers (background plants, midground data, foreground text)
175. Smooth scroll with Lenis
176. GSAP ScrollTrigger for pinned sections and scrub animations
177. Framer Motion for UI element transitions
178. Number counter animations on stats
179. Staggered card entrance animations
180. Image reveal animations (clip-path wipe, blur-to-sharp)
181. 3D card tilt effects on hover
182. Page transition animations between sections
183. Loading skeleton animations
184. Micro-interactions on all buttons and inputs
185. Scroll progress indicator

---

### H. TECHNICAL INFRASTRUCTURE

186. Cloudinary image transformations via URL params (no client processing)
187. Next.js ISR (Incremental Static Regeneration) for public pages — revalidate every 30 min
188. API route caching for weather data (cache 30 min)
189. Vercel Edge Functions for weather API proxying
190. PWA with offline support
191. Service worker for background sync
192. Open Graph / social sharing meta tags with dynamic plant images
193. Structured data / JSON-LD for SEO
194. Performance budget — Lighthouse 90+ target
195. Responsive from mobile to 4K
196. `@vercel/blob` with `allowOverwrite: true` for all writes (required for v2+)

---

## V2 DATA MODEL ADDITIONS

### Advice Entry (NEW)
```json
{
  "id": "advice-1773944000000",
  "category": "this-week|coming-up|seasonal|weather-alert|growth-update|problem|harvest|buy-list|fun-fact",
  "priority": "urgent|high|medium|low|info",
  "title": "Time to pinch out your sweet peas",
  "body": "Your sweet peas have reached 12cm based on your last measurement. Pinch out the growing tips to force bushy growth — you'll get three times as many flowers.",
  "plantId": "sweet-pea",
  "actionRequired": true,
  "dismissed": false,
  "generatedAt": "2026-03-19T10:00:00Z",
  "expiresAt": "2026-03-26T10:00:00Z",
  "source": "knowledge-base|weather-api|photo-analysis|growth-data"
}
```

### Care Event (NEW)
```json
{
  "id": "care-1773944000000",
  "plantId": "sweet-pea",
  "type": "watered|fed|pruned|repotted|treated|harvested|observed",
  "date": "2026-03-19",
  "notes": "Liquid tomato feed, half strength",
  "quantity": "500ml"
}
```

### Soil Reading (NEW)
```json
{
  "id": "soil-1773944000000",
  "plantId": "strawberry",
  "date": "2026-03-19",
  "ph": 6.2,
  "nitrogen": "medium",
  "phosphorus": "low",
  "potassium": "medium",
  "moisture": "moist",
  "notes": "Tested with pH strips"
}
```

### Weather Snapshot (cached, NEW)
```json
{
  "date": "2026-03-19",
  "tempMax": 14.2,
  "tempMin": 5.1,
  "precipitation": 0.4,
  "humidity": 72,
  "windSpeed": 18,
  "uvIndex": 3,
  "soilTemp10cm": 8.5,
  "soilMoisture": 0.34,
  "sunrise": "06:12",
  "sunset": "18:22",
  "condition": "partly-cloudy",
  "frostRisk": false
}
```

---

## V2 PROJECT STRUCTURE (target)
```
garden-journal/
├── data/
│   ├── plants.json              # Seed plant data
│   ├── plant-care.json          # UK plant knowledge base (sowing dates, care, problems)
│   └── logs.json                # Seed log data
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/            # Password check
│   │   │   ├── advice/          # AI gardener advice generation + retrieval
│   │   │   ├── care/            # Care event logging (watered, fed, etc.)
│   │   │   ├── growth/          # Growth measurements
│   │   │   ├── logs/            # Photo logs + [id]
│   │   │   ├── plants/          # Plant CRUD + [id]
│   │   │   ├── soil/            # Soil readings
│   │   │   └── weather/         # Weather proxy (caches Open-Meteo + Met Office)
│   │   ├── garden/              # Portal (AI dashboard, photos, plants, growth, care, soil)
│   │   └── page.tsx             # Public one-page scroller
│   ├── components/
│   │   ├── public/              # Front page sections (Hero, PlantCards, Timeline, Weather, etc.)
│   │   ├── portal/              # Portal components (AdviceCard, CareLogger, SoilForm, etc.)
│   │   ├── charts/              # Recharts/Nivo chart components
│   │   └── ui/                  # Shared UI (buttons, cards, badges, modals)
│   ├── hooks/
│   │   ├── useWeather.ts        # Weather data fetching + caching
│   │   ├── useAdvice.ts         # AI advice retrieval
│   │   └── useScrollAnimation.ts # GSAP/Lenis scroll hooks
│   └── lib/
│       ├── auth.ts
│       ├── blob.ts
│       ├── weather.ts           # Open-Meteo + Met Office API clients
│       ├── advice-engine.ts     # Rule-based advice generation logic
│       ├── cloudinary.ts        # URL transform helpers
│       ├── plant-care.ts        # Knowledge base reader + query helpers
│       └── types.ts             # All TypeScript interfaces
```

---

## IMPLEMENTATION APPROACH
Build is split into parallel workstreams that can be tackled simultaneously by multiple agents:

1. **Data Layer** — New API routes, data models, Blob store schemas, plant knowledge base JSON
2. **Weather Integration** — Open-Meteo client, caching, weather snapshot storage, Met Office alerts
3. **AI Advisory Engine** — Advice generation pipeline, rule engine, Claude API integration
4. **Public Front Page** — One-page scroller with Lenis + GSAP + Framer Motion, all sections
5. **Portal Upgrade** — AI dashboard, care logging, soil tracking, enhanced photo management
6. **Charts & Visualization** — All chart components, growth analytics, weather displays
7. **Image Processing** — Cloudinary transform pipeline, auto-rotate/crop/enhance on all existing + new photos

Each workstream produces independent components/routes that integrate via the shared data layer.
