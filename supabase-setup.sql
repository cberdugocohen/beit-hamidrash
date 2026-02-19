-- ============================================================
-- בית מדרש הרב אסף פלג — Supabase Database Setup
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  is_admin BOOLEAN DEFAULT FALSE,
  xp INTEGER DEFAULT 0,
  torah_points INTEGER DEFAULT 0,
  wisdom_coins INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TEXT,
  earned_badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Lesson progress table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  watched_percent INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- 3. Lesson meta table (admin-managed, readable by all)
CREATE TABLE IF NOT EXISTS public.lesson_meta (
  video_id TEXT PRIMARY KEY,
  summary TEXT,
  transcript_url TEXT,
  quiz_url TEXT,
  presentation_url TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lesson_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lesson meta is viewable by everyone"
  ON public.lesson_meta FOR SELECT USING (true);

CREATE POLICY "Admins can insert lesson meta"
  ON public.lesson_meta FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update lesson meta"
  ON public.lesson_meta FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. Daily activities table
CREATE TABLE IF NOT EXISTS public.daily_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_date TEXT NOT NULL,
  lessons_completed INTEGER DEFAULT 0,
  UNIQUE(user_id, activity_date)
);

ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities"
  ON public.daily_activities FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON public.daily_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON public.daily_activities FOR UPDATE USING (auth.uid() = user_id);

-- 5. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Topic settings (images per topic, admin-managed)
CREATE TABLE IF NOT EXISTS public.topic_settings (
  topic TEXT PRIMARY KEY,
  image_url TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.topic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view topic settings"
  ON public.topic_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage topic settings"
  ON public.topic_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user ON public.daily_activities(user_id);
