## Problem

Each Field Note in the `insights` table currently has a `body` of one short paragraph (~40–60 words), so the reader page opens to "two sentences and a back button." The reader UI itself is fine — it already splits `body` on blank lines into paragraphs and renders typography for a long read. The fix is in the content, not the components.

## Approach

Write one new migration that `UPDATE`s each of the 10 existing insights with a richer `body` (~350–500 words, ≈90s–2min at average reading pace) and sets `read_minutes` accordingly. Each note will follow the same shape so the collection feels cohesive:

1. **Opening vignette** — a short, literary scene or anecdote that grounds the idea in a real moment between two people.
2. **The core lesson / theme** — named explicitly in one line so the takeaway is unmistakable.
3. **What the research says** — 1–2 paragraphs citing the actual professionals whose work the note is built on, with their findings in plain language.
4. **How it shows up at home** — concrete examples of the pattern in everyday couple life.
5. **A small practice** — one quiet thing to try this week.

Researchers/works referenced per note (matched to existing topics):

- 5-to-1 → John & Julie Gottman, *The Seven Principles for Making Marriage Work*
- Soft startup → Gottman's "harsh vs. soft start-up" studies
- Bids for connection → Gottman, *The Relationship Cure*
- Repair → Gottman repair attempts; Dan Wile
- Attachment → Bowlby, Ainsworth, Sue Johnson (*Hold Me Tight*), Amir Levine (*Attached*)
- Rituals of connection → William Doherty (*The Intentional Family*), Gottman rituals research
- Positive sentiment override → Robert Weiss, Gottman
- Contempt → Gottman's "Four Horsemen"
- Love languages → Gary Chapman, with Sue Johnson's critique from EFT
- Six hours a week → Gottman's "Magic Six Hours"

Paragraphs separated by blank lines so the existing reader (`body.split(/\n{2,}/)`) renders them cleanly. Voice stays warm, quiet, literary, brief — per the project's brand voice. No emojis, no hype, no fabricated quotes; references are attributed to real published work without inventing direct quotations.

## Changes

1. **New migration** `supabase/migrations/<timestamp>_enrich_insights.sql`
   - `UPDATE public.insights SET body = $$...$$, read_minutes = 2 WHERE slug = '...';` for each of the 10 slugs.
   - Uses dollar-quoted strings so apostrophes and line breaks are safe.
   - Idempotent: re-running just rewrites the same rows.
   - No schema changes, no RLS changes, no new columns.

2. **No code changes.** The reader route `src/routes/_authenticated/insights.$slug.tsx`, the home list, and the server function `getInsight` already handle longer bodies, paragraphs, scroll progress, and the back button.

## Out of scope

- No new fields (e.g., a separate "sources" column). Citations are woven into the prose so the reading experience stays one continuous piece.
- No changes to the list page styling or transitions.
- No new insights beyond the existing 10.
