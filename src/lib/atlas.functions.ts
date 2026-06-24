import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AtlasDTO = {
  coupleId: string;
  coupleName: string;
  partnerNames: [string, string] | [string];
  since: string;            // ISO date
  daysTogether: number;
  rhythm: {
    currentStreak: number;
    longestStreak: number;
    heatmap: { iso: string; count: number }[]; // last 84 days
    totalSharedDays: number;
  };
  letters: {
    total: number;
    firstLetter: { excerpt: string; date: string } | null;
    longestLetter: { excerpt: string; date: string } | null;
    latestLetter: { excerpt: string; date: string } | null;
  };
  chapters: { title: string; completedAt: string }[];
  themes: { label: string; count: number }[];
  milestones: { date: string; label: string }[];
  note: string;
};

async function getCoupleWithEntitlement(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles").select("current_couple_id").eq("id", userId).maybeSingle();
  const coupleId = profile?.current_couple_id as string | null | undefined;
  if (!coupleId) throw new Error("Pair with your partner first.");
  const { data: ent } = await supabase.rpc("couple_has_entitlement", {
    _couple_id: coupleId, _product: "the_atlas",
  });
  if (!ent) throw new Error("The Atlas isn't unlocked for your couple yet.");
  return coupleId;
}

function excerpt(s: string | null | undefined, n = 280) {
  if (!s) return "";
  const t = s.trim().replace(/\s+/g, " ");
  return t.length <= n ? t : t.slice(0, n - 1) + "…";
}

