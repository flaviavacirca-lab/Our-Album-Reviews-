-- Drop old tables if they exist
drop table if exists reactions cascade;
drop table if exists disagrees cascade;
drop table if exists scores cascade;
drop table if exists reviews cascade;
drop table if exists rooms cascade;
drop table if exists users cascade;

-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Reviews: one per album
create table reviews (
  id uuid primary key default gen_random_uuid(),
  album_id text unique not null,
  album_name text not null,
  artist_name text not null,
  album_image text,
  started_at timestamptz default now()
);

-- Scores: 0.5 increments
create table scores (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references reviews(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  track_id text not null,
  track_name text not null,
  track_number int not null,
  catchiness numeric(2,1) check (catchiness between 1 and 5),
  singability numeric(2,1) check (singability between 1 and 5),
  lyrics numeric(2,1) check (lyrics between 1 and 5),
  transition numeric(2,1) check (transition between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(review_id, user_id, track_id)
);

-- Reactions: emoji per track
create table reactions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references reviews(id) on delete cascade not null,
  track_id text not null,
  user_id uuid references users(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(review_id, track_id, user_id)
);

-- Enable real-time
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table reviews;
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table reactions;

-- RLS
alter table users enable row level security;
alter table reviews enable row level security;
alter table scores enable row level security;
alter table reactions enable row level security;

create policy "Allow all on users" on users for all using (true) with check (true);
create policy "Allow all on reviews" on reviews for all using (true) with check (true);
create policy "Allow all on scores" on scores for all using (true) with check (true);
create policy "Allow all on reactions" on reactions for all using (true) with check (true);
