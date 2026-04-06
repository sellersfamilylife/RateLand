-- Migration: 002_add_delete_policy.sql
-- Adds a DELETE RLS policy so users can remove their own saved searches.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

CREATE POLICY "Users can delete own searches"
  ON city_searches FOR DELETE
  USING (user_id = auth.uid());
