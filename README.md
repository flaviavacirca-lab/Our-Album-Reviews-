# Our Album Reviews

A full-stack album review app for couples. Rate albums together, track by track, and compare your scores in real-time.

**Stack:** React + Vite (frontend), Express.js (OAuth server), Supabase (real-time database), Spotify API

## Features

- **Spotify OAuth login** — Authorization Code flow
- **Album search** — search Spotify's catalog
- **Track-by-track scoring** — rate each song 1-5 on catchiness, singability, lyrics, and transition
- **Room codes** — generate a 6-character code to share with your partner
- **Real-time sync** — scores update live via Supabase Realtime
- **Score comparison** — side-by-side view with aggregate stats
- **Album history** — all past reviews stored and accessible
- **Mobile-first** — designed for phones, works great on desktop too

## Prerequisites

- Node.js 18+
- A Supabase project (run the schema below)
- A Spotify Developer app with the redirect URI configured

## Setup

### 1. Supabase Schema

Run the SQL in `supabase/schema.sql` against your Supabase project (via the SQL Editor in the Supabase dashboard).

### 2. Install Dependencies

```bash
npm run install:all
```

### 3. Environment Variables (optional — defaults are baked in for local dev)

**Server** (`server/.env`):
```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/callback
FRONTEND_URL=http://127.0.0.1:5173
```

**Frontend** (`frontend/.env`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Run Locally

```bash
npm run dev
```

This starts:
- **Frontend** at `http://127.0.0.1:5173`
- **OAuth server** at `http://127.0.0.1:8000`

### 5. Usage

1. Click "Login with Spotify"
2. Create a room → share the 6-character code with your partner
3. Search for an album and start scoring
4. Rate each track on 4 dimensions (1-5 stars)
5. See real-time progress as your partner scores
6. View the comparison when you're both done

## Project Structure

```
├── frontend/          React + Vite app
│   └── src/
│       ├── components/  Reusable UI (StarRating)
│       ├── hooks/       useAuth, useRealtime
│       ├── lib/         Spotify API, Supabase client, room logic
│       └── pages/       Login, Home, Room, Scoring, Comparison
├── server/            Express OAuth server
│   └── index.js       Token exchange + refresh
└── supabase/
    └── schema.sql     Database tables + RLS + realtime
```

## Deployment

- **Frontend:** Deploy to Vercel/Netlify. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars.
- **Server:** Deploy to Railway/Render/Fly.io. Set Spotify credentials and `FRONTEND_URL` env vars. Update the Spotify redirect URI.
- **Supabase:** Already cloud-hosted. Ensure RLS policies are in place.
