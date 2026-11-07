-- ==============================================================================
-- CareerPilot AI — Production Supabase Migration & Security Patch
-- Complete, Idempotent, RLS-Hardened, and Non-Destructive PostgreSQL DDL
-- Safe to run in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. USER PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'fresher' CHECK (role IN ('student', 'fresher', 'jobseeker', 'admin')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  target_role TEXT,
  university_or_company TEXT,
  bio TEXT,
  monthly_analysis_count INTEGER NOT NULL DEFAULT 0 CHECK (monthly_analysis_count >= 0),
  monthly_analysis_limit INTEGER NOT NULL DEFAULT 3 CHECK (monthly_analysis_limit >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Non-destructively ensure all columns exist on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_or_company TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_analysis_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_analysis_limit INTEGER NOT NULL DEFAULT 3;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. PRIVILEGED FIELD PROTECTION TRIGGER (PLAN & ROLE INTEGRITY)
-- Prevents regular authenticated users from elevating their role or granting
-- themselves Pro subscriptions via client-side Supabase updates.
-- Only service_role or backend security-definer procedures can alter these.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If invoked in an authenticated client session
  IF auth.role() = 'authenticated' THEN
    -- Block unauthorized role changes
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access Denied: You cannot modify your own account role.';
    END IF;

    -- Block unauthorized subscription upgrades
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'Access Denied: You cannot modify your subscription plan directly. Please upgrade through the billing checkout.';
    END IF;

    -- Block tampering with analysis usage limits
    IF NEW.monthly_analysis_limit IS DISTINCT FROM OLD.monthly_analysis_limit THEN
      RAISE EXCEPTION 'Access Denied: Analysis quotas can only be modified by the billing system.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trigger_protect_profile_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- ==============================================================================
-- 5. RESUMES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  target_role TEXT,
  experience_level TEXT,
  ats_score INTEGER NOT NULL CHECK (ats_score >= 0 AND ats_score <= 100),
  scores_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_skills JSONB NOT NULL DEFAULT '{}'::jsonb,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  action_verbs_count INTEGER NOT NULL DEFAULT 0 CHECK (action_verbs_count >= 0),
  action_verbs_suggestions TEXT[] DEFAULT '{}',
  bullet_point_improvements JSONB DEFAULT '[]'::jsonb,
  recommended_certifications TEXT[] DEFAULT '{}',
  summary_review TEXT,
  raw_resume_text TEXT,
  storage_file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Non-destructively ensure all columns exist on resumes
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS target_role TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS experience_level TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS scores_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS extracted_skills JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS strengths TEXT[] DEFAULT '{}';
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS weaknesses TEXT[] DEFAULT '{}';
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS action_verbs_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS action_verbs_suggestions TEXT[] DEFAULT '{}';
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS bullet_point_improvements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS recommended_certifications TEXT[] DEFAULT '{}';
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS summary_review TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS raw_resume_text TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS storage_file_path TEXT;

-- ==============================================================================
-- 6. JOB MATCHES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.job_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  overall_match_score INTEGER NOT NULL CHECK (overall_match_score >= 0 AND overall_match_score <= 100),
  category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  matched_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  bonus_skills TEXT[] DEFAULT '{}',
  ats_keyword_check JSONB DEFAULT '[]'::jsonb,
  interview_probability TEXT NOT NULL DEFAULT 'Medium' CHECK (interview_probability IN ('High', 'Medium', 'Low')),
  tailoring_advice TEXT[] DEFAULT '{}',
  recommended_resume_edits JSONB DEFAULT '[]'::jsonb,
  verdict TEXT,
  job_description_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 7. COVER LETTERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cover_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'confident' CHECK (tone IN ('confident', 'enthusiastic', 'corporate', 'creative')),
  cover_letter_text TEXT NOT NULL,
  subject_line TEXT,
  key_selling_points TEXT[] DEFAULT '{}',
  suggested_call_to_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 8. JOB APPLICATIONS TRACKER TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT,
  salary_range TEXT,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('wishlist', 'applied', 'screening', 'interviewing', 'offered', 'rejected')),
  interview_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  match_score INTEGER CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
  job_url TEXT,
  contact_person TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Non-destructively ensure all columns exist on job_applications
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS salary_range TEXT;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS application_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'applied';
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS match_score INTEGER;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS job_url TEXT;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Trigger for job_applications updated_at
DROP TRIGGER IF EXISTS trigger_job_applications_updated_at ON public.job_applications;
CREATE TRIGGER trigger_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. ROW-LEVEL SECURITY (RLS) ACTIVATION
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 10. IDEMPOTENT RLS POLICIES (EXPLICIT USING & WITH CHECK)
-- ==============================================================================

-- PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RESUMES POLICIES
DROP POLICY IF EXISTS "resumes_select_own" ON public.resumes;
CREATE POLICY "resumes_select_own"
  ON public.resumes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "resumes_insert_own" ON public.resumes;
CREATE POLICY "resumes_insert_own"
  ON public.resumes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "resumes_update_own" ON public.resumes;
CREATE POLICY "resumes_update_own"
  ON public.resumes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "resumes_delete_own" ON public.resumes;
CREATE POLICY "resumes_delete_own"
  ON public.resumes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- JOB MATCHES POLICIES
DROP POLICY IF EXISTS "job_matches_select_own" ON public.job_matches;
CREATE POLICY "job_matches_select_own"
  ON public.job_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "job_matches_insert_own" ON public.job_matches;
CREATE POLICY "job_matches_insert_own"
  ON public.job_matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "job_matches_update_own" ON public.job_matches;
CREATE POLICY "job_matches_update_own"
  ON public.job_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "job_matches_delete_own" ON public.job_matches;
CREATE POLICY "job_matches_delete_own"
  ON public.job_matches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- COVER LETTERS POLICIES
DROP POLICY IF EXISTS "cover_letters_select_own" ON public.cover_letters;
CREATE POLICY "cover_letters_select_own"
  ON public.cover_letters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cover_letters_insert_own" ON public.cover_letters;
CREATE POLICY "cover_letters_insert_own"
  ON public.cover_letters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cover_letters_update_own" ON public.cover_letters;
CREATE POLICY "cover_letters_update_own"
  ON public.cover_letters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cover_letters_delete_own" ON public.cover_letters;
CREATE POLICY "cover_letters_delete_own"
  ON public.cover_letters FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- JOB APPLICATIONS POLICIES
DROP POLICY IF EXISTS "job_applications_select_own" ON public.job_applications;
CREATE POLICY "job_applications_select_own"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "job_applications_insert_own" ON public.job_applications;
CREATE POLICY "job_applications_insert_own"
  ON public.job_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "job_applications_update_own" ON public.job_applications;
CREATE POLICY "job_applications_update_own"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "job_applications_delete_own" ON public.job_applications;
CREATE POLICY "job_applications_delete_own"
  ON public.job_applications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 11. HARDENED SIGNUP TRIGGER (SAFE EMAIL & ZERO TRUST ROLE ASSIGNMENT)
-- Handles missing/null email gracefully and strictly assigns role='fresher'
-- and plan='free', ignoring client-supplied role metadata.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
BEGIN
  -- Safe email resolution: Handles missing or null email from 3P/anonymous signups
  v_email := COALESCE(
    NEW.email,
    NEW.raw_user_meta_data->>'email',
    'user_' || substr(NEW.id::text, 1, 8) || '@careerpilot.internal'
  );

  -- Safe name resolution: Prefers metadata name, falls back to email prefix, then safe default
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'CareerPilot User'
  );

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    plan,
    monthly_analysis_count,
    monthly_analysis_limit,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_email,
    v_name,
    'fresher',  -- ALWAYS safe default; client metadata role is strictly ignored
    'free',     -- ALWAYS starts on free plan
    0,
    3,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = 'CareerPilot User'
      THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 12. TRUSTED SERVER-SIDE SUBSCRIPTION UPGRADE RPC
