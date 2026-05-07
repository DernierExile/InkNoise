/*
  # Create user_presets table

  Stores per-user dithering configuration presets. Pro feature: only users
  with plan='studio' or plan='founder' can save presets.

  1. New Tables
    - `user_presets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, 1-60 chars)
      - `config` (jsonb) - dithering config snapshot
      - `created_at`, `updated_at` (timestamptz)
  2. Security
    - Enable RLS on `user_presets`
    - SELECT: own rows
    - INSERT/UPDATE: own rows AND plan is 'studio' or 'founder'
    - DELETE: own rows (no Pro gate — allows cleanup after downgrade)
  3. Helpers
    - `current_user_is_pro()` - reads app_metadata.plan from JWT
    - `touch_user_presets_updated_at()` trigger for updated_at
*/

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

ALTER TABLE public.user_presets ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "user_presets_select_own" ON public.user_presets;
CREATE POLICY "user_presets_select_own"
  ON public.user_presets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_presets_insert_pro_only" ON public.user_presets;
CREATE POLICY "user_presets_insert_pro_only"
  ON public.user_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.current_user_is_pro()
  );

DROP POLICY IF EXISTS "user_presets_update_pro_own" ON public.user_presets;
CREATE POLICY "user_presets_update_pro_own"
  ON public.user_presets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND public.current_user_is_pro())
  WITH CHECK (user_id = auth.uid() AND public.current_user_is_pro());

DROP POLICY IF EXISTS "user_presets_delete_own" ON public.user_presets;
CREATE POLICY "user_presets_delete_own"
  ON public.user_presets
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
