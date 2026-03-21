-- ============================================
-- SUPABASE MIGRATION: Garden Journal
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text default '',
  phone text,
  public_slug text unique,
  journal_revealed boolean default false,
  plan text default 'free' check (plan in ('free', 'grower', 'pro')),
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_profiles_slug on public.profiles(public_slug);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- GARDENS TABLE
-- ============================================
create table public.gardens (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text default 'My Garden',
  lat double precision default 51.4545,
  lng double precision default -2.5879,
  created_at timestamptz default now()
);

-- Auto-create garden on profile creation
create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.gardens (owner_id, name)
  values (new.id, 'My Garden');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  channel text not null default 'whatsapp',
  channel_user_id text not null,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_conversations_channel_user on public.conversations(channel, channel_user_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text default '',
  media_urls text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index idx_messages_conversation on public.messages(conversation_id);

-- ============================================
-- PENDING IMAGES TABLE (batch queue for multi-image handling)
-- ============================================
create table public.pending_images (
  id uuid default uuid_generate_v4() primary key,
  phone text not null,
  profile_name text not null default 'Gardener',
  whatsapp_message_id text not null,
  media_id text not null,
  mime_type text not null default 'image/jpeg',
  caption text default '',
  created_at timestamptz default now()
);

create index idx_pending_images_phone on public.pending_images(phone, created_at);

-- ============================================
-- PLANTS TABLE
-- ============================================
create table public.plants (
  id uuid default uuid_generate_v4() primary key,
  garden_id uuid references public.gardens(id) on delete cascade not null,
  slug text not null,
  common_name text not null,
  variety text default 'Unknown',
  latin_name text default '',
  confidence text default 'partial',
  sow_date date,
  location text default 'indoor',
  category text default 'flower',
  notes text default '',
  seed_source text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_plants_garden on public.plants(garden_id);
create index idx_plants_slug on public.plants(garden_id, slug);

-- ============================================
-- LOG ENTRIES TABLE
-- ============================================
create table public.log_entries (
  id uuid default uuid_generate_v4() primary key,
  garden_id uuid references public.gardens(id) on delete cascade not null,
  plant_id uuid references public.plants(id) on delete set null,
  date date default current_date,
  cloudinary_url text default '',
  caption text default '',
  status text default 'sowed',
  labeled boolean default false,
  created_at timestamptz default now()
);

create index idx_logs_garden on public.log_entries(garden_id);
create index idx_logs_plant on public.log_entries(plant_id);

-- ============================================
-- GROWTH ENTRIES TABLE
-- ============================================
create table public.growth_entries (
  id uuid default uuid_generate_v4() primary key,
  garden_id uuid references public.gardens(id) on delete cascade not null,
  plant_id uuid references public.plants(id) on delete cascade not null,
  date date default current_date,
  height_cm double precision,
  leaf_count integer,
  health_score integer,
  notes text default '',
  created_at timestamptz default now()
);

create index idx_growth_plant on public.growth_entries(plant_id);

-- ============================================
-- CARE EVENTS TABLE
-- ============================================
create table public.care_events (
  id uuid default uuid_generate_v4() primary key,
  garden_id uuid references public.gardens(id) on delete cascade not null,
  plant_id uuid references public.plants(id) on delete cascade not null,
  type text not null,
  date date default current_date,
  notes text default '',
  quantity text default '',
  created_at timestamptz default now()
);

create index idx_care_plant on public.care_events(plant_id);

-- ============================================
-- SOIL READINGS TABLE
-- ============================================
create table public.soil_readings (
  id uuid default uuid_generate_v4() primary key,
  garden_id uuid references public.gardens(id) on delete cascade not null,
  plant_id uuid references public.plants(id) on delete cascade not null,
  date date default current_date,
  ph double precision,
  nitrogen text,
  phosphorus text,
  potassium text,
  moisture text,
  notes text default '',
  created_at timestamptz default now()
);

create index idx_soil_plant on public.soil_readings(plant_id);

-- ============================================
-- ADVICE ENTRIES TABLE
-- ============================================
create table public.advice_entries (
  id uuid default uuid_generate_v4() primary key,
  garden_id uuid references public.gardens(id) on delete cascade not null,
  plant_id uuid references public.plants(id) on delete set null,
  category text not null,
  priority text not null,
  title text not null,
  body text default '',
  action_required boolean default false,
  dismissed boolean default false,
  generated_at timestamptz default now(),
  expires_at timestamptz,
  source text default 'knowledge-base'
);

create index idx_advice_garden on public.advice_entries(garden_id);

-- ============================================
-- WEATHER CACHE TABLE
-- ============================================
create table public.weather_cache (
  id uuid default uuid_generate_v4() primary key,
  garden_id uuid references public.gardens(id) on delete cascade not null,
  date date not null,
  temp_max double precision,
  temp_min double precision,
  temp_current double precision,
  precipitation double precision,
  humidity double precision,
  wind_speed double precision,
  uv_index double precision,
  soil_temp_10cm double precision,
  soil_moisture double precision,
  sunrise text,
  sunset text,
  condition text,
  frost_risk boolean default false,
  created_at timestamptz default now(),
  unique(garden_id, date)
);

-- ============================================
-- SPACES TABLE
-- ============================================
create table public.spaces (
  id uuid default uuid_generate_v4() primary key,
  garden_id uuid references public.gardens(id) on delete cascade not null,
  name text default 'New Space',
  type text default 'greenhouse',
  description text default '',
  background_image_url text default '',
  width integer default 100,
  height integer default 60,
  plant_positions jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index idx_spaces_garden on public.spaces(garden_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.gardens enable row level security;
alter table public.plants enable row level security;
alter table public.log_entries enable row level security;
alter table public.growth_entries enable row level security;
alter table public.care_events enable row level security;
alter table public.soil_readings enable row level security;
alter table public.advice_entries enable row level security;
alter table public.weather_cache enable row level security;
alter table public.spaces enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.pending_images enable row level security;

-- Profiles: own profile only
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Gardens: own gardens only
create policy "Users can view own gardens"
  on public.gardens for select using (auth.uid() = owner_id);
create policy "Users can insert own gardens"
  on public.gardens for insert with check (auth.uid() = owner_id);
create policy "Users can update own gardens"
  on public.gardens for update using (auth.uid() = owner_id);
create policy "Users can delete own gardens"
  on public.gardens for delete using (auth.uid() = owner_id);

-- Helper: check garden ownership
create or replace function public.user_owns_garden(check_garden_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.gardens
    where id = check_garden_id and owner_id = auth.uid()
  );
$$ language sql security definer stable;

-- Plants
create policy "plants_select" on public.plants for select using (public.user_owns_garden(garden_id));
create policy "plants_insert" on public.plants for insert with check (public.user_owns_garden(garden_id));
create policy "plants_update" on public.plants for update using (public.user_owns_garden(garden_id));
create policy "plants_delete" on public.plants for delete using (public.user_owns_garden(garden_id));

-- Log entries
create policy "logs_select" on public.log_entries for select using (public.user_owns_garden(garden_id));
create policy "logs_insert" on public.log_entries for insert with check (public.user_owns_garden(garden_id));
create policy "logs_update" on public.log_entries for update using (public.user_owns_garden(garden_id));
create policy "logs_delete" on public.log_entries for delete using (public.user_owns_garden(garden_id));

-- Growth entries
create policy "growth_select" on public.growth_entries for select using (public.user_owns_garden(garden_id));
create policy "growth_insert" on public.growth_entries for insert with check (public.user_owns_garden(garden_id));
create policy "growth_update" on public.growth_entries for update using (public.user_owns_garden(garden_id));
create policy "growth_delete" on public.growth_entries for delete using (public.user_owns_garden(garden_id));

-- Care events
create policy "care_select" on public.care_events for select using (public.user_owns_garden(garden_id));
create policy "care_insert" on public.care_events for insert with check (public.user_owns_garden(garden_id));

-- Soil readings
create policy "soil_select" on public.soil_readings for select using (public.user_owns_garden(garden_id));
create policy "soil_insert" on public.soil_readings for insert with check (public.user_owns_garden(garden_id));

-- Advice entries
create policy "advice_select" on public.advice_entries for select using (public.user_owns_garden(garden_id));
create policy "advice_insert" on public.advice_entries for insert with check (public.user_owns_garden(garden_id));
create policy "advice_update" on public.advice_entries for update using (public.user_owns_garden(garden_id));
create policy "advice_delete" on public.advice_entries for delete using (public.user_owns_garden(garden_id));

-- Weather cache
create policy "weather_select" on public.weather_cache for select using (public.user_owns_garden(garden_id));
create policy "weather_insert" on public.weather_cache for insert with check (public.user_owns_garden(garden_id));
create policy "weather_update" on public.weather_cache for update using (public.user_owns_garden(garden_id));

-- Spaces
create policy "spaces_select" on public.spaces for select using (public.user_owns_garden(garden_id));
create policy "spaces_insert" on public.spaces for insert with check (public.user_owns_garden(garden_id));
create policy "spaces_update" on public.spaces for update using (public.user_owns_garden(garden_id));
create policy "spaces_delete" on public.spaces for delete using (public.user_owns_garden(garden_id));

-- Conversations: users can only see their own conversations
create policy "conversations_select" on public.conversations for select using (profile_id = auth.uid());
create policy "conversations_insert" on public.conversations for insert with check (profile_id = auth.uid());
create policy "conversations_update" on public.conversations for update using (profile_id = auth.uid());

-- Messages: users can see messages in their own conversations
create policy "messages_select" on public.messages for select using (
  exists (select 1 from public.conversations where id = conversation_id and profile_id = auth.uid())
);
create policy "messages_insert" on public.messages for insert with check (
  exists (select 1 from public.conversations where id = conversation_id and profile_id = auth.uid())
);

-- Pending images: service role only (no user access needed, webhook uses admin client)
-- No policies = no access via anon key, only service_role bypasses RLS

-- ============================================
-- MISSING INDEXES (performance)
-- ============================================

create index if not exists idx_gardens_owner on public.gardens(owner_id);
create index if not exists idx_conversations_profile on public.conversations(profile_id);
create index if not exists idx_growth_garden on public.growth_entries(garden_id);

-- ============================================
-- RPC FUNCTIONS
-- These run in production and are used by the
-- WhatsApp webhook for atomic batch operations.
-- ============================================

/**
 * enqueue_pending_image
 * Atomically inserts a pending image into the batch queue.
 * Uses FOR UPDATE lock to check if this is the first image
 * in a batch for this phone number.
 * Returns TRUE if this is the first image (caller should send the ack).
 */
create or replace function public.enqueue_pending_image(
  p_phone text,
  p_profile_name text,
  p_message_id text,
  p_media_id text,
  p_mime_type text,
  p_caption text
)
returns boolean
language plpgsql
security definer
as $$
declare
  has_existing boolean;
begin
  -- Lock existing rows for this phone to prevent race conditions.
  -- Use PERFORM (discards result) to acquire FOR UPDATE locks without aggregation,
  -- which Postgres does not allow with FOR UPDATE.
  perform 1
  from public.pending_images
  where phone = p_phone
  for update;

  -- Check if any rows existed BEFORE our insert
  has_existing := found;

  -- Insert the new pending image
  insert into public.pending_images (phone, profile_name, whatsapp_message_id, media_id, mime_type, caption)
  values (p_phone, p_profile_name, p_message_id, p_media_id, p_mime_type, p_caption);

  -- Return true if this was the first image (no existing rows before insert)
  return not has_existing;
end;
$$;

/**
 * try_claim_image_batch
 * Atomically claims all pending images for a phone number.
 * Uses a Postgres advisory lock keyed on the phone number hash
 * to ensure only one invocation processes the batch.
 * Returns the batch rows if this caller wins, empty set otherwise.
 */
create or replace function public.try_claim_image_batch(
  user_phone text
)
returns setof public.pending_images
language plpgsql
security definer
as $$
declare
  lock_key bigint;
begin
  -- Generate a consistent lock key from the phone number
  lock_key := hashtext(user_phone);

  -- Try to acquire advisory lock (non-blocking)
  if not pg_try_advisory_xact_lock(lock_key) then
    -- Another invocation is already processing — return empty
    return;
  end if;

  -- We won the lock — return and delete all pending images for this phone
  return query
    delete from public.pending_images
    where phone = user_phone
    returning *;
end;
$$;

/**
 * try_reveal_journal
 * Atomically sets journal_revealed = true for a profile.
 * Returns TRUE only if the flag was previously false (first caller wins).
 * Prevents duplicate journal reveal messages.
 */
create or replace function public.try_reveal_journal(
  profile_phone text
)
returns boolean
language plpgsql
security definer
as $$
declare
  was_revealed boolean;
begin
  -- Lock the profile row and check current state
  select journal_revealed into was_revealed
  from public.profiles
  where phone = profile_phone
  for update;

  -- If not found or already revealed, return false
  if not found or was_revealed then
    return false;
  end if;

  -- Set the flag — first caller wins
  update public.profiles
  set journal_revealed = true
  where phone = profile_phone;

  return true;
end;
$$;

-- ============================================
-- ADMIN DASHBOARD MIGRATION
-- Run this after initial setup to add admin support
-- ============================================

-- Add is_admin column (run once)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set your own profile as admin (replace with your email):
-- UPDATE public.profiles SET is_admin = true WHERE email = 'your@email.com';
