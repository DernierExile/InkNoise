/*
  # Create email captures table

  1. New Tables
    - `email_captures`
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `source` (text, default 'inknoise_modal') - where the signup came from
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `email_captures` table
    - Add INSERT policy for anonymous users (public form submission)
    - No SELECT/UPDATE/DELETE policies for anon (data is write-only from frontend)
*/

CREATE TABLE IF NOT EXISTS email_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  source text NOT NULL DEFAULT 'inknoise_modal',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit their email"
  ON email_captures
  FOR INSERT
  TO anon
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) > 0
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );
