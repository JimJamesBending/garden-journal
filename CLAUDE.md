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
