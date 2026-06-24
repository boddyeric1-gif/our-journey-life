
-- ====== TIME CAPSULES ======
CREATE TABLE public.time_capsules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('letter','voice')),
  title text NOT NULL,
  body text,
  audio_path text,
  audio_duration_sec integer,
  unlock_at timestamptz NOT NULL,
  unlocked_at timestamptz,
  recipient text NOT NULL DEFAULT 'partner' CHECK (recipient IN ('partner','both','self')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_capsules_couple_unlock ON public.time_capsules(couple_id, unlock_at);
CREATE INDEX idx_time_capsules_couple_unlocked ON public.time_capsules(couple_id, unlocked_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_capsules TO authenticated;
GRANT ALL ON public.time_capsules TO service_role;

ALTER TABLE public.time_capsules ENABLE ROW LEVEL SECURITY;

-- Author can always see their own capsules (to edit / cancel before unlock).
-- Other couple members can only see capsules whose unlock_at has passed.
CREATE POLICY "Members read unlocked or own capsules"
  ON public.time_capsules FOR SELECT
  TO authenticated
  USING (
    public.is_couple_member(couple_id)
    AND (author_id = auth.uid() OR unlock_at <= now())
  );

CREATE POLICY "Members create capsules they author"
  ON public.time_capsules FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_couple_member(couple_id)
    AND author_id = auth.uid()
  );

-- Authors may edit their own capsule before its unlock window opens.
-- Partner-side "mark opened" goes through service-role server fn.
CREATE POLICY "Authors update own sealed capsules"
  ON public.time_capsules FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() AND unlock_at > now())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors delete own sealed capsules"
  ON public.time_capsules FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() AND unlock_at > now());

CREATE TRIGGER time_capsules_touch_updated_at
  BEFORE UPDATE ON public.time_capsules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ====== ATLAS NOTES ======
CREATE TABLE public.atlas_notes (
  couple_id uuid PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atlas_notes TO authenticated;
GRANT ALL ON public.atlas_notes TO service_role;

ALTER TABLE public.atlas_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read atlas note"
  ON public.atlas_notes FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Members insert atlas note"
  ON public.atlas_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Members update atlas note"
  ON public.atlas_notes FOR UPDATE
  TO authenticated
  USING (public.is_couple_member(couple_id))
  WITH CHECK (public.is_couple_member(couple_id));

CREATE TRIGGER atlas_notes_touch_updated_at
  BEFORE UPDATE ON public.atlas_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ====== STORAGE POLICIES for time-capsules bucket ======
-- Path convention: <couple_id>/<capsule_id>.<ext>
-- Author uploads + reads own; partner reads only after unlock_at via signed URL minted server-side.
-- Direct anon/auth reads are blocked; reads go through server function with signed URL.

CREATE POLICY "Capsule authors upload to their couple folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'time-capsules'
    AND public.is_couple_member((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Capsule authors read their own audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'time-capsules'
    AND owner = auth.uid()
  );

CREATE POLICY "Capsule authors delete their own audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'time-capsules'
    AND owner = auth.uid()
  );
