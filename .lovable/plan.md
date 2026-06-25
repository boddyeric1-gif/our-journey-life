## Scope

Polish-only. Keep the Soft Dusk palette (deep plum canvas, candlelight ink, dusk-rose accent), keep Instrument Serif / Instrument Sans, keep every existing layout and flow. Lift perceived quality to App-Store level by sharpening tokens, surfaces, type, and tactile feedback. No new pages, no palette/font swap, no redesign.

Observations driving this work:
- All in-app imagery is SVG (Lucide) and the candle-grain background — no blurry raster assets to replace. PWA icons are already PNGs at 192/512; no fix needed.
- Cards/buttons use a single shadow recipe and flat borders. Premium feel comes from layered elevation, hairline highlights, and one well-tuned focus ring — all missing today.
- Bottom tabs, primary CTAs, and hero cards all use the same surface. Hierarchy reads flat on a 6-inch screen.
- Type scale is slightly cramped on mobile (28px serif against 13–15px sans without a consistent rhythm), and serif headings render with default kerning.

## Design system refinements (`src/styles.css`)

1. **Elevation layer** — three named shadow tokens (`--shadow-soft`, `--shadow-lifted`, `--shadow-floating`) tuned for dark plum (deeper, less spread, slight rose tint). Replace the single shadow on `surface-card` and add `surface-card-lifted` for hero/CTAs.
2. **Hairline highlights** — every raised surface gets a 1px inner top highlight (`box-shadow inset 0 1px 0 oklch(1 0 0 / 0.06)`) so cards catch "candlelight" from above. Already present on `surface-card`; tune the value and apply consistently.
3. **Focus ring** — single `--ring-focus` token (rose, 2px offset, 3px ring, soft glow). Apply via `:focus-visible` base styles so every interactive element shares it.
4. **Type rendering** — add `text-rendering: optimizeLegibility`, `font-feature-settings: "kern", "liga", "calt"`, and `font-variant-numeric: oldstyle-nums proportional-nums` to body. Tighten serif `letter-spacing` per size (display −0.015em, h1 −0.01em, h2 −0.005em).
5. **Type scale** — formalize fluid sizes with `clamp()` for `--text-display / -h1 / -h2 / -h3 / -body / -small / -eyebrow`, used by utility classes (`.t-display`, `.t-eyebrow`, etc.). Existing arbitrary `text-[28px]` / `text-[11px]` calls migrate to these.
6. **Motion** — add `--ease-quiet-out` (already there as `--ease-quiet`) plus `--duration-quick` (160ms) and reuse on hover/press. Add a `.tap` utility for `active:scale-[0.985] transition-transform duration-150 ease-quiet`.
7. **Background grain** — keep the candle-grain layers, raise the dot opacity from 0.5 → 0.6 and add a very faint vignette at the bottom edge so cards float, not bleed.

## Component-level polish

**`AppShell` + `BottomTabs`**
- Tab bar uses `surface-card-lifted` with the new floating shadow and a subtle backdrop saturate filter (no glass), so it reads as a separate plane above the content. Active label gains 1px serif italic eyebrow accent. Indicator dot becomes a hairline-rimmed pill.

**`TodayHero` / `HeroFrame`**
- Top accent bar becomes a gradient (rust → clay → transparent, 1.5px) instead of a solid 1px block — gives the card a "wax-seal" header.
- Eyebrow uses the new `.t-eyebrow` token, hero copy uses `.t-display` with balanced wrapping (already present) plus the new serif kerning.
- Primary CTA: pill becomes a properly cushioned 3.5/5 (mobile) → 4/6 (sm) button with the new lifted shadow, inner highlight, and `.tap` press feedback. Secondary CTA gets a hairline border + ghost fill.

**Quests list + chapter detail**
- Category headings get a thin rule beneath, and a small rust serif numeral as a chapter-number badge inside the progress ring (already drawn; just style refinement). Locked cards get a true 1px dashed hairline + soft inner shadow instead of opacity-60 (which currently dims the type below WCAG-comfortable contrast).

**Onboarding + Auth**
- Auth screen gets the same hero surface as the home hero, a single primary CTA, and improved input affordance: 48px target, hairline border that lifts to rust on focus, label as small eyebrow above (not floating). Pairing screen invite code uses the existing serif tracking, tightened to a single line on 360px.

**Premium surfaces (Atlas, Time Capsule, /premium)**
- Each premium card gets the new `surface-card-lifted` with a faint rose top-edge gradient, the "earn it together" sub-card sits inside in `surface-card-quiet` with a divider rule rather than a card-in-card border.
- Atlas pages get tighter snap rhythm (top padding clamped via the new fluid scale) and the heatmap squares pick up a 1px hairline so empty cells aren't invisible.
- Premium product cards align price + name on the same baseline, body copy uses `.t-body` for an extra line of measure.

## Accessibility & performance

- All new focus-ring + interactive states satisfy WCAG AA against the plum canvas.
- No new image assets, no new fonts, no extra JS — the lift is pure CSS and class refactors.
- Existing animation budget unchanged; `prefers-reduced-motion` continues to disable the daily-reveal sequence.

## Out of scope

- Palette, font family, or layout changes.
- New routes, copy edits, or business logic.
- Marketing surfaces (`/`, public pages) — this pass is the authenticated app.
- Dark/light mode toggle (the system is dark by design).

## Validation

After implementation: open Home, Daily, Quests list, a chapter, Atlas, Capsule, Premium, Auth, and Onboarding in a 390×844 Playwright viewport; capture element screenshots of the bottom tab bar, hero card, premium card, and primary CTA; confirm crisp rendering, consistent shadows, and that nothing clips or shifts. Re-run the existing build to make sure no Tailwind class purged.
