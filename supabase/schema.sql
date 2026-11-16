-- Database setup for the private workspace (/drop, /view) and the public /gallery.
-- Run it in the Supabase SQL editor. It is safe to run again: every statement replaces
-- what it creates.
--
-- Rebuilt on 2026-11-14 from how the app uses the database, after the original file was lost.
-- Compare it with the live project (Database -> Policies) before running it there.
--
-- The owner is the GitHub account whose numeric user ID is in is_owner() below; change it
-- there to hand the workspace to another account.
-- After your first sign-in it is in: select provider_id from auth.identities where provider = 'github';

-- ---------------------------------------------------------------------------
-- Owner check
-- ---------------------------------------------------------------------------

-- True only for the one allowed GitHub account. It reads auth.identities, which users can't
-- edit, instead of user_metadata, which any signed-in user can change for their own account.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.identities
    where user_id = (select auth.uid())
      and provider = 'github'
      and provider_id = '228510197'
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Files table: one row per upload
-- ---------------------------------------------------------------------------

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path text not null unique,          -- storage key of the original, "<uuid>/<name>"
  name text not null,                 -- display name (original or random)
  mime text not null default 'application/octet-stream',
  size bigint not null check (size >= 0),
  thumb_path text,                    -- small copy for /view tiles, "<uuid>/_v/thumb.<ext>"
  preview_path text,                  -- resized copy for /gallery and /view/[id]
  width integer,
  height integer,
  in_gallery boolean not null default false,
  gallery_date date,
  gallery_comment text check (char_length(gallery_comment) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists files_created_at_idx on public.files (created_at desc);
create index if not exists files_gallery_idx on public.files (gallery_date desc nulls last, created_at desc)
  where in_gallery;

alter table public.files enable row level security;

drop policy if exists "owner manages files" on public.files;
create policy "owner manages files" on public.files
  for all to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()) and owner_id = (select auth.uid()));

-- Anyone may read the images and videos the owner published to /gallery, and nothing else.
drop policy if exists "public reads gallery images" on public.files;
create policy "public reads gallery images" on public.files
  for select to anon, authenticated
  using (in_gallery and (mime like 'image/%' or mime like 'video/%'));

-- ---------------------------------------------------------------------------
-- File bytes live in Cloudflare R2, not Supabase Storage (src/lib/r2.ts). R2 has no RLS: the
-- server only presigns keys taken from rows the files policies above let the caller read.
-- Left over from the old Supabase "drop" bucket, which nothing uses any more:
--   drop policy if exists "owner manages drop objects" on storage.objects;
--   drop policy if exists "public reads gallery objects" on storage.objects;
--   then empty and delete the bucket in the dashboard (Storage -> drop).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Tracks table: Spotify songs shown in /gallery on their own, next to the photos
-- ---------------------------------------------------------------------------

-- What the Spotify Web API returned when the link was added, so /gallery never calls Spotify.
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  spotify_id text not null check (spotify_id ~ '^[A-Za-z0-9]{22}$'),
  name text not null,
  artists text[] not null default '{}',
  album text not null,
  year text,
  cover text,                         -- album cover on Spotify's CDN, 640px
  duration_ms integer not null check (duration_ms >= 0),
  in_gallery boolean not null default false,
  gallery_date date,
  gallery_comment text check (char_length(gallery_comment) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists tracks_created_at_idx on public.tracks (created_at desc);
-- One row per song: the app checks before adding, and this catches two adds at once.
create unique index if not exists tracks_spotify_id_key on public.tracks (spotify_id);

alter table public.tracks enable row level security;

-- The API roles need table privileges before RLS is even checked; projects that don't expose
-- new tables automatically answer "permission denied for table tracks" without these.
grant select on public.tracks to anon, authenticated;
grant insert, update, delete on public.tracks to authenticated;

drop policy if exists "owner manages tracks" on public.tracks;
create policy "owner manages tracks" on public.tracks
  for all to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()) and owner_id = (select auth.uid()));

-- Anyone may read the songs the owner published to /gallery.
drop policy if exists "public reads gallery tracks" on public.tracks;
create policy "public reads gallery tracks" on public.tracks
  for select to anon, authenticated
  using (in_gallery);

-- ---------------------------------------------------------------------------
-- Shares table: links that make one file public for a while, without putting it in /gallery
-- ---------------------------------------------------------------------------

-- /s/<token> looks the token up and redirects to a short-lived R2 link to the file. The token
-- is made by the server (128 random bits); expires_at null means the link never expires.
-- Deleting the file deletes its links; revoking a link deletes its row.
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{22}$'),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shares_file_id_idx on public.shares (file_id);

alter table public.shares enable row level security;

grant select, insert, delete on public.shares to authenticated;

drop policy if exists "owner manages shares" on public.shares;
create policy "owner manages shares" on public.shares
  for all to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()) and owner_id = (select auth.uid()));

-- Visitors get no policy on shares or on unpublished files, so they can't list tokens or files.
-- This function answers for exactly one token: the file behind it, if the link is still valid.
create or replace function public.shared_file(share_token text)
returns table (path text, name text, mime text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select f.path, f.name, f.mime, s.expires_at
  from public.shares s
  join public.files f on f.id = s.file_id
  where s.token = share_token
    and (s.expires_at is null or s.expires_at > now());
$$;

revoke all on function public.shared_file(text) from public;
grant execute on function public.shared_file(text) to anon, authenticated;
