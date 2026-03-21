# Hazel — AI Garden Companion on WhatsApp

## What Hazel Is
Hazel is a WhatsApp-based AI gardening companion. Users message a WhatsApp number, send photos of their plants, and Hazel identifies them, builds a garden journal, and keeps the conversation going. She is a tiny, brilliant garden mouse — bookish, warm, sharp, never twee.

**Target user:** 68-year-old retired mum in Devon. Big phone fonts. Not tech-savvy. Loves her garden.

**Live:** https://garden-project-theta.vercel.app/
**GitHub:** https://github.com/JimJamesBending/garden-journal
**WhatsApp Phone Number ID:** 1017579654776008
**Meta App ID:** 939955458590307

---

## The Golden Path (User Journey)

This is the core product flow. Every design decision serves this sequence:

1. **User sends first message** (e.g. "Hi")
   - Hazel: "Hello lovely, show me something growing!"
   - One sentence. No introductions. No feature list.

2. **User sends first plant photo** — THE GIFT
   - Hazel identifies the plant with genuine excitement
   - Gives one genuinely useful/surprising insight they didn't know
   - "Send me more and I'll start building you a little garden journal!"
   - This is the hook. Up to 40 words allowed.

3. **User sends second plant photo** — JOURNAL REVEAL
   - Normal plant ID response
   - System appends: "{Name}! I made this little garden journal for you, if you like! [link]"
   - Devon-polite. Not pushy. The snowball is already rolling.

4. **Ongoing** — Normal Hazel. Short, sharp, delightful. Always ends with a follow-up question.

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Next.js 16 (App Router, TypeScript) | Vercel hosting, auto-deploys from `master` |
| AI | Gemini 2.5 Flash (`gemini-2.5-flash`) | Via `@google/genai` SDK. Vision + text. |
| Database | Supabase (Postgres + Auth + RLS) | Admin client bypasses RLS for webhook |
| Images | Cloudinary | Unsigned upload preset `garden_log`, cloud `davterbwx` |
| Messaging | WhatsApp Business Cloud API (v21.0) | Via Meta Graph API |
| Cards | `@vercel/og` (Satori/ImageResponse) | Dynamic plant card image generation |
| Async | `waitUntil` from `@vercel/functions` | Webhook returns 200 immediately, processes async |

---

## Architecture

### Message Flow (WhatsApp webhook)
```
User sends message on WhatsApp
  -> POST /api/webhooks/whatsapp
  -> Return 200 immediately
  -> waitUntil(processMessage):
      1. markReadAndType(messageId)     — blue ticks + typing indicator
      2. Image ack if photo             — "Let me put my glasses on..."
      3. resolveWhatsAppUser()          — find or create user/garden/conversation
         (parallel with downloadMedia for images)
      4. buildGardenContext()           — plants, logs, conversation history
         (parallel with saveMessage)
      5. askHazel()                     — Gemini call with image + context
         (parallel with Cloudinary upload for images)
      6. Save plants (confidence >= 85%, max 3)
      7. Save Hazel's response
      8. Send plant card images
      9. Send text reply (+ journal reveal on 2nd plant)
```

### Key Files
```
src/
  app/
    api/
      webhooks/whatsapp/route.ts  — THE core file. Webhook handler.
      card/[plantId]/route.tsx    — Dynamic plant card image generation (800x500)
    g/[slug]/page.tsx             — Public garden journal page
  lib/
    ai/
      hazel.ts                    — System prompt + askHazel() Gemini call
      context.ts                  — Builds garden context for Gemini
    channels/
      whatsapp.ts                 — WhatsApp API: send text/image, markReadAndType, download media
      resolve-user.ts             — Find or create user from phone number
      save-message.ts             — Save messages to conversation
    supabase/
      admin.ts                    — Supabase admin client (bypasses RLS)
      queries.ts                  — All database queries (createPlant, createLog, etc.)
    cloudinary.ts                 — URL transform helpers
    types.ts                      — TypeScript interfaces
scripts/
  wipe-user.sh                    — Wipe user data for testing
```

