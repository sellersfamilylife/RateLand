-- Migration: 004_schema_fixes.sql
-- Adds missing indexes on foreign keys and a DELETE policy for shared_results.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

-- ============================================================
-- 1. INDEXES on foreign keys (prevent full table scans)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_city_searches_user_id
  ON city_searches(user_id);

CREATE INDEX IF NOT EXISTS idx_shared_results_created_by
  ON shared_results(created_by);

-- ============================================================
-- 2. DELETE policy for shared_results
-- ============================================================

-- Users can delete their own shared results.
CREATE POLICY "Users can delete own shares"
  ON shared_results FOR DELETE
  USING (created_by = auth.uid());
