-- Users table: stores Spotify profile info
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Rooms: a shared session between two partners
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid references users(id) on delete cascade,
  partner_id uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_rooms_code on rooms(code);

-- Reviews: one per album per room
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  album_id text not null,
  album_name text not null,
  artist_name text not null,
  album_image text,
  started_at timestamptz default now(),
  completed boolean default false,
  unique(room_id, album_id)
);

-- Scores: per-track, per-user ratings
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references reviews(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  track_id text not null,
  track_name text not null,
  track_number int not null,
  catchiness int check (catchiness between 1 and 5),
  singability int check (singability between 1 and 5),
  lyrics int check (lyrics between 1 and 5),
  transition int check (transition between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(review_id, user_id, track_id)
);

-- Enable real-time for scores and rooms
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table reviews;

-- RLS policies
alter table users enable row level security;
alter table rooms enable row level security;
alter table reviews enable row level security;
alter table scores enable row level security;

-- For anon key usage: allow all operations (app handles auth via Spotify)
create policy "Allow all on users" on users for all using (true) with check (true);
create policy "Allow all on rooms" on rooms for all using (true) with check (true);
create policy "Allow all on reviews" on reviews for all using (true) with check (true);
create policy "Allow all on scores" on scores for all using (true) with check (true);