export const getAtlas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AtlasDTO> => {
    const { supabase, userId } = context;
    const coupleId = await getCoupleWithEntitlement(supabase, userId);

    const heatStart = new Date();
    heatStart.setUTCDate(heatStart.getUTCDate() - 83);
    const heatStartISO = heatStart.toISOString().slice(0, 10);

    const [
      coupleRes, membersRes, streakRes, lettersRes, chaptersRes,
      heatRes, milestonesRes, noteRes, categoriesRes,
    ] = await Promise.all([
      supabase.from("couples").select("name, created_at, paired_at").eq("id", coupleId).maybeSingle(),
      supabase.from("couple_members").select("user_id").eq("couple_id", coupleId),
      supabase.from("couple_streaks").select("*").eq("couple_id", coupleId).maybeSingle(),
      supabase.from("letters").select("id, author_id, body, created_at, is_first_letter")
        .eq("couple_id", coupleId).order("created_at", { ascending: true }),
      supabase.from("quest_step_completions")
        .select("step_id, created_at, quest_steps!inner(chapter_id, quest_chapters!inner(title, category_id))")
        .eq("couple_id", coupleId).order("created_at", { ascending: true }),
      supabase.from("daily_responses").select("prompt_date, user_id")
        .eq("couple_id", coupleId).gte("prompt_date", heatStartISO),
      supabase.from("xp_events").select("kind, created_at, amount").eq("couple_id", coupleId)
        .order("created_at", { ascending: true }),
      supabase.from("atlas_notes").select("body").eq("couple_id", coupleId).maybeSingle(),
      supabase.from("quest_categories").select("id, label"),
    ]);

    const couple = (coupleRes.data ?? null) as { name: string | null; created_at: string; paired_at: string | null } | null;
    const memberIds = ((membersRes.data ?? []) as { user_id: string }[]).map(m => m.user_id);

    const { data: profiles } = await supabase
      .from("profiles").select("id, display_name").in("id", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"]);
    const nameOf = new Map<string, string>(
      (profiles ?? []).map((p: any) => [p.id as string, (p.display_name as string) || "—"]),
    );
    const partnerNames = (memberIds.map(id => nameOf.get(id) || "—")) as [string] | [string, string];

    const since = (couple?.paired_at ?? couple?.created_at ?? new Date().toISOString()).slice(0, 10);
    const daysTogether = Math.max(
      1,
      Math.floor((Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );

    // Heatmap: last 84 days, count = distinct member responses per day (0/1/2).
    const heatMap = new Map<string, Set<string>>();
    for (const r of (heatRes.data ?? []) as { prompt_date: string; user_id: string }[]) {
      if (!heatMap.has(r.prompt_date)) heatMap.set(r.prompt_date, new Set());
      heatMap.get(r.prompt_date)!.add(r.user_id);
    }
    const heatmap: { iso: string; count: number }[] = [];
    let totalSharedDays = 0;
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const c = heatMap.get(iso)?.size ?? 0;
      if (c >= 2) totalSharedDays += 1;
      heatmap.push({ iso, count: c });
    }

    // Letters
    const letters = (lettersRes.data ?? []) as Array<{
      id: string; author_id: string; body: string; created_at: string; is_first_letter: boolean;
    }>;
    const first = letters.find(l => l.is_first_letter) ?? letters[0] ?? null;
    const latest = letters.length ? letters[letters.length - 1] : null;
    const longest = letters.length
      ? letters.reduce((a, b) => (b.body?.length ?? 0) > (a.body?.length ?? 0) ? b : a)
      : null;

    // Chapters completed (one row per distinct chapter)
    const chapterRows = (chaptersRes.data ?? []) as Array<{
      created_at: string;
      quest_steps: { chapter_id: string; quest_chapters: { title: string; category_id: string | null } };
    }>;
    const seenChapter = new Set<string>();
    const chapters: { title: string; completedAt: string }[] = [];
    for (const row of chapterRows) {
      const id = row.quest_steps.chapter_id;
      if (seenChapter.has(id)) continue;
      seenChapter.add(id);
      chapters.push({ title: row.quest_steps.quest_chapters.title, completedAt: row.created_at });
    }

    // Themes: count quest completions grouped by category label.
    const categoryLabel = new Map<string, string>();
    for (const c of (categoriesRes.data ?? []) as { id: string; title: string }[]) {
      categoryLabel.set(c.id, c.title);
    }
    const themeCounts = new Map<string, number>();
    for (const row of chapterRows) {
      const catId = row.quest_steps.quest_chapters.category_id;
      const label = (catId && categoryLabel.get(catId)) || "Together";
      themeCounts.set(label, (themeCounts.get(label) ?? 0) + 1);
    }
    const themes = [...themeCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Milestones from XP events: first daily, first letter, chapters, streaks.
    const xp = (milestonesRes.data ?? []) as Array<{ kind: string; created_at: string }>;
    const milestoneLabel: Record<string, string> = {
      daily: "First daily reflection together",
      letter: "First letter exchanged",
      first_letter: "First letter exchanged",
      quest_step: "Began your first quest step",
      quest_chapter: "Completed a chapter",
      solo_reflection: "First solo reflection",
      onboarding: "Joined Our Journey",
    };
    const milestoneSeen = new Set<string>();
    const milestones: { date: string; label: string }[] = [];
    for (const e of xp) {
      const label = milestoneLabel[e.kind];
      if (!label || milestoneSeen.has(label)) continue;
      milestoneSeen.add(label);
      milestones.push({ date: e.created_at.slice(0, 10), label });
    }
    if (couple?.paired_at) {
      milestones.unshift({ date: couple.paired_at.slice(0, 10), label: "Paired" });
    }
    milestones.sort((a, b) => a.date.localeCompare(b.date));

    return {
      coupleId,
      coupleName: couple?.name ?? partnerNames.join(" & "),
      partnerNames,
      since,
      daysTogether,
      rhythm: {
        currentStreak: (streakRes.data as any)?.current_streak ?? 0,
        longestStreak: (streakRes.data as any)?.longest_streak ?? 0,
        heatmap,
        totalSharedDays,
      },
      letters: {
        total: letters.length,
        firstLetter: first ? { excerpt: excerpt(first.body), date: first.created_at.slice(0, 10) } : null,
        longestLetter: longest ? { excerpt: excerpt(longest.body), date: longest.created_at.slice(0, 10) } : null,
        latestLetter: latest && latest.id !== first?.id
          ? { excerpt: excerpt(latest.body), date: latest.created_at.slice(0, 10) }
          : null,
      },
      chapters,
      themes,
      milestones,
      note: (noteRes.data as any)?.body ?? "",
    };
  });

export const saveAtlasNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ body: z.string().max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const coupleId = await getCoupleWithEntitlement(supabase, userId);
    const { error } = await supabase.from("atlas_notes").upsert({
      couple_id: coupleId, body: data.body, updated_by: userId,
    }, { onConflict: "couple_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const exportAtlasPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ pdfBase64: string }> => {
    const { supabase, userId } = context;
    await getCoupleWithEntitlement(supabase, userId);
    // Re-use getAtlas logic by calling the handler directly via a fresh call.
    // We just compose inline to avoid double auth-fetch overhead.
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const atlas = await buildAtlasInline(supabase, userId);

    const doc = await PDFDocument.create();
    const serif = await doc.embedFont(StandardFonts.TimesRoman);
    const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const sans = await doc.embedFont(StandardFonts.Helvetica);

    const W = 595.28; // A4 portrait
    const H = 841.89;
    const ink = rgb(0.13, 0.12, 0.11);
    const inkSoft = rgb(0.35, 0.32, 0.30);
    const inkMute = rgb(0.55, 0.52, 0.50);
    const rust = rgb(0.72, 0.36, 0.22);
    const canvasC = rgb(0.985, 0.975, 0.96);
    const border = rgb(0.86, 0.83, 0.78);

    function newPage() {
      const p = doc.addPage([W, H]);
      p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: canvasC });
      return p;
    }
    function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const t = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(t, size) > maxWidth) {
          if (cur) lines.push(cur);
          cur = w;
        } else cur = t;
      }
      if (cur) lines.push(cur);
      return lines;
    }
    function drawHeader(p: any, label: string) {
      p.drawText(label.toUpperCase(), { x: 60, y: H - 60, size: 9, font: sans, color: inkMute });
      p.drawLine({
        start: { x: 60, y: H - 70 }, end: { x: W - 60, y: H - 70 },
        thickness: 0.5, color: border,
      });
    }
    function drawFooter(p: any, pageNum: number) {
      p.drawText(`Our Journey · Atlas · page ${pageNum}`, {
        x: 60, y: 40, size: 8, font: sans, color: inkMute,
      });
    }

    let pageNum = 0;
    // 1. Cover
    {
      const p = newPage(); pageNum++;
      const names = atlas.partnerNames.join("  &  ");
      p.drawText("The Atlas", { x: 60, y: H - 160, size: 36, font: serifItalic, color: rust });
      p.drawText(names, { x: 60, y: H - 220, size: 24, font: serif, color: ink });
      p.drawText(`Together since ${atlas.since}`, {
        x: 60, y: H - 260, size: 12, font: sans, color: inkSoft,
      });
      p.drawText(`${atlas.daysTogether} days, and counting.`, {
        x: 60, y: H - 280, size: 12, font: sans, color: inkSoft,
      });
      drawFooter(p, pageNum);
    }

    // 2. Rhythm
    {
      const p = newPage(); pageNum++;
      drawHeader(p, "Rhythm");
      p.drawText("How we've shown up", { x: 60, y: H - 110, size: 22, font: serif, color: ink });
      p.drawText(`Current streak: ${atlas.rhythm.currentStreak} days`, {
        x: 60, y: H - 150, size: 12, font: sans, color: inkSoft,
      });
      p.drawText(`Longest streak: ${atlas.rhythm.longestStreak} days`, {
        x: 60, y: H - 170, size: 12, font: sans, color: inkSoft,
      });
      p.drawText(`${atlas.rhythm.totalSharedDays} shared days in the last 12 weeks`, {
        x: 60, y: H - 190, size: 12, font: sans, color: inkSoft,
      });
      // 7×12 heatmap grid
      const cell = 22, gap = 4;
      const cols = 12;
      const startX = 60, startY = H - 250;
      atlas.rhythm.heatmap.forEach((d, i) => {
        const col = Math.floor(i / 7);
        const row = i % 7;
        const x = startX + col * (cell + gap);
        const y = startY - row * (cell + gap);
        const intensity = d.count === 2 ? 1 : d.count === 1 ? 0.45 : 0.08;
        p.drawRectangle({
          x, y, width: cell, height: cell,
          color: rgb(
            0.72 + (1 - 0.72) * (1 - intensity),
            0.36 + (1 - 0.36) * (1 - intensity),
            0.22 + (1 - 0.22) * (1 - intensity),
          ),
        });
      });
      p.drawText("Each square is a day. Darker means both of you showed up.", {
        x: 60, y: startY - 7 * (cell + gap) - 16, size: 9, font: sans, color: inkMute,
      });
      drawFooter(p, pageNum);
    }

    // 3. First letter
    if (atlas.letters.firstLetter) {
      const p = newPage(); pageNum++;
      drawHeader(p, "The first letter");
      p.drawText(atlas.letters.firstLetter.date, { x: 60, y: H - 110, size: 11, font: sans, color: inkMute });
      const lines = wrap(`"${atlas.letters.firstLetter.excerpt}"`, serifItalic, 14, W - 120);
      lines.forEach((line, i) => {
        p.drawText(line, { x: 60, y: H - 150 - i * 22, size: 14, font: serifItalic, color: ink });
      });
      drawFooter(p, pageNum);
    }

    // 4. Letters, gathered
    {
      const p = newPage(); pageNum++;
      drawHeader(p, "Letters, gathered");
      p.drawText(`${atlas.letters.total} letters written`, {
        x: 60, y: H - 110, size: 22, font: serif, color: ink,
      });
      let cursor = H - 160;
      if (atlas.letters.longestLetter) {
        p.drawText("The longest", { x: 60, y: cursor, size: 11, font: sans, color: rust });
        cursor -= 18;
        const lines = wrap(atlas.letters.longestLetter.excerpt, serifItalic, 11, W - 120);
        for (const line of lines.slice(0, 10)) {
          p.drawText(line, { x: 60, y: cursor, size: 11, font: serifItalic, color: inkSoft });
          cursor -= 16;
        }
        cursor -= 12;
      }
      if (atlas.letters.latestLetter) {
        p.drawText("The most recent", { x: 60, y: cursor, size: 11, font: sans, color: rust });
        cursor -= 18;
        const lines = wrap(atlas.letters.latestLetter.excerpt, serifItalic, 11, W - 120);
        for (const line of lines.slice(0, 10)) {
          p.drawText(line, { x: 60, y: cursor, size: 11, font: serifItalic, color: inkSoft });
          cursor -= 16;
        }
      }
      drawFooter(p, pageNum);
    }

    // 5. Chapters
    {
      const p = newPage(); pageNum++;
      drawHeader(p, "Chapters walked");
      p.drawText("What you've moved through", {
        x: 60, y: H - 110, size: 22, font: serif, color: ink,
      });
      let cursor = H - 160;
      if (atlas.chapters.length === 0) {
        p.drawText("Your first chapter is still ahead.", {
          x: 60, y: cursor, size: 12, font: serifItalic, color: inkMute,
        });
      }
      for (const ch of atlas.chapters.slice(0, 24)) {
        p.drawText(ch.title, { x: 60, y: cursor, size: 12, font: serif, color: ink });
        p.drawText(ch.completedAt, {
          x: W - 60 - sans.widthOfTextAtSize(ch.completedAt, 10),
          y: cursor, size: 10, font: sans, color: inkMute,
        });
        cursor -= 22;
        if (cursor < 80) break;
      }
      drawFooter(p, pageNum);
    }

    // 6. Themes
    {
      const p = newPage(); pageNum++;
      drawHeader(p, "Themes");
      p.drawText("What kept showing up", {
        x: 60, y: H - 110, size: 22, font: serif, color: ink,
      });
      let x = 60, y = H - 160;
      for (const t of atlas.themes) {
        const label = `${t.label} · ${t.count}`;
        const w = sans.widthOfTextAtSize(label, 11) + 24;
        if (x + w > W - 60) { x = 60; y -= 36; }
        p.drawRectangle({ x, y: y - 8, width: w, height: 26, borderColor: border, borderWidth: 0.7, color: canvasC });
        p.drawText(label, { x: x + 12, y: y, size: 11, font: sans, color: inkSoft });
        x += w + 8;
      }
      if (atlas.themes.length === 0) {
        p.drawText("Themes will emerge as you walk more chapters.", {
          x: 60, y: H - 160, size: 12, font: serifItalic, color: inkMute,
        });
      }
      drawFooter(p, pageNum);
    }

    // 7. Milestones
    {
      const p = newPage(); pageNum++;
      drawHeader(p, "Milestones");
      p.drawText("Markers along the way", {
        x: 60, y: H - 110, size: 22, font: serif, color: ink,
      });
      let cursor = H - 160;
      for (const m of atlas.milestones.slice(0, 22)) {
        p.drawCircle({ x: 66, y: cursor + 4, size: 2.5, color: rust });
        p.drawText(m.date, { x: 80, y: cursor, size: 10, font: sans, color: inkMute });
        p.drawText(m.label, { x: 150, y: cursor, size: 11, font: serif, color: ink });
        cursor -= 22;
        if (cursor < 80) break;
      }
      drawFooter(p, pageNum);
    }

    // 8. Note
    {
      const p = newPage(); pageNum++;
      drawHeader(p, "A note from you");
      const body = atlas.note?.trim()
        ? atlas.note.trim()
        : "Add a note before you save this — anything you want to remember about right now.";
      const lines = wrap(body, atlas.note?.trim() ? serif : serifItalic, 13, W - 120);
      lines.slice(0, 28).forEach((line, i) => {
        p.drawText(line, {
          x: 60, y: H - 130 - i * 20, size: 13,
          font: atlas.note?.trim() ? serif : serifItalic,
          color: atlas.note?.trim() ? ink : inkMute,
        });
      });
      drawFooter(p, pageNum);
    }

    const bytes = await doc.save();
    // Convert to base64 without spread to avoid stack overflow on large arrays
    let bin = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return { pdfBase64: btoa(bin) };
  });