### Database Schema (Supabase)
```
profiles        — id, email, name, phone, public_slug, plan
gardens         — id, owner_id, name, lat, lng
plants          — id, garden_id, slug, common_name, latin_name, category, variety, confidence, sow_date, location, notes
log_entries     — id, garden_id, plant_id, date, cloudinary_url, caption, status, labeled
messages        — id, conversation_id, role, content, media_urls
conversations   — id, profile_id, channel, channel_user_id
care_events     — id, garden_id, plant_id, type, date, notes, quantity
growth_entries  — id, garden_id, plant_id, date, height_cm, leaf_count, health_score, notes
```

Auto-creation chain: WhatsApp message -> auth user -> profile (trigger) -> garden (trigger) -> conversation

---

## Hazel's Character (System Prompt Summary)

- **Who:** A tiny, brilliant garden mouse. Bookish, nerdy-sweet, expert gardener.
- **Knowledge:** Learned from books, but NEVER references this. Knowledge just IS.
- **Tone:** UK English. Sharp. Warm. Professional knowledge wrapped in warmth. Not twee.
- **Brevity:** Under 30 words. One sentence ideal. Two max. Three NEVER.
- **Emoji:** ONLY mouse, cheese, or plant. Nothing else. Ever.
- **Backstory:** Private. Only shared if user directly asks "Who are you?"
- **Off-topic:** In-character mouse reactions (terrified of people, dry wit for random objects)
- **Seedlings:** Don't guess. Ask "What did you sow?"
- **Confidence:** Only save plants at 85%+. Only state confidently at 90%+.
- **Follow-ups:** Always end with a relevant question. Keep the conversation going.
- **No repeats:** Check conversation history. Never repeat phrases.

---

## Design Decisions Log (Last 24 Hours)

### Why WhatsApp, not an app
- Zero friction. No download, no signup, no login.
- Target user already has WhatsApp. Already knows how to send photos.
- The phone number IS the identity. WhatsApp handles auth.
- Conversation-based pricing (~3-8p per 24hr window) is viable.

### Why Gemini Flash, not Claude/GPT
- Cheapest vision model available (~1p per image call)
- Fast enough for conversational use
- Good enough at plant ID for this stage

### Why the mouse character
- Distinctive. Memorable. Shareable.
- Brambly Hedge energy — appeals to the target demographic.
- In-character responses to off-topic content are delightful, not robotic.
- "AAAAH!!" when you send a selfie is much better than "I can only help with gardening."

### Why 30-word limit
- WhatsApp is a chat app. Long messages look like spam.
- Old people have MASSIVE fonts. A paragraph fills the entire screen.
- Short messages feel like a friend. Long messages feel like a bot.

### Why split messaging (glasses ack)
- Image processing takes 5-10 seconds. Silence feels broken.
- "Let me put my glasses on..." is in-character AND functional.
- Typing indicator fires immediately via markReadAndType.

### Why parallel pipeline
- Was 20+ seconds end-to-end. Now ~8-12 seconds.
- Image download + user resolve run in parallel.
- Cloudinary upload + Gemini call run in parallel.
- Context build + message save run in parallel.

### Why confidence threshold at 85%
- Hazel was confidently wrong about seedlings. Saved wrong plants, generated wrong cards.
- Seedlings all look identical at cotyledon stage.
- Now: below 85% = don't save. Below 70% = ask for help. Seedlings = "What did you sow?"

### Why journal reveal on 2nd plant (not 1st)
- 1st plant = the gift. Don't dilute it with a URL.
- By the 2nd plant, they're invested. The journal feels earned, not pushed.
- "I made this little garden journal for you, if you like!" — Devon-polite.

---

## Costs (Current)

