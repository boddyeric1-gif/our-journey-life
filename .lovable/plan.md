# Premium features — scope, in/out of reach (v2)

## What already exists (the rails)

- `couple_entitlements` table + `couple_has_entitlement(couple_id, product)` helper
- Stripe checkout (`time_capsule_onetime`, `the_atlas_onetime`, `capsule_atlas_bundle_onetime`)
- Webhook grants/revokes entitlements on success, refund, dispute
- `/premium` page renders the three SKUs and gates Unlock on pairing
- `profile.tsx` already shows a "Capsule · Atlas" status row

What's missing is the actual product behind the paywall. Scope for each follows.

---

## 1. The Time Capsule

**Promise:** "Sealed letters and voice notes that unlock on a future date."

### Data model (new migration)
```text
time_capsules
  id uuid pk
  couple_id uuid fk → couples (RLS via is_couple_member)
  author_id uuid fk → auth.users
  kind text check ('letter','voice')
  title text
  body text                 -- letter text (null for voice)
  audio_path text           -- storage key (null for letter)
  audio_duration_sec int
  unlock_at timestamptz not null
  unlocked_at timestamptz   -- set when first viewed after unlock_at
  recipient text check ('partner','both','self')
  created_at, updated_at
```
- Indexes: `(couple_id, unlock_at)`, `(couple_id, unlocked_at)`
- RLS SELECT: `is_couple_member(couple_id)` AND (`now() >= unlock_at` OR `author_id = auth.uid()`). Author always sees their own; partner blocked until unlock.
- Private storage bucket `time-capsules`; signed URLs minted server-side only after unlock check.

### Server functions (`src/lib/timeCapsule.functions.ts`)
- `createTimeCapsule` — entitlement-gated; `unlock_at > now() + 1d` and `≤ now() + 10y`.
- `listTimeCapsules` — sealed (metadata only) + opened (full content).
- `getTimeCapsule(id)` — re-checks unlock; voice returns short-TTL signed URL.
- `deleteTimeCapsule(id)` — author-only, before unlock.
- `markCapsuleOpened(id)` — sets `unlocked_at` for the opening UX.

### Routes / UI
- `/_authenticated/capsule.index.tsx` — Sealed | Opened tabs, countdown chips, "New capsule" CTA.
- `/_authenticated/capsule.new.tsx` — kind toggle, title, body or recorder, date picker, recipient.
- `/_authenticated/capsule.$id.tsx` — locked view (countdown, "from your partner") vs opened (letter / audio).
- Home card: "1 capsule unlocks in 12 days" / "A capsule from Ana is ready to open."

### In reach
- Letters end-to-end.
- Voice via `MediaRecorder` → upload to Cloud storage (edge-safe; no native deps).
- Time-locked RLS using `now()` (server-trusted clock).
- Subtle countdown / opening animation (no confetti, per brand voice).
- Edit/delete before seal date.

### Out of reach / cut
- **Scheduled push/email on unlock day.** No cron primitive in this template. Use "next-app-open detection" instead. True notifications need pg_cron + a provider — future.
- **End-to-end encryption.** Adds key-management UX (recovery phrases, lost-device). Out unless you want it.
- **Server-side audio transcoding / waveforms.** No ffmpeg on workerd. Store recorder's native webm/opus, play as-is.
- **Sharing outside the couple** (e.g. "letter to future child"). Not in this model.

### Open questions
- Min/max unlock window? (proposed: 1 day–10 years)
- Edit allowed until 24h before unlock? (proposed: yes)
- Voice max length? (proposed: 3 min)

---

## 2. The Atlas — Scrapbook (revised)

**Promise:** "Your story together, gathered into one quiet scrapbook you can hold onto."

Reframed from "printable" to a **scrapbook view inside the app, exportable to the user's device as a file**. No print stylesheet, no "Save as PDF" instruction — a real download.

### Concept
A long, scrollable, page-by-page scrapbook of your relationship, composed automatically from data you've already created. Calm typography, soft cards, generous spacing — designed to be re-read, not just generated once. Two ways out:
1. **In-app view** — the primary experience. Pages flip / scroll, contents stay live (re-aggregates each visit).
2. **Export** — one tap saves a snapshot of the current scrapbook to the user's device.

### Scrapbook pages (v1)
1. **Cover** — names, "since" date, days together.
2. **Rhythm** — current/longest streak, monthly heatmap of shared days (SVG, no chart lib).
3. **The first letter** — full excerpt + date.
4. **Letters, gathered** — count, longest letter snippet, most recent.
5. **Chapters walked** — completed quest chapters with dates.
6. **Themes** — 6–10 pill cluster of recurring tags from quests/responses.
7. **Milestones** — timeline of XP-bearing events.
8. **A blank page** — "Add a note before you save this." (free-text field, persisted per couple, stored in `atlas_notes`.)

### Data sources (all already in DB)
- `couples.created_at`, `couple_streaks`, `daily_responses`, `letters`,
  `quest_step_completions`, `xp_events`.

### Data model (small additions)

