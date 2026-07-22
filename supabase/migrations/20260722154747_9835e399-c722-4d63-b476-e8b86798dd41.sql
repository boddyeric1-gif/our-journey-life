
CREATE TABLE public.pwa_install_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('shown','accepted','dismissed','installed','ios_shown','ios_dismissed')),
  platform TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.pwa_install_events TO authenticated;
GRANT ALL ON public.pwa_install_events TO service_role;

ALTER TABLE public.pwa_install_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own install events"
ON public.pwa_install_events
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_pwa_install_events_user ON public.pwa_install_events(user_id, created_at DESC);
CREATE INDEX idx_pwa_install_events_outcome ON public.pwa_install_events(outcome, created_at DESC);