| Service | Per text msg | Per image msg | Notes |
|---------|-------------|---------------|-------|
| Gemini 2.5 Flash | ~0.1p | ~1-3p | Images as base64 |
| WhatsApp API | ~3-8p | ~3-8p | Per 24hr conversation window |
| Cloudinary | Free | Free | Free tier: 25GB storage |
| Supabase | Free | Free | Free tier: 500MB DB |
| Vercel | Free | Free | Hobby plan |

Testing costs: ~£3-5/month. 50 users: ~£100/month. 200 users: ~£400/month.

---

## Environment Variables (Vercel Production)
```
GEMINI_API_KEY
WHATSAPP_ACCESS_TOKEN          — Permanent system user token
WHATSAPP_PHONE_NUMBER_ID       — 1017579654776008
WHATSAPP_VERIFY_TOKEN          — hazel_garden_2026
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_HAZEL_PHONE_NUMBER
```

---

## Testing Workflow
```bash
# Wipe user data for fresh onboarding test
SUPABASE_SERVICE_ROLE_KEY="..." NEXT_PUBLIC_SUPABASE_URL="..." ./scripts/wipe-user.sh 447792509648

# Push and deploy
git add . && git commit -m "message" && git push origin master

# Vercel auto-deploys from master (~30 seconds)
# Then send a WhatsApp message to test
```

---

## Pending / Next Steps

### Immediate
- [ ] Test typing indicator with corrected API format (markReadAndType)
- [ ] Test golden path end-to-end (fresh user -> plant 1 -> plant 2 -> journal reveal)
- [ ] Test plant card redesign (800x500, serif font, stats, no emoji)

### Short Term
- [ ] Duplicate plant detection — nickname system ("greenhouse tomato" vs "back door tomato")
- [ ] Plant lifecycle tracking via conversation ("I repotted the tomato" -> care event)
- [ ] User memory system — experience level, effort, location, interests, learned facts
- [ ] Privacy policy page
- [ ] Meta Business Verification (submitted, awaiting ~2 day review)
- [ ] Request App Review for whatsapp_business_messaging permission
- [ ] Add payment method for WhatsApp Business Account
- [ ] Set WhatsApp profile picture (Hazel mouse image, done manually in Meta dashboard)

### Medium Term
- [ ] Pricing model (free launch -> seasonal pass or freemium later)
- [ ] Garden centre partnerships / affiliate revenue
- [ ] Image downscaling before Gemini (400px wide is plenty for plant ID)
- [ ] GIF sending for richer responses (WhatsApp API supports it natively)
- [ ] Proactive messages — seasonal tips, care reminders (requires Meta template approval)

### Feature Ideas (User-Requested / To Be Offered)
- [ ] Space planning — help users plan what to plant where in their garden/greenhouse
- [ ] Yield calculations — estimate harvest yields based on plant count, variety, conditions
- [ ] Weather warnings — local alerts based on user location (requires weather API integration)
- [ ] Soil analysis from photos — use photo analysis to assess soil type/quality
- [ ] Smart soil advice — ask about soil type when planting, calibrated to user experience level
- [ ] Indoor plant support — extend beyond garden plants to houseplants
- [ ] Growth charts — visual growth tracking overlaid on plant timeline
- [ ] Prediction images — show what plants will look like at maturity (stylised or realistic renders)

### Technical Notes
- Gemini thinking uses split config: image messages get `thinkingBudget: 1024` (plant ID needs reasoning), text-only messages get `thinkingBudget: 0` (speed over reasoning for chat)

---

## Legal (UK)

- GDPR applies. Lawful basis: legitimate interest or contract.
- For prototyping with friends/family: fine under household exemption.
- Before public launch: need privacy policy, right to deletion, lawful basis statement.
- WhatsApp Business policy: tell users what data you collect.
- Implicit consent via continued use is legal in the UK. No tick box needed.
- Never sell personal data. Anonymised/aggregated data is fine.
- Under-16s need parental consent (not relevant for target demographic).