// Internal aggregator used by exportAtlasPdf so we don't double-validate auth.
async function buildAtlasInline(supabase: any, userId: string): Promise<AtlasDTO> {
  const { data: profile } = await supabase
    .from("profiles").select("current_couple_id").eq("id", userId).maybeSingle();
  const coupleId = profile.current_couple_id as string;

  const heatStart = new Date();
  heatStart.setUTCDate(heatStart.getUTCDate() - 83);
  const heatStartISO = heatStart.toISOString().slice(0, 10);

  const [
    coupleRes, membersRes, streakRes, lettersRes, chaptersRes,
    heatRes, milestonesRes, noteRes, categoriesRes,
  ] = await Promise.all([
    supabase.from("couples").select("name, created_at, paired_at").eq("id", coupleId).maybeSingle(),
    supabase.from("couple_members").select("user_id").eq("couple_id", coupleId),
    supabase.from("couple_streaks").select("*").eq("couple_id", coupleId).maybeSingle(),
    supabase.from("letters").select("id, author_id, body, created_at, is_first_letter")
      .eq("couple_id", coupleId).order("created_at", { ascending: true }),
    supabase.from("quest_step_completions")
      .select("step_id, created_at, quest_steps!inner(chapter_id, quest_chapters!inner(title, category_id))")
      .eq("couple_id", coupleId).order("created_at", { ascending: true }),
    supabase.from("daily_responses").select("prompt_date, user_id")
      .eq("couple_id", coupleId).gte("prompt_date", heatStartISO),
    supabase.from("xp_events").select("kind, created_at, amount").eq("couple_id", coupleId)
      .order("created_at", { ascending: true }),
    supabase.from("atlas_notes").select("body").eq("couple_id", coupleId).maybeSingle(),
    supabase.from("quest_categories").select("id, label"),
  ]);

  const couple = (coupleRes.data ?? null) as { name: string | null; created_at: string; paired_at: string | null } | null;
  const memberIds = ((membersRes.data ?? []) as { user_id: string }[]).map(m => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles").select("id, display_name").in("id", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"]);
  const nameOf = new Map<string, string>(
    (profiles ?? []).map((p: any) => [p.id as string, (p.display_name as string) || "—"]),
  );
  const partnerNames = (memberIds.map(id => nameOf.get(id) || "—")) as [string] | [string, string];

  const since = (couple?.paired_at ?? couple?.created_at ?? new Date().toISOString()).slice(0, 10);
  const daysTogether = Math.max(1,
    Math.floor((Date.now() - new Date(since).getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const heatMap = new Map<string, Set<string>>();
  for (const r of (heatRes.data ?? []) as { prompt_date: string; user_id: string }[]) {
    if (!heatMap.has(r.prompt_date)) heatMap.set(r.prompt_date, new Set());
    heatMap.get(r.prompt_date)!.add(r.user_id);
  }
  const heatmap: { iso: string; count: number }[] = [];
  let totalSharedDays = 0;
  for (let i = 83; i >= 0; i--) {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const c = heatMap.get(iso)?.size ?? 0;
    if (c >= 2) totalSharedDays += 1;
    heatmap.push({ iso, count: c });
  }

  const letters = (lettersRes.data ?? []) as Array<{
    id: string; author_id: string; body: string; created_at: string; is_first_letter: boolean;
  }>;
  const first = letters.find(l => l.is_first_letter) ?? letters[0] ?? null;
  const latest = letters.length ? letters[letters.length - 1] : null;
  const longest = letters.length
    ? letters.reduce((a, b) => (b.body?.length ?? 0) > (a.body?.length ?? 0) ? b : a)
    : null;

  const chapterRows = (chaptersRes.data ?? []) as Array<{
    created_at: string;
    quest_steps: { chapter_id: string; quest_chapters: { title: string; category_id: string | null } };
  }>;
  const seenChapter = new Set<string>();
  const chapters: { title: string; completedAt: string }[] = [];
  for (const row of chapterRows) {
    const id = row.quest_steps.chapter_id;
    if (seenChapter.has(id)) continue;
    seenChapter.add(id);
    chapters.push({ title: row.quest_steps.quest_chapters.title, completedAt: row.created_at });
  }

  const categoryLabel = new Map<string, string>();
  for (const c of (categoriesRes.data ?? []) as { id: string; title: string }[]) {
    categoryLabel.set(c.id, c.title);
  }
  const themeCounts = new Map<string, number>();
  for (const row of chapterRows) {
    const catId = row.quest_steps.quest_chapters.category_id;
    const label = (catId && categoryLabel.get(catId)) || "Together";
    themeCounts.set(label, (themeCounts.get(label) ?? 0) + 1);
  }
  const themes = [...themeCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const xp = (milestonesRes.data ?? []) as Array<{ kind: string; created_at: string }>;
  const milestoneLabel: Record<string, string> = {
    daily: "First daily reflection together",
    letter: "First letter exchanged",
    first_letter: "First letter exchanged",
    quest_step: "Began your first quest step",
    quest_chapter: "Completed a chapter",
    solo_reflection: "First solo reflection",
    onboarding: "Joined Our Journey",
  };
  const seen = new Set<string>();
  const milestones: { date: string; label: string }[] = [];
  for (const e of xp) {
    const label = milestoneLabel[e.kind];
    if (!label || seen.has(label)) continue;
    seen.add(label);
    milestones.push({ date: e.created_at.slice(0, 10), label });
  }
  if (couple?.paired_at) milestones.unshift({ date: couple.paired_at.slice(0, 10), label: "Paired" });
  milestones.sort((a, b) => a.date.localeCompare(b.date));

  return {
    coupleId,
    coupleName: couple?.name ?? partnerNames.join(" & "),
    partnerNames,
    since,
    daysTogether,
    rhythm: {
      currentStreak: (streakRes.data as any)?.current_streak ?? 0,
      longestStreak: (streakRes.data as any)?.longest_streak ?? 0,
      heatmap,
      totalSharedDays,
    },
    letters: {
      total: letters.length,
      firstLetter: first ? { excerpt: excerpt(first.body), date: first.created_at.slice(0, 10) } : null,
      longestLetter: longest ? { excerpt: excerpt(longest.body), date: longest.created_at.slice(0, 10) } : null,
      latestLetter: latest && latest.id !== first?.id
        ? { excerpt: excerpt(latest.body), date: latest.created_at.slice(0, 10) }
        : null,
    },
    chapters,
    themes,
    milestones,
    note: (noteRes.data as any)?.body ?? "",
  };
}