```text
atlas_notes
  couple_id uuid pk fk → couples
  body text
  updated_at timestamptz
  -- RLS: is_couple_member(couple_id); INSERT/UPDATE/SELECT for members
```

### Server functions (`src/lib/atlas.functions.ts`)
- `getAtlas` — entitlement-gated; returns a single typed DTO with everything for the scrapbook (one round trip). Cached 5 min per couple.
- `saveAtlasNote(body)` — upserts the closing-page note.

### Routes / UI
- `/_authenticated/atlas.index.tsx` — the scrapbook itself. Vertical "pages" with `scroll-snap-y: mandatory`, soft page-turn transitions, restrained motion. Each page is a self-contained card. The closing page has the editable note + the export button.

### Export — what's actually feasible on this stack

The Worker runtime can't run Chromium, sharp, or canvas. **Two viable export formats, both edge-safe:**

**A. PDF via `pdf-lib`** (recommended for "saved to files")
- Pure JS, ships in workerd. We hand-lay out each scrapbook page (text, lines, simple SVG-style shapes, images embedded as PNG).
- Server fn `exportAtlasPdf` builds the bytes from the same DTO and returns a download. The mobile share sheet / Files app handles "save to device" natively.
- Pros: a real file (`.pdf`) the user owns, identical on every device, opens in any reader.
- Cons: layout has to be re-implemented in pdf-lib's primitives — it doesn't render HTML. We build ~8 layout templates once; new data flows through them.

**B. PNG snapshot per page** (alternative or addition)
- Render the heatmap and pages as SVG, return a zip of PNGs converted via `@resvg/resvg-wasm` (WASM, edge-safe). Or skip server rendering entirely and let the browser convert each page-card to a canvas with `html-to-image` (client-side, no server cost) → save as a multi-image zip.
- Pros: faithful to the in-app look.
- Cons: a zip of images is awkward to "open" later; PDF is the better keepsake.

**Recommendation:** ship PDF export (A) as the export format. Treat the in-app scrapbook as the primary experience; the PDF is the "take it with you" version. Skip B for v1.

### Export UX
- "Save scrapbook" button on the closing page.
- Calls `exportAtlasPdf`, receives a Blob, triggers a download named `Our-Journey-Atlas-{date}.pdf`.
- On iOS: that download opens the share sheet → Save to Files / AirDrop / Mail. Same on Android via the system download notification.
- We do **not** need (and shouldn't add) a native share API call — the browser download is the universal path.

### In reach
- All eight scrapbook pages from existing data.
- SQL aggregation with proper indexes; 5-min server cache.
- PDF export via pdf-lib (works on workerd, no native deps).
- Editable closing note, persisted per couple.
- Re-renders live each visit; export reflects current state.
- Both partners see the same scrapbook.

### Out of reach / cut
- **HTML → PDF on the server.** Requires Chromium; not on workerd.
- **Mailing a physical printed copy** (Lulu / Printful). Separate plan.
- **Photo uploads inside the scrapbook.** Possible but adds storage + moderation. Defer to v2; we can leave a "Photos coming soon" placeholder if you want.
- **Drag-to-rearrange page builder.** The Atlas is generated, not authored.
- **Server-rendered chart images.** Heatmaps stay as inline SVG → redrawn into pdf-lib using rects.
- **Native iOS/Android share sheets via Web Share API.** We can wire it as a progressive enhancement, but the download fallback is the contract.

### Open questions
- Photos in v1, or "v2 coming soon"? (proposed: v2)
- Include each partner's solo reflections as a personal section visible only to them, or keep the scrapbook strictly shared? (proposed: shared only, privacy-safer)
- AI-summarized themes (~1 credit per render, cached weekly on `couples`) or simple SQL tag counts? (proposed: SQL for v1; AI later behind a toggle)

---

## Suggested build order

1. **Migration:** `time_capsules` + `atlas_notes` tables, `time-capsules` private storage bucket, all RLS.
2. **Time Capsule** server fns + 3 routes + home-screen unlock notice.
3. **Atlas** aggregation server fn (`getAtlas`) + `saveAtlasNote`.
4. **Atlas** in-app scrapbook route with 8 pages, scroll-snap, closing note.
5. **Atlas** `exportAtlasPdf` server fn using pdf-lib + download button.
6. **Profile/premium polish:** "Open Capsule" / "View Atlas" entry points only when entitled.
7. **Tests (Vitest):** entitlement gating, unlock-time RLS behaviour, Atlas aggregation correctness, PDF byte-length sanity.

## Cross-cutting

- Every server fn: `requireSupabaseAuth` + entitlement re-check (defense in depth).
- All routes get `errorComponent` + `notFoundComponent`.
- Mobile-first, one primary action per screen, restrained motion.
- No new client-side secrets; voice upload uses a signed POST URL minted server-side.

---

**Tell me:**
1. PDF export via pdf-lib confirmed for v1 (option A)?
2. Photos: v1 placeholder, v1 real upload, or skip entirely?
3. Capsule scheduled notifications: ship without (next-open detection) for v1?
4. Themes: SQL counts or AI-summarized with weekly cache?