-- Only executable by trusted server backend (service_role or database admin)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.upgrade_user_subscription(
  target_user_id UUID,
  new_plan TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Restrict execution to service_role or database admin
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    RAISE EXCEPTION 'Access Denied: Only trusted server webhooks can execute subscription upgrades.';
  END IF;

  IF new_plan NOT IN ('free', 'pro') THEN
    RAISE EXCEPTION 'Invalid plan: %', new_plan;
  END IF;

  UPDATE public.profiles
  SET
    plan = new_plan,
    monthly_analysis_limit = CASE WHEN new_plan = 'pro' THEN 999999 ELSE 3 END,
    updated_at = timezone('utc'::text, now())
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 13. PRIVATE RESUMES STORAGE BUCKET & PER-USER STORAGE RLS POLICIES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760, -- 10MB file limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];

DROP POLICY IF EXISTS "Users upload own resume files" ON storage.objects;
CREATE POLICY "Users upload own resume files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users read own resume files" ON storage.objects;
CREATE POLICY "Users read own resume files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own resume files" ON storage.objects;
CREATE POLICY "Users update own resume files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own resume files" ON storage.objects;
CREATE POLICY "Users delete own resume files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ==============================================================================
-- 14. FEATURE USAGE TRACKING & ENGAGEMENT METRICS TABLES
-- Supports both public.feature_usage and public.feature_usage_logs
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.feature_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL CHECK (feature_name IN (
    'resume_analysis',
    'job_application',
    'skill_gap_analysis',
    'mock_interview',
    'cover_letter',
    'job_match',
    'roadmap_task'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON public.feature_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_feature ON public.feature_usage_logs(user_id, feature_name);

ALTER TABLE public.feature_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_logs_select_own" ON public.feature_usage_logs;
CREATE POLICY "usage_logs_select_own" ON public.feature_usage_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_logs_insert_own" ON public.feature_usage_logs;
CREATE POLICY "usage_logs_insert_own" ON public.feature_usage_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_logs_delete_own" ON public.feature_usage_logs;
CREATE POLICY "usage_logs_delete_own" ON public.feature_usage_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Also create public.feature_usage table for full compatibility
CREATE TABLE IF NOT EXISTS public.feature_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user_date ON public.feature_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_feature ON public.feature_usage(user_id, feature_name);

ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_usage_select_own" ON public.feature_usage;
CREATE POLICY "feature_usage_select_own" ON public.feature_usage
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "feature_usage_insert_own" ON public.feature_usage;
CREATE POLICY "feature_usage_insert_own" ON public.feature_usage
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feature_usage_delete_own" ON public.feature_usage;
CREATE POLICY "feature_usage_delete_own" ON public.feature_usage
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


