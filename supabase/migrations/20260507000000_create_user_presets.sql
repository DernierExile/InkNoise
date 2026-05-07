-- =============================================================================
-- user_presets
-- Stores per-user dithering configuration presets. Pro feature: only users
-- with plan='studio' or plan='founder' can save presets.
--
-- Loading presets is unrestricted (the row simply won't exist for free users).
-- Saving/updating/deleting is gated by RLS check on app_metadata.plan.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_presets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  config      jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_presets_user_id
  ON public.user_presets (user_id, created_at DESC);

-- Auto-update updated_at on row update
CREATE OR REPLACE FUNCTION public.touch_user_presets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_presets_touch ON public.user_presets;
CREATE TRIGGER trg_user_presets_touch
  BEFORE UPDATE ON public.user_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_presets_updated_at();

-- =============================================================================
-- Row-Level Security
-- =============================================================================

ALTER TABLE public.user_presets ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user on a paid plan?
CREATE OR REPLACE FUNCTION public.current_user_is_pro()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'plan') IN ('studio', 'founder'),
    false
  );
$$;

-- SELECT: any authenticated user can read their own presets
DROP POLICY IF EXISTS "user_presets_select_own" ON public.user_presets;
CREATE POLICY "user_presets_select_own"
  ON public.user_presets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: only Pro users can create presets, and only for themselves
DROP POLICY IF EXISTS "user_presets_insert_pro_only" ON public.user_presets;
CREATE POLICY "user_presets_insert_pro_only"
  ON public.user_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.current_user_is_pro()
  );

-- UPDATE: only Pro users can update their own presets
DROP POLICY IF EXISTS "user_presets_update_pro_own" ON public.user_presets;
CREATE POLICY "user_presets_update_pro_own"
  ON public.user_presets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND public.current_user_is_pro())
  WITH CHECK (user_id = auth.uid() AND public.current_user_is_pro());

-- DELETE: any user can delete their own presets (no Pro gate, allows cleanup
-- after downgrade)
DROP POLICY IF EXISTS "user_presets_delete_own" ON public.user_presets;
CREATE POLICY "user_presets_delete_own"
  ON public.user_presets
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
