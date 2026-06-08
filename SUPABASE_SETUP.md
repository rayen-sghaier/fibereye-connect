# Supabase Free Setup

Use Supabase to keep products, requests, settings, admin code, and uploaded product images saved even when Render free restarts.

## 1. Create Supabase project

1. Open `https://supabase.com`.
2. Create a free project.
3. Go to `Project Settings` -> `API`.
4. Copy:
   - `Project URL`
   - `secret` key, starting with `sb_secret_`

Keep the `secret` key private. It must only be added to Render environment variables.

## 2. Create database table

Open Supabase `SQL Editor`, paste this, then run it:

```sql
create table if not exists public.fibereye_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.fibereye_state enable row level security;
```

## 3. Create image bucket

In Supabase:

1. Open `Storage`.
2. Create a bucket named `fibereye-products`.
3. Make it public.

## 4. Add Render environment variables

In Render Web Service -> `Environment`, add:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
SUPABASE_STATE_TABLE=fibereye_state
SUPABASE_STATE_ID=main
SUPABASE_BUCKET=fibereye-products
```

Keep these existing values too:

```text
NODE_ENV=production
HOST=0.0.0.0
NODE_VERSION=22.12.0
DATA_DIR=/tmp/fibereye-data
COOKIE_SECURE=true
ADMIN_PASSWORD=your_admin_password
```

## 5. Redeploy

After saving environment variables, click `Manual Deploy` in Render.

Check:

```text
https://YOUR_RENDER_URL/api/health
```

It should show:

```json
{
  "storage": "supabase"
}
```

If it shows `local`, Render did not receive the Supabase variables.
