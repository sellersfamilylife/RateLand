-- Migration: 003_shared_results.sql
-- Creates shared_results table for public shareable result links.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

CREATE TABLE shared_results (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city       text NOT NULL,
  state      text NOT NULL,
  data       jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shared_results ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous / not-logged-in users) can view shared results.
CREATE POLICY "Anyone can view shared results"
  ON shared_results FOR SELECT
  USING (true);

-- Only authenticated users can create shared links (for their own user id).
CREATE POLICY "Authenticated users can share results"
  ON shared_results FOR INSERT
  WITH CHECK (created_by = auth.uid());
