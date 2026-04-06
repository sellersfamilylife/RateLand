-- Migration: 001_create_tables.sql
-- Creates the profiles and city_searches tables with RLS policies.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Profiles — one row per authenticated user
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- City searches — stores every saved search for a user
CREATE TABLE IF NOT EXISTS city_searches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city             text NOT NULL,
  state            text NOT NULL,
  raw_api_response jsonb NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- ============================================================
-- 2. ENABLE ROW‑LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_searches  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- profiles: users can read only their own row
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- profiles: users can insert their own row (used during sign‑up)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- city_searches: users can read only their own saved searches
CREATE POLICY "Users can view own searches"
  ON city_searches FOR SELECT
  USING (user_id = auth.uid());

-- city_searches: users can insert only under their own user_id
CREATE POLICY "Users can insert own searches"
  ON city_searches FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. AUTO‑CREATE PROFILE ON SIGN‑UP (trigger)
-- ============================================================

-- Function that inserts a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Trigger that fires after every new auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
